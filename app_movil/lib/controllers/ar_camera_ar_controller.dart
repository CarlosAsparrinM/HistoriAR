import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:app_movil/config/environment.dart';
import 'package:ar_flutter_plugin_plus/datatypes/hittest_result_types.dart';
import 'package:ar_flutter_plugin_plus/datatypes/node_types.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin_plus/models/ar_anchor.dart';
import 'package:ar_flutter_plugin_plus/models/ar_hittest_result.dart';
import 'package:ar_flutter_plugin_plus/models/ar_node.dart';
import 'package:flutter/material.dart';
import 'package:vector_math/vector_math_64.dart' as vmath;

import '../models/historical_data.dart';
import '../models/monument.dart';
import '../utils/ar_historical_card_model_factory.dart';
import '../utils/http_interceptor.dart' as http;
import '../utils/model_cache_manager.dart';

class ArRetryLimiter {
  ArRetryLimiter({this.maxRetries = 3});

  final int maxRetries;
  int attempts = 0;

  bool registerFailure() {
    if (attempts >= maxRetries) return false;
    attempts++;
    return true;
  }

  void reset() {
    attempts = 0;
  }
}

class ArCameraArController {
  ArCameraArController({
    required VoidCallback onChanged,
    required void Function(String message) onShowMessage,
    this.onHistoricalCardTap,
    this.onArUnsupported,
    this.onArSceneFailed,
    ArHistoricalCardModelFactory? historicalCardModelFactory,
  }) : _onChanged = onChanged,
       _onShowMessage = onShowMessage,
       _historicalCardModelFactory =
           historicalCardModelFactory ?? const ArHistoricalCardModelFactory();

  static const Duration repositionHoldDuration = Duration(milliseconds: 1200);
  static const Duration _repositionHitMaxAge = Duration(seconds: 10);
  static const Duration _repositionHoldConfirmationMaxAge = Duration(
    seconds: 2,
  );
  static const double _singleFingerRotationStartDelta = 3.0;
  static const double _twoFingerScaleEpsilon = 0.01;
  static const double _twoFingerRotationEpsilon = 0.01;
  static final vmath.Vector2 _defaultFreeOffset = vmath.Vector2(0.0, -0.3);
  static final vmath.Vector2 _defaultAnchoredOffset = vmath.Vector2.zero();

  final VoidCallback _onChanged;
  final void Function(String message) _onShowMessage;
  final ValueChanged<HistoricalData>? onHistoricalCardTap;
  final VoidCallback? onArUnsupported;
  final VoidCallback? onArSceneFailed;
  final ArHistoricalCardModelFactory _historicalCardModelFactory;

  final GlobalKey repaintKey = GlobalKey();

  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;
  ARAnchor? currentAnchor;
  ARNode? webObjectNode;
  final List<ARNode> _historicalCardNodes = [];
  final Map<String, HistoricalData> _historicalDataByNodeName = {};
  List<HistoricalData> _historicalData = [];
  String? _historicalCardSignature;

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
  bool isModelAnchoredToPlane = false;
  double ambientLightIntensity = 0.5;
  final ArRetryLimiter retryLimiter = ArRetryLimiter();
  int get retryCount => retryLimiter.attempts;
  int frameCounter = 0;
  bool isAddingNode = false;
  bool isLoadingHistoricalCards = false;
  bool historicalCardsFailed = false;
  bool _isDisposed = false;
  bool _isRelocationModeActive = false;
  bool _suppressNextPlaneTap = false;
  int _historicalCardSyncToken = 0;
  Timer? _retryTimer;
  Timer? _errorDismissTimer;
  Timer? _suppressPlaneTapTimer;
  List<ARHitTestResult> _pendingRepositionHits = const [];
  DateTime? _pendingRepositionHitAt;
  DateTime? _activeRepositionHoldStartedAt;
  DateTime? _confirmedRepositionHoldAt;
  DateTime? _lastRepositionHintAt;

  bool get hasHistoricalCardNodes => _historicalCardNodes.isNotEmpty;
  bool get isRelocationModeActive => _isRelocationModeActive;
  bool get _hasPlaneAnchor => currentAnchor is ARPlaneAnchor;

  void dispose() {
    _isDisposed = true;
    _retryTimer?.cancel();
    _errorDismissTimer?.cancel();
    _suppressPlaneTapTimer?.cancel();
    _removeHistoricalCardNodes();
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

    unawaited(_initializeAr());
  }

