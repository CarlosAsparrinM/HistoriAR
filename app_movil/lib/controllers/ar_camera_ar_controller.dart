import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:app_movil/config/environment.dart';
import 'package:ar_flutter_plugin_plus/datatypes/node_types.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin_plus/models/ar_anchor.dart';
import 'package:ar_flutter_plugin_plus/models/ar_hittest_result.dart';
import 'package:ar_flutter_plugin_plus/models/ar_node.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import '../utils/http_interceptor.dart' as http;
import 'package:vector_math/vector_math_64.dart' as vmath;

import '../models/monument.dart';

class ArCameraArController {
  ArCameraArController({
    required VoidCallback onChanged,
    required void Function(String message) onShowMessage,
  }) : _onChanged = onChanged,
       _onShowMessage = onShowMessage;

  final VoidCallback _onChanged;
  final void Function(String message) _onShowMessage;

  final GlobalKey repaintKey = GlobalKey();

  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;
  ARAnchor? currentAnchor;
  ARNode? webObjectNode;

  Monument? _monument;
  String? _token;

  double scaleFactor = 0.2;
  double rotationY = 0.0;
  double rotationX = 0.0;
  double baseScale = 0.2;
  double baseRotationY = 0.0;
  double baseRotationX = 0.0;
  Offset baseFocalPoint = Offset.zero;
  vmath.Vector2 offset = vmath.Vector2(0.0, -0.3);
  vmath.Vector2 baseOffset = vmath.Vector2(0.0, 0.0);

  bool isLoadingModel = false;
  String? loadError;
  bool isTrackingActive = false;
  bool isPlanDetected = false;
  double ambientLightIntensity = 0.5;
  int retryCount = 0;
  static const int maxRetries = 3;
  int frameCounter = 0;
  bool isAddingNode = false;

  void dispose() {
    arSessionManager?.dispose();
  }

  void onARViewCreated({
    required Monument monument,
    required String token,
    required ARSessionManager arSessionManager,
    required ARObjectManager arObjectManager,
    required ARAnchorManager arAnchorManager,
    required ARLocationManager arLocationManager,
  }) {
    _monument = monument;
    _token = token;
    this.arSessionManager = arSessionManager;
    this.arObjectManager = arObjectManager;
    this.arAnchorManager = arAnchorManager;

    this.arSessionManager!.onInitialize(
      showFeaturePoints: false,
      showPlanes: false,
      customPlaneTexturePath: 'Images/triangle.png',
      showWorldOrigin: false,
      handleTaps: true,
    );
    this.arObjectManager!.onInitialize();
    this.arSessionManager!.onPlaneOrPointTap = _handlePlaneOrPointTap;

    unawaited(_addWebObjectForMonument());
  }

  void updateARMetrics() {
    isTrackingActive = arSessionManager != null;
    isPlanDetected = webObjectNode != null;
    ambientLightIntensity = (0.3 + 0.7 * ((frameCounter % 100) / 100)).clamp(
      0.0,
      1.0,
    );
    frameCounter++;
    _onChanged();
  }

  void handleScaleStart(ScaleStartDetails details) {
    baseScale = scaleFactor;
    baseRotationX = rotationX;
    baseRotationY = rotationY;
    baseOffset = offset;
    baseFocalPoint = details.focalPoint;
  }

  void handleScaleUpdate(ScaleUpdateDetails details) {
    if (webObjectNode == null) return;

    final bool isSingleFingerPan =
        (details.scale - 1.0).abs() < 0.02 && details.rotation.abs() < 0.02;

    if (isSingleFingerPan) {
      final double deltaX = (details.focalPoint.dx - baseFocalPoint.dx) / 150;
      final double deltaY = (details.focalPoint.dy - baseFocalPoint.dy) / 300;

      rotationY = baseRotationY + deltaX;
      rotationX = (baseRotationX - deltaY).clamp(-1.4, 1.4);
    } else {
      final newScale = baseScale * details.scale;
      scaleFactor = newScale.clamp(0.1, 0.8);
      rotationX = baseRotationX;
      rotationY = baseRotationY + details.rotation;
      offset = vmath.Vector2(
        (baseOffset.x + details.focalPointDelta.dx / 300).clamp(-1.0, 1.0),
        (baseOffset.y - details.focalPointDelta.dy / 300).clamp(-1.0, 1.0),
      );
    }

    _updateNodeTransform();
    _onChanged();
  }

  Future<void> resetModelPosition() async {
    scaleFactor = 0.2;
    rotationX = 0.0;
    rotationY = 0.0;
    offset = vmath.Vector2(0.0, -0.3);
    _updateNodeTransform();
    _onChanged();
  }

