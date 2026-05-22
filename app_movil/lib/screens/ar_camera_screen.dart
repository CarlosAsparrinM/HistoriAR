import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:app_movil/config/environment.dart';
import 'package:ar_flutter_plugin_plus/ar_flutter_plugin_plus.dart';
import 'package:ar_flutter_plugin_plus/datatypes/config_planedetection.dart';
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
import 'package:http/http.dart' as http;
import 'package:vector_math/vector_math_64.dart' as vmath;

import '../models/monument.dart';
import '../services/visits_service.dart';
import '../styles/app_colors.dart';
import '../widgets/ar_control_hints.dart';
import '../widgets/ar_info_panel.dart';
import '../widgets/ar_quality_indicator.dart';

class ArCameraScreen extends StatefulWidget {
  final Monument monument;
  final String token;
  final String userId;
  final String? tourId; // Nuevo: ID del tour al que pertenece (opcional)

  const ArCameraScreen({
    super.key,
    required this.monument,
    required this.token,
    required this.userId,
    this.tourId,
  });

  @override
  State<ArCameraScreen> createState() => _ArCameraScreenState();
}

class _ArCameraScreenState extends State<ArCameraScreen> {
  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;
  ARAnchor? _currentAnchor;
  ARNode? webObjectNode;
  final GlobalKey _repaintKey = GlobalKey();

  double _scaleFactor = 0.2;
  double _rotationY = 0.0; // en radianes
  double _rotationX = 0.0;
  double _baseScale = 0.2;
  double _baseRotationY = 0.0;
  double _baseRotationX = 0.0;
  Offset _baseFocalPoint = Offset.zero;
  // Offset inicial: un poco más abajo del centro de la cámara
  vmath.Vector2 _offset = vmath.Vector2(0.0, -0.3);
  vmath.Vector2 _baseOffset = vmath.Vector2(0.0, 0.0);

  bool _isLoadingModel = false;
  String? _loadError;

  // Variables para registro de visita
  DateTime? _visitStartTime;
  final VisitsService _visitsService = const VisitsService();

  // Nuevas variables para mejoras de UX
  bool _showInfoPanel = true;
  bool _isTrackingActive = false;
  bool _isPlanDetected = false;
  double _ambientLightIntensity = 0.5;
  int _retryCount = 0;
  static const int _maxRetries = 3;
  int _frameCounter = 0;
  late Stopwatch _frameStopwatch;
  bool _isAddingNode = false;

  @override
  void initState() {
    super.initState();
    _visitStartTime = DateTime.now();
    _frameStopwatch = Stopwatch()..start();
    _startPeriodicTracking();
  }