  Future<void> _initializeAr() async {
    try {
      await arSessionManager!.onInitialize(
        showFeaturePoints: false,
        showPlanes: false,
        showWorldOrigin: false,
        handleTaps: true,
        handlePans: false,
        handleRotation: false,
      );
      await arSessionManager!.setLightIntensityMultiplier(1.25);

      arObjectManager!.onInitialize();
      arObjectManager!.onNodeTap = _handleNodeTap;
      arSessionManager!.onPlaneOrPointTap = _handlePlaneOrPointTap;
      retryLimiter.reset();

      unawaited(_addWebObjectForMonument());
    } catch (e) {
      onArUnsupported?.call();
    }
  }

  void updateARMetrics() {
    isTrackingActive = arSessionManager != null;
    isModelAnchoredToPlane = _hasPlaneAnchor;
    ambientLightIntensity = (0.3 + 0.7 * ((frameCounter % 100) / 100)).clamp(
      0.0,
      1.0,
    );
    frameCounter++;
    _onChanged();
  }

  Future<void> setHistoricalData(List<HistoricalData> items) async {
    _historicalData = items
        .where((item) => item.title.trim().isNotEmpty)
        .take(3)
        .toList(growable: false);

    if (_historicalData.isEmpty) {
      historicalCardsFailed = false;
      isLoadingHistoricalCards = false;
      _historicalCardSignature = null;
      _removeHistoricalCardNodes();
      _onChanged();
      return;
    }

    historicalCardsFailed = false;
    await _syncHistoricalCardNodes();
  }

  void handleScaleStart(ScaleStartDetails details) {
    baseScale = scaleFactor;
    baseRotationX = rotationX;
    baseRotationY = rotationY;
    baseOffset = offset;
    baseFocalPoint = details.focalPoint;
  }

