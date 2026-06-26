import 'dart:async';
import 'dart:io';

import 'package:ar_flutter_plugin_plus/ar_flutter_plugin_plus.dart';
import 'package:ar_flutter_plugin_plus/datatypes/config_planedetection.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_session_manager.dart';
import 'package:flutter/material.dart';

import '../controllers/ar_camera_ar_controller.dart';
import '../models/historical_data.dart';
import '../models/monument.dart';
import '../services/historical_data_service.dart';
import '../services/pending_visits_service.dart';
import '../styles/app_colors.dart';
import '../utils/model_cache_manager.dart';
import '../widgets/app_feedback.dart';
import '../widgets/ar_camera_actions_bar.dart';
import '../widgets/ar_camera_status_overlays.dart';
import '../widgets/ar_contextual_guide.dart';
import '../widgets/ar_historical_floating_cards.dart';
import '../widgets/ar_historical_info_panel.dart';
import '../widgets/ar_monument_timeline.dart';
import '../widgets/ar_quality_indicator.dart';
import '../widgets/fallback_3d_viewer.dart';
import '../widgets/monument_info_sheet.dart';

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
  late final ArCameraArController _arController;

  final PendingVisitsService _pendingVisitsService = PendingVisitsService();
  final HistoricalDataService _historicalDataService = HistoricalDataService();
  DateTime? _experienceReadyAt;
  bool _visitQueued = false;
  bool _isClosing = false;
  bool _allowPop = false;
  List<HistoricalData> _historicalData = [];
  bool _isLoadingHistoricalData = false;
  String? _historicalDataError;

  // Nuevas variables para mejoras de UX
  bool _isInfoModalOpen = false;
  bool _isHistoricalPanelExpanded = false;
  bool _shouldShowContextualGuide = true;
  late Stopwatch _frameStopwatch;

  bool _isArMode = false;
  String? _fallbackModelUrl;
  bool _isLoadingUrl = false;

  Future<void> _loadFallbackUrl() async {
    if (_fallbackModelUrl != null) return;
    if (!mounted) return;
    setState(() {
      _isLoadingUrl = true;
    });
    try {
      final url = await ArCameraArController.resolveModelUrl(
        widget.monument,
        widget.token,
      );

      if (url == null || url.isEmpty) {
        throw Exception('URL no encontrada');
      }

      final cacheInfo = await ModelCacheManager.getCachedModel(
        url,
        widget.monument.id,
      );
      if (cacheInfo == null) {
        throw Exception('No se pudo descargar un modelo 3D válido');
      }

      if (!mounted) return;
      setState(() {
        _fallbackModelUrl = cacheInfo.localUri;
      });
      _markExperienceReady();
    } catch (e) {
      if (mounted) {
        _showSnackbar('Error al cargar la URL del modelo');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingUrl = false;
        });
      }
    }
  }

  void _toggleArMode() {
    setState(() {
      _isArMode = !_isArMode;
    });
    if (!_isArMode) {
      _loadFallbackUrl();
    }
  }

  @override
  void initState() {
    super.initState();
    if (!_isArMode) {
      _loadFallbackUrl();
    }
    _arController = ArCameraArController(
      onChanged: () {
        if (mounted) {
          if (_arController.webObjectNode != null) {
            _markExperienceReady();
          }
          setState(() {});
        }
      },
      onShowMessage: _showSnackbar,
      onArUnsupported: () {
        if (!mounted) return;
        setState(() {
          _isArMode = false;
        });
        _loadFallbackUrl();
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('RA no compatible'),
            content: const Text(
              'Tu dispositivo no cuenta con el soporte necesario (ARCore) para mostrar experiencias de realidad aumentada.\n\nPuedes seguir explorando el monumento en el visor 3D.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Entendido'),
              ),
            ],
          ),
        );
      },
      onHistoricalCardTap: _showHistoricalDataDetail,
    );
    _frameStopwatch = Stopwatch()..start();
    _startPeriodicTracking();
    unawaited(_loadHistoricalData());
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
    _arController.updateARMetrics();
  }

  Future<void> _loadHistoricalData() async {
    if (_isLoadingHistoricalData) return;
    if (mounted) {
      setState(() {
        _isLoadingHistoricalData = true;
        _historicalDataError = null;
      });
    }

    try {
      final data = await _historicalDataService.fetchHistoricalDataByMonument(
        widget.monument.id,
        token: widget.token,
      );
      if (!mounted) return;
      setState(() {
        _historicalData = data;
        _isLoadingHistoricalData = false;
      });
      unawaited(_arController.setHistoricalData(data));
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoadingHistoricalData = false;
        _historicalDataError = 'No se pudieron cargar las fichas';
      });
    }
  }

  @override
  void dispose() {
    _frameStopwatch.stop();
    _arController.dispose();
    if (!_visitQueued && _experienceReadyAt != null) {
      unawaited(_queueVisit());
    }
    super.dispose();
  }

  /// Reset la posición del modelo al estado inicial
  Future<void> _resetModelPosition() async {
    await _arController.resetModelPosition();
    _showSnackbar('Modelo centrado');
  }

  /// Captura pantalla de la experiencia AR
  Future<void> _captureScreenshot() async {
    await _arController.captureScreenshot();
  }

  void _showSnackbar(String message) {
    if (!mounted) return;
    AppFeedback.info(context, message);
  }

  void onARViewCreated(
    ARSessionManager arSessionManager,
    ARObjectManager arObjectManager,
    ARAnchorManager arAnchorManager,
    ARLocationManager arLocationManager,
  ) {
    _arController.onARViewCreated(
      monument: widget.monument,
      token: widget.token,
      arSessionManager: arSessionManager,
      arObjectManager: arObjectManager,
      arAnchorManager: arAnchorManager,
      arLocationManager: arLocationManager,
    );
    unawaited(_arController.setHistoricalData(_historicalData));
  }

  Widget _buildBackButton() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.7),
        shape: BoxShape.circle,
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 8),
        ],
      ),
      child: IconButton(
        onPressed: _onBackPressed,
        icon: const Icon(Icons.arrow_back, color: Colors.white),
        padding: const EdgeInsets.all(10),
        constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
        splashRadius: 22,
      ),
    );
  }

  Widget _buildArModeToggle() {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 12, right: 4),
            child: Text(
              'RA',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Switch(
            value: _isArMode,
            onChanged: (_) => _toggleArMode(),
            activeThumbColor: AppColors.primary,
            activeTrackColor: AppColors.primary.withValues(alpha: 0.4),
            inactiveThumbColor: Colors.grey,
            inactiveTrackColor: Colors.grey.withValues(alpha: 0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoricalToggle() {
    return IconButton(
      tooltip: _isHistoricalPanelExpanded
          ? 'Ocultar información histórica'
          : 'Mostrar información histórica',
      onPressed: () {
        setState(() {
          _isHistoricalPanelExpanded = !_isHistoricalPanelExpanded;
          if (_isHistoricalPanelExpanded) {
            _shouldShowContextualGuide = false;
          }
        });
      },
      style: IconButton.styleFrom(
        backgroundColor: Colors.black.withValues(alpha: 0.7),
        side: BorderSide(
          color: _isHistoricalPanelExpanded
              ? AppColors.primary
              : AppColors.primary.withValues(alpha: 0.3),
        ),
        minimumSize: const Size(44, 44),
      ),
      icon: Icon(
        _isHistoricalPanelExpanded ? Icons.history : Icons.history_outlined,
        color: _isHistoricalPanelExpanded ? AppColors.primary : Colors.white,
        size: 20,
      ),
    );
  }

  Widget _buildTopControls() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.black.withValues(alpha: 0.65), Colors.transparent],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  _buildBackButton(),
                  const Spacer(),
                  _buildArModeToggle(),
                ],
              ),
              if (_isArMode) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const SizedBox(width: 44),
                    Expanded(
                      child: Center(
                        child: ArQualityIndicator(
                          isTrackingActive: _arController.isTrackingActive,
                          isPlanDetected: _arController.isPlanDetected,
                          lightIntensity: _arController.ambientLightIntensity,
                          showDebugInfo: false,
                        ),
                      ),
                    ),
                    _buildHistoricalToggle(),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final safeArea = MediaQuery.paddingOf(context);
    final hasVisibleModel = _isArMode
        ? _arController.webObjectNode != null && !_arController.isLoadingModel
        : _fallbackModelUrl != null && !_isLoadingUrl;
    final showFloatingHistoricalCards =
        hasVisibleModel &&
        !_isInfoModalOpen &&
        !_isHistoricalPanelExpanded &&
        !(_isArMode && _shouldShowContextualGuide) &&
        (!_isArMode ||
            _historicalData.isEmpty ||
            _arController.historicalCardsFailed ||
            _arController.isLoadingHistoricalCards);
    final isPreparingArHistoricalCards =
        _isArMode &&
        _historicalData.isNotEmpty &&
        _arController.isLoadingHistoricalCards;
    final showHistoricalCardHitTargets =
        _isArMode &&
        _arController.hasHistoricalCardNodes &&
        !showFloatingHistoricalCards &&
        !_isInfoModalOpen &&
        !_isHistoricalPanelExpanded &&
        !_shouldShowContextualGuide;

    return PopScope<void>(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          unawaited(_finishAndPop());
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (_isArMode) ...[
              Positioned.fill(
                child: RepaintBoundary(
                  key: _arController.repaintKey,
                  child: ARView(
                    onARViewCreated: onARViewCreated,
                    planeDetectionConfig: PlaneDetectionConfig.horizontal,
                  ),
                ),
              ),
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onDoubleTap: () => unawaited(_resetModelPosition()),
                  onScaleStart: (details) {
                    _arController.handleScaleStart(details);
                  },
                  onScaleUpdate: (details) {
                    _arController.handleScaleUpdate(details);
                  },
                  child: const SizedBox.expand(),
                ),
              ),
              // Estado de carga del modelo
              if (_arController.isLoadingModel) const ArCameraLoadingOverlay(),
              // Banner de error
              if (_arController.loadError != null &&
                  !_arController.isLoadingModel)
                ArCameraErrorBanner(
                  message: _arController.loadError!,
                  onDismiss: () =>
                      setState(() => _arController.loadError = null),
                ),
              // Instrucciones contextuales mejoradas
              if (_shouldShowContextualGuide &&
                  (!_arController.isLoadingModel ||
                      !_arController.isPlanDetected))
                Positioned(
                  left: 16,
                  right: 16,
                  top: safeArea.top + 132,
                  child: ArContextualGuide(
                    monument: widget.monument,
                    isModelLoaded: _arController.webObjectNode != null,
                    isTrackingActive: _arController.isTrackingActive,
                    onDismiss: () =>
                        setState(() => _shouldShowContextualGuide = false),
                  ),
                ),
              // Panel de información histórica (abajo)
              Positioned(
                left: 0,
                right: 0,
                bottom: safeArea.bottom + 96,
                child: ArHistoricalInfoPanel(
                  monument: widget.monument,
                  isExpanded: _isHistoricalPanelExpanded,
                ),
              ),
            ] else ...[
              // Modo fallback 3D
              if (_isLoadingUrl)
                const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              else if (_fallbackModelUrl != null)
                Fallback3dViewer(modelUrl: _fallbackModelUrl!)
              else
                const Center(
                  child: Text(
                    'No se encontró modelo 3D.',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              // Timeline visual en modo fallback
              Positioned(
                top: safeArea.top + 76,
                right: 16,
                left: 16,
                child: ArMonumentTimeline(
                  monument: widget.monument,
                  showYears: true,
                ),
              ),
            ],
            if (showFloatingHistoricalCards)
              if (_isArMode)
                Positioned(
                  top: safeArea.top + 150,
                  left: 0,
                  right: 0,
                  child: ArHistoricalFloatingCards(
                    items: _historicalData,
                    isLoading:
                        _isLoadingHistoricalData ||
                        isPreparingArHistoricalCards,
                    errorMessage: _historicalDataError,
                    onRetry: () => unawaited(_loadHistoricalData()),
                    onTap: _showHistoricalDataDetail,
                  ),
                )
              else
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: safeArea.bottom + 96,
                  child: ArHistoricalCarouselCards(
                    items: _historicalData,
                    isLoading: _isLoadingHistoricalData,
                    errorMessage: _historicalDataError,
                    onRetry: () => unawaited(_loadHistoricalData()),
                    onTap: _showHistoricalDataDetail,
                  ),
                ),
            if (showHistoricalCardHitTargets)
              Positioned(
                top: safeArea.top + 150,
                left: 0,
                right: 0,
                child: ArHistoricalFloatingCards(
                  items: _historicalData,
                  hitTestOnly: true,
                  onTap: _showHistoricalDataDetail,
                ),
              ),
            Positioned(top: 0, left: 0, right: 0, child: _buildTopControls()),
            // Barra de acciones inferior (siempre visible cuando está el modelo cargado)
            Align(
              alignment: Alignment.bottomCenter,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: IgnorePointer(
                    ignoring: _isInfoModalOpen,
                    child: AnimatedSlide(
                      offset: _isInfoModalOpen
                          ? const Offset(0, 1.25)
                          : Offset.zero,
                      duration: const Duration(milliseconds: 320),
                      curve: Curves.easeInOutCubic,
                      child: AnimatedOpacity(
                        opacity: _isInfoModalOpen ? 0.0 : 1.0,
                        duration: const Duration(milliseconds: 220),
                        curve: Curves.easeInOut,
                        child: ArCameraActionsBar(
                          onReset: _isArMode ? _resetModelPosition : null,
                          onScreenshot: _isArMode ? _captureScreenshot : null,
                          onInfo: () => _showMonumentInfo(context),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onBackPressed() async {
    await _finishAndPop();
  }

  Future<void> _showMonumentInfo(BuildContext context) async {
    if (_isInfoModalOpen) return;

    if (mounted) {
      setState(() {
        _isInfoModalOpen = true;
      });
    }

    try {
      await showMonumentInfoSheet(context, widget.monument);
    } finally {
      if (mounted) {
        setState(() {
          _isInfoModalOpen = false;
        });
      }
    }
  }

  Future<void> _showHistoricalDataDetail(HistoricalData data) async {
    if (_isInfoModalOpen) return;

    if (mounted) {
      setState(() {
        _isInfoModalOpen = true;
      });
    }

    try {
      await showHistoricalDataDetailSheet(context, data);
    } finally {
      if (mounted) {
        setState(() {
          _isInfoModalOpen = false;
        });
      }
    }
  }

  void _markExperienceReady() {
    _experienceReadyAt ??= DateTime.now();
  }

  Future<void> _finishAndPop() async {
    if (_isClosing) return;
    _isClosing = true;

    try {
      await _queueVisit();
    } finally {
      if (mounted) {
        setState(() {
          _allowPop = true;
        });
        await Future<void>.delayed(Duration.zero);
      }
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  Future<void> _queueVisit() async {
    final readyAt = _experienceReadyAt;
    if (_visitQueued || readyAt == null) return;
    _visitQueued = true;

    final elapsedSeconds = DateTime.now().difference(readyAt).inSeconds;
    final durationMinutes = (elapsedSeconds / 60).ceil().clamp(1, 1440);
    final visit = PendingVisit.create(
      userId: widget.userId,
      monumentId: widget.monument.id,
      tourId: widget.tourId,
      durationMinutes: durationMinutes,
    );

    try {
      await _pendingVisitsService.enqueue(visit);
      unawaited(_pendingVisitsService.sync());
    } catch (e) {
      _visitQueued = false;
      stdout.writeln('Error guardando visita pendiente: $e');
    }
  }
}