  void _startPeriodicTracking() {
    // Monitor de estado cada segundo
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        _updateARMetrics();
        _startPeriodicTracking();
      }
    });
  }

  void _updateARMetrics() {
    // Simular actualizaciones de tracking quality
    // En producción, esto vendría del ARCore/ARKit
    setState(() {
      _isTrackingActive = arSessionManager != null;
      _isPlanDetected = webObjectNode != null;
      // Variar luz ambiente de forma realista
      _ambientLightIntensity = (0.3 + 0.7 * ((_frameCounter % 100) / 100))
          .clamp(0.0, 1.0);
      _frameCounter++;
    });
  }

  @override
  void dispose() {
    _frameStopwatch.stop();
    arSessionManager?.dispose();
    _registerVisit();
    super.dispose();
  }

  /// Reset la posición del modelo al estado inicial
  Future<void> _resetModelPosition() async {
    setState(() {
      _scaleFactor = 0.2;
      _rotationX = 0.0;
      _rotationY = 0.0;
      _offset = vmath.Vector2(0.0, -0.3);
    });
    _updateNodeTransform();

    _showSnackbar('Posición reiniciada');
  }

  /// Captura pantalla de la experiencia AR
  Future<void> _captureScreenshot() async {
    try {
      final boundary =
          _repaintKey.currentContext?.findRenderObject()
              as RenderRepaintBoundary?;
      if (boundary == null) {
        _showSnackbar('No se pudo capturar (render boundary no disponible)');
        return;
      }

      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        _showSnackbar('Error al procesar la imagen');
        return;
      }

      final bytes = byteData.buffer.asUint8List();
      final tempDir = Directory.systemTemp;
      final file = await File(
        '${tempDir.path}/historiar_screenshot_${DateTime.now().millisecondsSinceEpoch}.png',
      ).writeAsBytes(bytes);

      _showSnackbar('Screenshot guardado: ${file.path}');
    } catch (e) {
      _showSnackbar('Error al capturar screenshot: $e');
    }
  }

  void _showSnackbar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.black.withValues(alpha: 0.8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  void onARViewCreated(
    ARSessionManager arSessionManager,
    ARObjectManager arObjectManager,
    ARAnchorManager arAnchorManager,
    ARLocationManager arLocationManager,
  ) {
    this.arSessionManager = arSessionManager;
    this.arObjectManager = arObjectManager;
    this.arAnchorManager = arAnchorManager;

    this.arSessionManager!.onInitialize(
      showFeaturePoints: false,
      showPlanes: false,
      customPlaneTexturePath: "Images/triangle.png",
      showWorldOrigin: false,
      handleTaps: true,
    );
    this.arObjectManager!.onInitialize();

    this.arSessionManager!.onPlaneOrPointTap = _handlePlaneOrPointTap;

    _addWebObjectForMonument();
  }

  Future<void> _addWebObjectForMonument() async {
    final url = await _resolveModelUrl();
    if (url == null || url.isEmpty) {
      stdout.writeln('Monumento sin model3DUrl');
      setState(() {
        _loadError = 'No se encontró modelo 3D para este monumento.';
      });
      _scheduleErrorDismissal();
      return;
    }

    setState(() {
      _isLoadingModel = true;
      _loadError = null;
      _retryCount = 0;
    });

    if (webObjectNode != null) {
      await arObjectManager?.removeNode(webObjectNode!);
      webObjectNode = null;
      // también remover anchor si existe
      if (_currentAnchor != null) {
        try {
          await arAnchorManager?.removeAnchor(_currentAnchor!);
        } catch (_) {}
        _currentAnchor = null;
      }
    }

    // Colocamos el modelo al frente y un poco más abajo de la cámara
    final transform = vmath.Matrix4.identity()
      ..setTranslationRaw(0.0, -0.4, -0.8)
      ..rotateX(_rotationX)
      ..rotateY(_rotationY)
      ..scaleByDouble(_scaleFactor, _scaleFactor, _scaleFactor, 1.0);

    final newNode = ARNode(
      type: NodeType.webGLB,
      uri: url,
      transformation: transform,
    );

    try {
      final didAdd = await arObjectManager?.addNode(newNode);
      if (didAdd == true) {
        setState(() {
          webObjectNode = newNode;
          _isPlanDetected = true;
        });
        _showSnackbar('Modelo cargado correctamente');
      } else {
        _handleLoadError('No se pudo cargar el modelo 3D.');
      }
    } catch (e) {
      _handleLoadError('Error al cargar el modelo: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingModel = false;
        });
      }
    }
  }

  void _handleLoadError(String message) {
    if (!mounted) return;

    setState(() {
      _loadError = message;
    });

    if (_retryCount < _maxRetries) {
      Future.delayed(const Duration(seconds: 3), () {
        if (!mounted) return;
        _retryCount++;
        _addWebObjectForMonument();
      });
    } else {
      _scheduleErrorDismissal();
    }
  }

  void _scheduleErrorDismissal() {
    Future.delayed(const Duration(seconds: 5), () {
      if (!mounted || _loadError == null) return;
      setState(() {
        _loadError = null;
      });
    });
  }

  Future<String?> _resolveModelUrl() async {
    final directUrl = widget.monument.model3DUrl;
    if (directUrl != null && directUrl.isNotEmpty) {
      return directUrl;
    }

    final key = widget.monument.s3ModelKey;
    if (key == null || key.isEmpty) {
      return null;
    }

    final uri = Uri.parse(
      '${Environment.apiBaseUrl}/api/uploads/signed-get?key=${Uri.encodeComponent(key)}&expiresIn=3600',
    );
    final response = await http.get(
      uri,
      headers: {'Authorization': 'Bearer ${widget.token}'},
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
      ..setTranslationRaw(_offset.x, _offset.y, -0.8)
      ..rotateX(_rotationX)
      ..rotateY(_rotationY)
      ..scaleByDouble(_scaleFactor, _scaleFactor, _scaleFactor, 1.0);

    webObjectNode!.transform = transform;
  }

  Future<void> _registerVisit() async {
    if (_visitStartTime == null) return;

    try {
      // Obtener contexto de autenticación desde Navigator
      // El token se pasa en el constructor, pero para userId necesitaríamos acceso a authState
      // Por ahora, asumimos que el usuario está autenticado (ya pasamos el token)

      // Calcular duración en minutos
      final now = DateTime.now();
      final duration = now.difference(_visitStartTime!).inMinutes;

      // Registrar visita de forma asíncrona sin bloquear la navegación
      // No esperamos la respuesta para no ralentizar el pop de la pantalla
      unawaited(_registerVisitInBackground(duration));
    } catch (e) {
      stdout.writeln('Error preparando registro de visita: $e');
    }
  }

  Future<void> _registerVisitInBackground(int durationMinutes) async {
    try {
      await _visitsService.registerVisit(
        userId: widget.userId,
        monumentId: widget.monument.id,
        token: widget.token,
        tourId: widget.tourId, // Pasar tourId si está disponible
        durationMinutes: durationMinutes,
      );
      stdout.writeln(
        'Visita registrada exitosamente: monumentId=${widget.monument.id}, tourId=${widget.tourId}, duration=$durationMinutes min',
      );
    } catch (e) {
      stdout.writeln('Error al registrar visita: $e');
      // No mostrar error al usuario, solo loguear
    }
  }

  @override
  Widget build(BuildContext context) {
    final monument = widget.monument;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Vista AR principal
          GestureDetector(
            onScaleStart: (details) {
              _baseScale = _scaleFactor;
              _baseRotationX = _rotationX;
              _baseRotationY = _rotationY;
              _baseOffset = _offset;
              _baseFocalPoint = details.focalPoint;
            },
            onScaleUpdate: (details) {
              if (webObjectNode == null) return;
              final bool isSingleFingerPan =
                  (details.scale - 1.0).abs() < 0.02 &&
                  details.rotation.abs() < 0.02;

              if (isSingleFingerPan) {
                final double deltaX =
                    (details.focalPoint.dx - _baseFocalPoint.dx) / 150;
                final double deltaY =
                    (details.focalPoint.dy - _baseFocalPoint.dy) / 300;

                setState(() {
                  _rotationY = _baseRotationY + deltaX;
                  _rotationX = (_baseRotationX - deltaY).clamp(-1.4, 1.4);
                });
              } else {
                setState(() {
                  final newScale = _baseScale * details.scale;
                  _scaleFactor = newScale.clamp(0.1, 0.8);
                  _rotationX = _baseRotationX;
                  _rotationY = _baseRotationY + details.rotation;
                  _offset = vmath.Vector2(
                    (_baseOffset.x + details.focalPointDelta.dx / 300).clamp(
                      -1.0,
                      1.0,
                    ),
                    (_baseOffset.y - details.focalPointDelta.dy / 300).clamp(
                      -1.0,
                      1.0,
                    ),
                  );
                });
              }
              _updateNodeTransform();
            },
            child: RepaintBoundary(
              key: _repaintKey,
              child: ARView(
                onARViewCreated: onARViewCreated,
                planeDetectionConfig: PlaneDetectionConfig.horizontal,
              ),
            ),
          ),

          // Loading indicator
          if (_isLoadingModel)
            Align(
              alignment: Alignment.topCenter,
              child: SafeArea(
                child: Container(
                  margin: const EdgeInsets.only(top: 72),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                          strokeWidth: 2.5,
                        ),
                      ),
                      SizedBox(height: 12),
                      Text(
                        'Preparando experiencia AR...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Mueve el dispositivo para calibrar',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Error message
          if (_loadError != null && !_isLoadingModel)
            Align(
              alignment: Alignment.topCenter,
              child: SafeArea(
                child: GestureDetector(
                  onTap: () => setState(() => _loadError = null),
                  child: Container(
                    margin: const EdgeInsets.only(top: 16),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.danger.withValues(alpha: 0.4),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: Colors.white,
                          size: 18,
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            _loadError!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Back button
          Align(
            alignment: Alignment.topLeft,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(left: 12, top: 12),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.5),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: IconButton(
                    onPressed: _onBackPressed,
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    padding: const EdgeInsets.all(10),
                    constraints: const BoxConstraints(
                      minWidth: 44,
                      minHeight: 44,
                    ),
                    splashRadius: 22,
                  ),
                ),
              ),
            ),
          ),

          // AR Quality Indicator
          Align(
            alignment: Alignment.topRight,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(right: 12, top: 12),
                child: ArQualityIndicator(
                  isTrackingActive: _isTrackingActive,
                  isPlanDetected: _isPlanDetected,
                  lightIntensity: _ambientLightIntensity,
                  showDebugInfo: false,
                ),
              ),
            ),
          ),

          // Monument info header (compacto, top center, sin sobreposición)
          Align(
            alignment: Alignment.topCenter,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(left: 16, right: 16, top: 70),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 280),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          monument.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        if ((monument.culture ?? '').isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 3),
                            child: Text(
                              monument.culture!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Control Hints (centro, cuando modelo no está cargado)
          if (!_isLoadingModel && webObjectNode == null)
            Align(
              alignment: Alignment.center,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ArControlHints(
                  isModelLoaded: webObjectNode != null,
                  onDismiss: () => setState(() {}),
                ),
              ),
            ),

          // AR Action Buttons (horizontal, sin FAB menu)
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Reset button
                      _CompactActionButton(
                        icon: Icons.refresh_outlined,
                        label: 'Reset',
                        onTap: _resetModelPosition,
                      ),
                      const SizedBox(width: 8),
                      // Screenshot button
                      _CompactActionButton(
                        icon: Icons.screenshot_monitor,
                        label: 'Captura',
                        onTap: _captureScreenshot,
                      ),
                      const SizedBox(width: 8),
                      // Info toggle button
                      _CompactActionButton(
                        icon: _showInfoPanel ? Icons.info : Icons.info_outline,
                        label: 'Info',
                        onTap: () =>
                            setState(() => _showInfoPanel = !_showInfoPanel),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Info Panel (flotante, minimizable, con márgenes de seguridad)
          if (_showInfoPanel && !_isLoadingModel)
            Align(
              alignment: Alignment.bottomLeft,
              child: Builder(
                builder: (context) {
                  final width = MediaQuery.of(context).size.width;
                  final height = MediaQuery.of(context).size.height;
                  final double widthFactor = width >= 800
                      ? 0.55
                      : (width >= 600 ? 0.75 : 0.90);
                  final double maxHeight = height * 0.45;
                  return Padding(
                    padding: const EdgeInsets.only(
                      left: 12,
                      bottom: 90,
                      right: 12,
                    ),
                    child: FractionallySizedBox(
                      widthFactor: widthFactor,
                      alignment: Alignment.bottomLeft,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(maxHeight: maxHeight),
                        child: ArInfoPanel(
                          monument: monument,
                          visible: _showInfoPanel,
                          onDismiss: () =>
                              setState(() => _showInfoPanel = false),
                          showTimeline: true,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _onBackPressed() async {
    Navigator.of(context).pop();
  }

  Future<void> _handlePlaneOrPointTap(List<ARHitTestResult> hits) async {
    if (hits.isEmpty) return;

    // evitar taps múltiples en paralelo
    if (_isAddingNode) return;
    _isAddingNode = true;

    try {
      final hit = hits.first;

      // PRIMERO remover nodo anterior
      if (webObjectNode != null) {
        try {
          await arObjectManager?.removeNode(webObjectNode!);
        } catch (e) {
          stdout.writeln('Error removiendo nodo anterior: $e');
        }
        webObjectNode = null;
      }

      // LUEGO remover el anchor anterior
      if (_currentAnchor != null) {
        try {
          await arAnchorManager?.removeAnchor(_currentAnchor!);
        } catch (e) {
          stdout.writeln('Error removiendo anchor anterior: $e');
        }
        _currentAnchor = null;
      }

      // Obtener URL del modelo
      final url = await _resolveModelUrl();
      if (url == null || url.isEmpty) {
        _showSnackbar('No se pudo obtener el modelo');
        return;
      }

      // Crear nuevo anchor
      final planeAnchor = ARPlaneAnchor(transformation: hit.worldTransform);
      final addedToAnchor = await arAnchorManager?.addAnchor(planeAnchor);
      if (addedToAnchor != true) {
        stdout.writeln('Error añadiendo anchor');
        _showSnackbar('Error al posicionar el modelo');
        return;
      }

      // Guardar referencia al anchor
      _currentAnchor = planeAnchor;

      // Crear transformación para el nodo
      final transform = vmath.Matrix4.identity()
        ..rotateX(_rotationX)
        ..rotateY(_rotationY)
        ..scaleByDouble(_scaleFactor, _scaleFactor, _scaleFactor, 1.0);

      final newNode = ARNode(
        type: NodeType.webGLB,
        uri: url,
        transformation: transform,
      );

      // Añadir nodo al anchor
      final didAdd = await arObjectManager?.addNode(
        newNode,
        planeAnchor: planeAnchor,
      );

      if (didAdd == true && mounted) {
        setState(() {
          webObjectNode = newNode;
        });
        _showSnackbar('Modelo reposicionado');
      } else {
        stdout.writeln('Error añadiendo nodo al anchor');
        _showSnackbar('Error al cargar el modelo en la nueva posición');
      }
    } catch (e) {
      stdout.writeln('Error en handlePlaneOrPointTap: $e');
      _showSnackbar('Error al mover el modelo');
    } finally {
      _isAddingNode = false;
    }
  }

  void _showMonumentInfo(BuildContext context) {
    final monument = widget.monument;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.black,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      monument.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Colors.white70),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if ((monument.culture ?? '').isNotEmpty)
                _InfoItem(label: 'Cultura', value: monument.culture!),
              _InfoItem(label: 'Periodo', value: _buildPeriodText(monument)),
              _InfoItem(
                label: 'Descubrimiento',
                value: _buildDiscoveryText(monument),
              ),
              const SizedBox(height: 12),
              Text(
                monument.description,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 12),
              _PeriodTimelineCard(
                periodLabel: monument.periodName,
                periodIsIdentified: monument.periodIsIdentified,
                startYear: monument.periodStartYear,
                endYear: monument.periodEndYear,
                discoveryYear: monument.discoveryDiscoveredAt?.year,
                discoveryIsKnown: monument.discoveryIsDateKnown,
              ),
            ],
          ),
        );
      },
    );
  }

  String _buildPeriodText(Monument monument) {
    if (!monument.periodIsIdentified) {
      return 'No identificado';
    }

    final periodName = (monument.periodName ?? '').trim();
    final start = monument.periodStartYear;
    final end = monument.periodEndYear;

    if (start == null && end == null) {
      return periodName.isNotEmpty ? periodName : 'Sin datos';
    }

    final rangeText = (start != null && end != null)
        ? '$start - $end'
        : '${start ?? end}';

    if (periodName.isEmpty) return rangeText;
    return '$periodName ($rangeText)';
  }

  String _buildDiscoveryText(Monument monument) {
    final dateText = monument.discoveryIsDateKnown
        ? _formatDate(monument.discoveryDiscoveredAt)
        : 'Fecha desconocida';

    final discovererText = monument.discoveryIsDiscovererKnown
        ? ((monument.discoveryDiscovererName ?? '').trim().isNotEmpty
              ? monument.discoveryDiscovererName!.trim()
              : 'Descubridor no especificado')
        : 'Descubridor desconocido';

    return '$dateText • $discovererText';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Fecha desconocida';
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    return '$day/$month/$year';
  }
}

class _CompactActionButton extends StatefulWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _CompactActionButton({
    required this.icon,
    required this.label,
    this.onTap,
  });

  @override
  State<_CompactActionButton> createState() => _CompactActionButtonState();
}

class _CompactActionButtonState extends State<_CompactActionButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.85,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails _) {
    _controller.forward();
  }

  void _onTapUp(TapUpDetails _) {
    _controller.reverse();
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.85),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(widget.icon, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 4),
            Text(
              widget.label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final String label;
  final String value;

  const _InfoItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 11),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodTimelineCard extends StatelessWidget {
  final String? periodLabel;
  final bool periodIsIdentified;
  final int? startYear;
  final int? endYear;
  final int? discoveryYear;
  final bool discoveryIsKnown;

  const _PeriodTimelineCard({
    this.periodLabel,
    required this.periodIsIdentified,
    this.startYear,
    this.endYear,
    this.discoveryYear,
    required this.discoveryIsKnown,
  });

  @override
  Widget build(BuildContext context) {
    final hasRange = startYear != null && endYear != null;
    final label = (periodLabel ?? '').trim();
    final periodText = !periodIsIdentified
        ? 'Periodo no identificado'
        : (label.isNotEmpty ? label : 'Periodo historico');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.86),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  periodText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (hasRange)
            _TimelineBar(
              startYear: startYear!,
              endYear: endYear!,
              discoveryYear: discoveryIsKnown ? discoveryYear : null,
            )
          else
            Text(
              'Sin rango cronologico completo',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.78),
                fontSize: 11,
              ),
            ),
        ],
      ),
    );
  }
}