  bool handleScaleUpdate(ScaleUpdateDetails details) {
    if (webObjectNode == null) return false;

    final focalDrag = details.focalPoint - baseFocalPoint;
    final isTwoFingerGesture = details.pointerCount >= 2;

    if (!isTwoFingerGesture) {
      if (focalDrag.distance < _singleFingerRotationStartDelta) {
        return false;
      }

      final double deltaX = focalDrag.dx / 150;
      final double deltaY = focalDrag.dy / 300;

      rotationY = baseRotationY + deltaX;
      rotationX = (baseRotationX - deltaY).clamp(-1.4, 1.4);
    } else {
      final hasScale = (details.scale - 1.0).abs() > _twoFingerScaleEpsilon;
      final hasRotation = details.rotation.abs() > _twoFingerRotationEpsilon;
      final hasMove = details.focalPointDelta.distance > 0.1;
      if (!hasScale && !hasRotation && !hasMove) {
        return false;
      }

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
    return true;
  }

  Future<void> resetModelPosition() async {
    scaleFactor = 0.2;
    rotationX = 0.0;
    rotationY = 0.0;
    offset = _hasPlaneAnchor
        ? vmath.Vector2(_defaultAnchoredOffset.x, _defaultAnchoredOffset.y)
        : vmath.Vector2(_defaultFreeOffset.x, _defaultFreeOffset.y);
    _updateNodeTransform();
    _onChanged();
  }

  void startRepositionHold() {
    if (_isRelocationModeActive) return;
    _activeRepositionHoldStartedAt = DateTime.now();
    _confirmedRepositionHoldAt = null;
  }

  void cancelRepositionHold() {
    _activeRepositionHoldStartedAt = null;
    _confirmedRepositionHoldAt = null;
  }

  void cancelPendingRepositionTarget() {
    cancelRelocationMode();
  }

  void cancelRelocationMode() {
    _isRelocationModeActive = false;
    cancelRepositionHold();
    _pendingRepositionHits = const [];
    _pendingRepositionHitAt = null;
    _onChanged();
  }

  Future<void> confirmRepositionHold() async {
    if (isLoadingModel || webObjectNode == null) {
      cancelRepositionHold();
      _onShowMessage('Espera a que el modelo termine de cargar');
      return;
    }

    _isRelocationModeActive = true;
    _confirmedRepositionHoldAt = DateTime.now();
    _activeRepositionHoldStartedAt = null;
    _onChanged();

    if (_hasFreshPendingRepositionHit()) {
      await repositionModelAtHeldPoint();
      return;
    }

    _onShowMessage('Ahora toca una superficie detectada para mover el modelo');
  }

  Future<void> captureScreenshot() async {
    try {
      final sessionManager = arSessionManager;
      if (sessionManager == null) {
        _onShowMessage('No se pudo capturar la escena AR');
        return;
      }

      final snapshot = await sessionManager.snapshot();
      if (snapshot is! MemoryImage) {
        _onShowMessage('No se pudo preparar la captura AR');
        return;
      }

      final tempDir = Directory.systemTemp;
      final file = await File(
        '${tempDir.path}/historiar_screenshot_${DateTime.now().millisecondsSinceEpoch}.png',
      ).writeAsBytes(snapshot.bytes);

      _onShowMessage('Screenshot guardado: ${file.path}');
    } catch (e) {
      _onShowMessage('Error al capturar screenshot: $e');
    }
  }

  Future<void> _addWebObjectForMonument() async {
    final monument = _monument;
    final token = _token;
    if (_isDisposed || monument == null || token == null) {
      return;
    }

    isLoadingModel = true;
    loadError = null;
    _onChanged();

    try {
      final remoteUrl = await resolveModelUrl(monument, token);
      if (_isDisposed) return;

      if (remoteUrl == null || remoteUrl.isEmpty) {
        loadError = 'No se encontró modelo 3D para este monumento.';
        _onChanged();
        _scheduleErrorDismissal();
        return;
      }

      final cacheInfo = await ModelCacheManager.getCachedModel(
        remoteUrl,
        monument.id,
      );
      if (_isDisposed) return;

      if (cacheInfo == null) {
        _handleLoadError('Error al descargar el modelo 3D.');
        return;
      }

      if (webObjectNode != null) {
        _removeHistoricalCardNodes();
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
        type: NodeType.fileSystemAppFolderGLB,
        uri: cacheInfo.absolutePath,
        transformation: transform,
      );

      final didAdd = await arObjectManager?.addNode(newNode);
      if (didAdd == true) {
        _retryTimer?.cancel();
        retryLimiter.reset();
        webObjectNode = newNode;
        isModelAnchoredToPlane = _hasPlaneAnchor;
        _onShowMessage('Modelo cargado correctamente');
        unawaited(_syncHistoricalCardNodes());
      } else {
        _handleLoadError('No se pudo cargar el modelo 3D.');
      }
    } catch (e) {
      if (e.toString().contains('PlatformException') ||
          e.toString().toLowerCase().contains('arcore')) {
        onArUnsupported?.call();
      } else {
        _handleLoadError('No se pudo preparar o cargar el modelo 3D.');
      }
    } finally {
      isLoadingModel = false;
      if (!_isDisposed) {
        _onChanged();
      }
    }
  }

  void _handleLoadError(String message) {
    if (_isDisposed) return;

    loadError = message;
    _onChanged();

    if (retryLimiter.registerFailure()) {
      _retryTimer?.cancel();
      _retryTimer = Timer(const Duration(seconds: 3), () {
        if (_isDisposed) return;
        unawaited(_addWebObjectForMonument());
      });
    } else {
      _scheduleErrorDismissal();
    }
  }

  void _scheduleErrorDismissal() {
    _errorDismissTimer?.cancel();
    _errorDismissTimer = Timer(const Duration(seconds: 5), () {
      if (_isDisposed || loadError == null) return;
      loadError = null;
      _onChanged();
    });
  }

  static Future<String?> resolveModelUrl(
    Monument monument,
    String token,
  ) async {
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

    final zOffset = _hasPlaneAnchor ? 0.0 : -0.8;
    final transform = vmath.Matrix4.identity()
      ..setTranslationRaw(offset.x, offset.y, zOffset)
      ..rotateX(rotationX)
      ..rotateY(rotationY)
      ..scaleByDouble(scaleFactor, scaleFactor, scaleFactor, 1.0);

    webObjectNode!.transform = transform;
    _updateHistoricalCardTransforms();
    _onChanged();
  }

  Future<void> _handlePlaneOrPointTap(List<ARHitTestResult> hits) async {
    if (_suppressNextPlaneTap) {
      _suppressNextPlaneTap = false;
      return;
    }
    if (hits.isEmpty) return;
    if (!_isRelocationModeActive) return;

    final planeHits = hits
        .where((hit) => hit.type == ARHitTestResultType.plane)
        .toList(growable: false);
    if (planeHits.isEmpty) {
      _onShowMessage('Apunta a una superficie plana detectada');
      return;
    }

    _pendingRepositionHits = List<ARHitTestResult>.unmodifiable(planeHits);
    _pendingRepositionHitAt = DateTime.now();
    await repositionModelAtHeldPoint();
  }

  Future<void> repositionModelAtHeldPoint() async {
    if (isLoadingModel || webObjectNode == null) {
      cancelRepositionHold();
      _onShowMessage('Espera a que el modelo termine de cargar');
      return;
    }

    final hits = _pendingRepositionHits;
    if (hits.isEmpty || !_hasFreshPendingRepositionHit()) {
      cancelRepositionHold();
      _onShowMessage('Toca una superficie detectada y mantén para confirmar');
      return;
    }

    if (!_isRelocationModeActive && !_hasActiveOrConfirmedRepositionHold()) {
      _showRepositionHoldHint();
      return;
    }

    _pendingRepositionHits = const [];
    _pendingRepositionHitAt = null;
    cancelRepositionHold();
    _suppressPlaneTapOnce();
    _onShowMessage('Reposicionando modelo...');
    await _repositionModelAtHits(hits);
  }

  bool _hasFreshPendingRepositionHit() {
    final capturedAt = _pendingRepositionHitAt;
    return capturedAt != null &&
        DateTime.now().difference(capturedAt) <= _repositionHitMaxAge;
  }

  bool _hasFreshConfirmedRepositionHold() {
    final confirmedAt = _confirmedRepositionHoldAt;
    return confirmedAt != null &&
        DateTime.now().difference(confirmedAt) <=
            _repositionHoldConfirmationMaxAge;
  }

  bool _hasActiveOrConfirmedRepositionHold() {
    return _activeRepositionHoldStartedAt != null ||
        _hasFreshConfirmedRepositionHold();
  }

  Future<void> _repositionModelAtHits(List<ARHitTestResult> hits) async {
    if (isAddingNode) {
      _onShowMessage('El modelo ya se está moviendo');
      return;
    }
    isAddingNode = true;
    ARPlaneAnchor? createdAnchor;
    var didCommitNewGroup = false;

    try {
      final hit = hits.first;
      final previousNode = webObjectNode;
      final previousAnchor = currentAnchor;

      final monument = _monument;
      final token = _token;
      if (monument == null || token == null) {
        _cancelRelocationAfterFailedAttempt();
        _onShowMessage('No se pudo obtener el modelo');
        return;
      }

      final remoteUrl = await resolveModelUrl(monument, token);
      if (remoteUrl == null || remoteUrl.isEmpty) {
        _cancelRelocationAfterFailedAttempt();
        _onShowMessage('No se pudo obtener el modelo');
        return;
      }

      final cacheInfo = await ModelCacheManager.getCachedModel(
        remoteUrl,
        monument.id,
      );
      if (cacheInfo == null) {
        _cancelRelocationAfterFailedAttempt();
        _onShowMessage('Error al descargar el modelo local');
        return;
      }

      final planeAnchor = ARPlaneAnchor(transformation: hit.worldTransform);
      createdAnchor = planeAnchor;
      final addedToAnchor = await arAnchorManager?.addAnchor(planeAnchor);
      if (addedToAnchor != true) {
        _cancelRelocationAfterFailedAttempt();
        _onShowMessage('Error al posicionar el modelo');
        return;
      }

      final transform = vmath.Matrix4.identity()
        ..rotateX(rotationX)
        ..rotateY(rotationY)
        ..scaleByDouble(scaleFactor, scaleFactor, scaleFactor, 1.0);

      final newNode = ARNode(
        type: NodeType.fileSystemAppFolderGLB,
        uri: cacheInfo.absolutePath,
        transformation: transform,
      );

      final didAdd = await arObjectManager?.addNode(
        newNode,
        planeAnchor: planeAnchor,
      );

      if (didAdd == true) {
        final didRemovePreviousNode =
            previousNode == null || await _removeNodeSafely(previousNode);
        final didRemovePreviousAnchor =
            previousAnchor == null || await _removeAnchorSafely(previousAnchor);

        if (!didRemovePreviousNode || !didRemovePreviousAnchor) {
          final didRollbackNewNode = await _removeNodeSafely(newNode);
          final didRollbackNewAnchor = await _removeAnchorSafely(planeAnchor);
          _historicalCardSyncToken++;
          _historicalCardNodes.clear();
          _historicalDataByNodeName.clear();
          _historicalCardSignature = null;
          _isRelocationModeActive = false;
          webObjectNode = null;
          currentAnchor = null;
          isModelAnchoredToPlane = false;
          historicalCardsFailed = true;
          loadError = !didRollbackNewNode || !didRollbackNewAnchor
              ? 'La escena AR quedó en un estado inconsistente. Vuelve a abrir la cámara.'
              : 'No se pudo confirmar el cambio de posición. Vuelve a abrir la cámara.';
          _onChanged();
          onArSceneFailed?.call();
          return;
        }

        _removeHistoricalCardNodes();
        currentAnchor = planeAnchor;
        webObjectNode = newNode;
        didCommitNewGroup = true;
        _isRelocationModeActive = false;
        isModelAnchoredToPlane = _hasPlaneAnchor;
        historicalCardsFailed = false;
        offset = vmath.Vector2(
          _defaultAnchoredOffset.x,
          _defaultAnchoredOffset.y,
        );
        unawaited(_syncHistoricalCardNodes());
        _onChanged();
        _onShowMessage('Modelo reposicionado');
      } else {
        try {
          await arAnchorManager?.removeAnchor(planeAnchor);
        } catch (_) {}
        _cancelRelocationAfterFailedAttempt();
        _onShowMessage('Error al cargar el modelo en la nueva posición');
      }
    } catch (e) {
      if (!didCommitNewGroup && createdAnchor != null) {
        try {
          await arAnchorManager?.removeAnchor(createdAnchor);
        } catch (_) {}
      }
      _cancelRelocationAfterFailedAttempt();
      _onShowMessage('Error al mover el modelo');
    } finally {
      isAddingNode = false;
    }
  }

  Future<void> _syncHistoricalCardNodes() async {
    if (_isDisposed ||
        arObjectManager == null ||
        webObjectNode == null ||
        _historicalData.isEmpty) {
      return;
    }

    final signature = _historicalData
        .map((item) => '${item.id}:${item.title}:${item.imageUrl ?? ''}')
        .join('|');
    if (_historicalCardSignature == signature &&
        _historicalCardNodes.length == _historicalData.length) {
      _updateHistoricalCardTransforms();
      return;
    }

    final syncToken = ++_historicalCardSyncToken;
    isLoadingHistoricalCards = true;
    historicalCardsFailed = false;
    _onChanged();

    _removeHistoricalCardNodes(cancelPending: false);

    var addedCount = 0;
    try {
      for (var i = 0; i < _historicalData.length; i++) {
        if (_isDisposed || syncToken != _historicalCardSyncToken) return;

        final item = _historicalData[i];
        final modelPath = await _historicalCardModelFactory.buildCardModel(
          item,
        );
        if (_isDisposed || syncToken != _historicalCardSyncToken) return;

        final node = ARNode(
          type: NodeType.fileSystemAppFolderGLB,
          uri: modelPath,
          name: _historicalCardNodeName(item, i),
          transformation: _buildHistoricalCardTransform(
            i,
            _historicalData.length,
          ),
        );
        final didAdd = await arObjectManager?.addNode(
          node,
          planeAnchor: _currentPlaneAnchor,
        );

        if (didAdd == true) {
          _historicalCardNodes.add(node);
          _historicalDataByNodeName[node.name] = item;
          addedCount++;
        }
      }

      if (_isDisposed || syncToken != _historicalCardSyncToken) return;

      _historicalCardSignature = addedCount > 0 ? signature : null;
      historicalCardsFailed = addedCount == 0;
      if (historicalCardsFailed) {
        _onShowMessage('No se pudieron crear las fichas AR');
      }
    } catch (e) {
      if (_isDisposed || syncToken != _historicalCardSyncToken) return;
      historicalCardsFailed = true;
      _historicalCardSignature = null;
      _removeHistoricalCardNodes(cancelPending: false);
      _onShowMessage('No se pudieron preparar las fichas AR');
    } finally {
      if (!_isDisposed && syncToken == _historicalCardSyncToken) {
        isLoadingHistoricalCards = false;
        _onChanged();
      }
    }
  }

  void _removeHistoricalCardNodes({bool cancelPending = true}) {
    if (cancelPending) {
      _historicalCardSyncToken++;
    }
    for (final node in _historicalCardNodes) {
      try {
        arObjectManager?.removeNode(node);
      } catch (_) {}
    }
    _historicalCardNodes.clear();
    _historicalDataByNodeName.clear();
    _historicalCardSignature = null;
  }

  Future<bool> _removeNodeSafely(ARNode node) async {
    final objectManager = arObjectManager;
    if (objectManager == null) return false;
    try {
      await objectManager.removeNode(node);
      return true;
    } catch (_) {
      return false;
    }
  }

  void _cancelRelocationAfterFailedAttempt() {
    _isRelocationModeActive = false;
    cancelRepositionHold();
    _pendingRepositionHits = const [];
    _pendingRepositionHitAt = null;
    _onChanged();
  }

  Future<bool> _removeAnchorSafely(ARAnchor anchor) async {
    final anchorManager = arAnchorManager;
    if (anchorManager == null) return false;
    try {
      await anchorManager.removeAnchor(anchor);
      return true;
    } catch (_) {
      return false;
    }
  }

  void _updateHistoricalCardTransforms() {
    if (webObjectNode == null || _historicalCardNodes.isEmpty) return;

    for (var i = 0; i < _historicalCardNodes.length; i++) {
      _historicalCardNodes[i].transform = _buildHistoricalCardTransform(
        i,
        _historicalCardNodes.length,
      );
    }
  }

  vmath.Matrix4 _buildHistoricalCardTransform(int index, int count) {
    final modelPosition =
        webObjectNode?.position ?? vmath.Vector3(offset.x, offset.y, -0.8);
    final cardOffset = _historicalCardOffset(index, count);
    final cardScale = (0.55 + scaleFactor * 0.45).clamp(0.52, 0.82).toDouble();

    return vmath.Matrix4.identity()
      ..setTranslationRaw(
        modelPosition.x + cardOffset.x,
        modelPosition.y + cardOffset.y,
        modelPosition.z + cardOffset.z,
      )
      ..scaleByDouble(cardScale, cardScale, cardScale, 1.0);
  }

  vmath.Vector3 _historicalCardOffset(int index, int count) {
    final spread = (0.34 + scaleFactor * 0.62).clamp(0.34, 0.62).toDouble();
    final lift = (0.44 + scaleFactor * 0.72).clamp(0.44, 0.78).toDouble();
    final forward = currentAnchor == null ? 0.03 : 0.08;

    if (count <= 1) {
      return vmath.Vector3(0, lift, forward);
    }

    if (count == 2) {
      return index == 0
          ? vmath.Vector3(-spread * 0.64, lift, forward)
          : vmath.Vector3(spread * 0.64, lift + 0.08, forward);
    }

    if (index == 0) return vmath.Vector3(-spread, lift, forward);
    if (index == 1) return vmath.Vector3(0, lift + 0.16, forward);
    return vmath.Vector3(spread, lift, forward);
  }

  ARPlaneAnchor? get _currentPlaneAnchor {
    final anchor = currentAnchor;
    return anchor is ARPlaneAnchor ? anchor : null;
  }

  String _historicalCardNodeName(HistoricalData item, int index) {
    final rawId = item.id.isNotEmpty
        ? item.id
        : '${item.monumentId}_${item.order}_$index';
    final safeId = rawId.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
    return '[#historical_card_${index}_$safeId]';
  }

  void _handleNodeTap(List<String> nodeNames) {
    if (nodeNames.isNotEmpty) {
      _suppressPlaneTapOnce();
    }

    for (final nodeName in nodeNames) {
      final item = _historicalDataByNodeName[nodeName];
      if (item != null) {
        onHistoricalCardTap?.call(item);
        return;
      }
    }
  }

  void _suppressPlaneTapOnce() {
    _suppressNextPlaneTap = true;
    _suppressPlaneTapTimer?.cancel();
    _suppressPlaneTapTimer = Timer(const Duration(milliseconds: 700), () {
      _suppressNextPlaneTap = false;
    });
  }

  void _showRepositionHoldHint() {
    final now = DateTime.now();
    final lastHintAt = _lastRepositionHintAt;
    if (lastHintAt == null ||
        now.difference(lastHintAt) > const Duration(seconds: 4)) {
      _lastRepositionHintAt = now;
      _onShowMessage('Mantén 1 segundo y toca un plano para mover el modelo');
    }
  }
}