  Future<void> captureScreenshot() async {
    try {
      final boundary =
          repaintKey.currentContext?.findRenderObject()
              as RenderRepaintBoundary?;
      if (boundary == null) {
        _onShowMessage('No se pudo capturar (render boundary no disponible)');
        return;
      }

      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        _onShowMessage('Error al procesar la imagen');
        return;
      }

      final bytes = byteData.buffer.asUint8List();
      final tempDir = Directory.systemTemp;
      final file = await File(
        '${tempDir.path}/historiar_screenshot_${DateTime.now().millisecondsSinceEpoch}.png',
      ).writeAsBytes(bytes);

      _onShowMessage('Screenshot guardado: ${file.path}');
    } catch (e) {
      _onShowMessage('Error al capturar screenshot: $e');
    }
  }

  Future<void> _addWebObjectForMonument() async {
    final monument = _monument;
    final token = _token;
    if (monument == null || token == null) {
      return;
    }

    final url = await _resolveModelUrl(monument, token);
    if (url == null || url.isEmpty) {
      loadError = 'No se encontró modelo 3D para este monumento.';
      _onChanged();
      _scheduleErrorDismissal();
      return;
    }

    isLoadingModel = true;
    loadError = null;
    retryCount = 0;
    _onChanged();

    if (webObjectNode != null) {
      await arObjectManager?.removeNode(webObjectNode!);
      webObjectNode = null;
      if (currentAnchor != null) {
        try {
          await arAnchorManager?.removeAnchor(currentAnchor!);
        } catch (_) {}
        currentAnchor = null;
      }
    }

    final transform = vmath.Matrix4.identity()
      ..setTranslationRaw(0.0, -0.4, -0.8)
      ..rotateX(rotationX)
      ..rotateY(rotationY)
      ..scaleByDouble(scaleFactor, scaleFactor, scaleFactor, 1.0);

    final newNode = ARNode(
      type: NodeType.webGLB,
      uri: url,
      transformation: transform,
    );

    try {
      final didAdd = await arObjectManager?.addNode(newNode);
      if (didAdd == true) {
        webObjectNode = newNode;
        isPlanDetected = true;
        _onShowMessage('Modelo cargado correctamente');
      } else {
        _handleLoadError('No se pudo cargar el modelo 3D.');
      }
    } catch (e) {
      _handleLoadError('Error al cargar el modelo: $e');
    } finally {
      isLoadingModel = false;
      _onChanged();
    }
  }

  void _handleLoadError(String message) {
    loadError = message;
    _onChanged();

    if (retryCount < maxRetries) {
      Future.delayed(const Duration(seconds: 3), () {
        retryCount++;
        unawaited(_addWebObjectForMonument());
      });
    } else {
      _scheduleErrorDismissal();
    }
  }

  void _scheduleErrorDismissal() {
    Future.delayed(const Duration(seconds: 5), () {
      if (loadError == null) return;
      loadError = null;
      _onChanged();
    });
  }

  Future<String?> _resolveModelUrl(Monument monument, String token) async {
    final directUrl = monument.model3DUrl;
    if (directUrl != null && directUrl.isNotEmpty) {
      return directUrl;
    }

    final key = monument.s3ModelKey;
    if (key == null || key.isEmpty) {
      return null;
    }

    final uri = Uri.parse(
      '${Environment.apiBaseUrl}/api/uploads/signed-get?key=${Uri.encodeComponent(key)}&expiresIn=3600',
    );
    final response = await http.get(
      uri,
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode != 200) {
      return null;
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['url'] as String?;
  }

  void _updateNodeTransform() {
    if (webObjectNode == null) return;

    final transform = vmath.Matrix4.identity()
      ..setTranslationRaw(offset.x, offset.y, -0.8)
      ..rotateX(rotationX)
      ..rotateY(rotationY)
      ..scaleByDouble(scaleFactor, scaleFactor, scaleFactor, 1.0);

    webObjectNode!.transform = transform;
    _onChanged();
  }

  Future<void> _handlePlaneOrPointTap(List<ARHitTestResult> hits) async {
    if (hits.isEmpty) return;
    if (isAddingNode) return;
    isAddingNode = true;

    try {
      final hit = hits.first;

      if (webObjectNode != null) {
        try {
          await arObjectManager?.removeNode(webObjectNode!);
        } catch (_) {}
        webObjectNode = null;
      }

      if (currentAnchor != null) {
        try {
          await arAnchorManager?.removeAnchor(currentAnchor!);
        } catch (_) {}
        currentAnchor = null;
      }

      final monument = _monument;
      final token = _token;
      if (monument == null || token == null) {
        _onShowMessage('No se pudo obtener el modelo');
        return;
      }

      final url = await _resolveModelUrl(monument, token);
      if (url == null || url.isEmpty) {
        _onShowMessage('No se pudo obtener el modelo');
        return;
      }

      final planeAnchor = ARPlaneAnchor(transformation: hit.worldTransform);
      final addedToAnchor = await arAnchorManager?.addAnchor(planeAnchor);
      if (addedToAnchor != true) {
        _onShowMessage('Error al posicionar el modelo');
        return;
      }

      currentAnchor = planeAnchor;

      final transform = vmath.Matrix4.identity()
        ..rotateX(rotationX)
        ..rotateY(rotationY)
        ..scaleByDouble(scaleFactor, scaleFactor, scaleFactor, 1.0);

      final newNode = ARNode(
        type: NodeType.webGLB,
        uri: url,
        transformation: transform,
      );

      final didAdd = await arObjectManager?.addNode(
        newNode,
        planeAnchor: planeAnchor,
      );

      if (didAdd == true) {
        webObjectNode = newNode;
        _onChanged();
        _onShowMessage('Modelo reposicionado');
      } else {
        _onShowMessage('Error al cargar el modelo en la nueva posición');
      }
    } catch (e) {
      _onShowMessage('Error al mover el modelo');
    } finally {
      isAddingNode = false;
    }
  }
}