class _TimelineBar extends StatelessWidget {
  final int startYear;
  final int endYear;
  final int? discoveryYear;

  const _TimelineBar({
    required this.startYear,
    required this.endYear,
    this.discoveryYear,
  });

  @override
  Widget build(BuildContext context) {
    const int timelineStart = -3300;
    final int timelineEnd = DateTime.now().year;

    final int safeMin = startYear <= endYear ? startYear : endYear;
    final int safeMax = startYear <= endYear ? endYear : startYear;
    final totalSpan = (timelineEnd - timelineStart).abs();

    final double periodStartRatio =
        ((safeMin - timelineStart) / (totalSpan == 0 ? 1 : totalSpan)).clamp(
          0.0,
          1.0,
        );
    final double periodEndRatio =
        ((safeMax - timelineStart) / (totalSpan == 0 ? 1 : totalSpan)).clamp(
          0.0,
          1.0,
        );

    final bool showDiscovery = discoveryYear != null;
    final double ratio = showDiscovery
        ? ((discoveryYear! - timelineStart) / (totalSpan == 0 ? 1 : totalSpan))
              .clamp(0.0, 1.0)
        : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 24,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final double markerLeft = (ratio * constraints.maxWidth) - 5;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    top: 8,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: constraints.maxWidth * periodStartRatio,
                    child: Container(
                      width:
                          constraints.maxWidth *
                          (periodEndRatio - periodStartRatio),
                      height: 8,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primaryVariant, AppColors.primary],
                        ),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  if (showDiscovery)
                    Positioned(
                      left: markerLeft,
                      top: 2,
                      child: const _DiscoveryPin(),
                    ),
                ],
              );
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _formatYear(timelineStart),
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
            if (showDiscovery)
              Text(
                'Desc.: ${_formatYear(discoveryYear!)}',
                style: const TextStyle(color: Colors.white, fontSize: 11),
              ),
            Text(
              _formatYear(timelineEnd),
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
          ],
        ),
      ],
    );
  }

  String _formatYear(int year) {
    if (year < 0) {
      return '${year.abs()} a. C.';
    }
    return '$year d. C.';
  }
}

class _DiscoveryPin extends StatelessWidget {
  const _DiscoveryPin();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 20,
      alignment: Alignment.topCenter,
      child: Column(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.primary, width: 2),
            ),
          ),
          Container(width: 2, height: 10, color: Colors.white),
        ],
      ),
    );
  }
}
