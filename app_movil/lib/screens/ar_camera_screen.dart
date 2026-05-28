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
import '../models/monument.dart';
import '../services/visits_service.dart';
import '../styles/app_colors.dart';
import '../widgets/app_feedback.dart';
import '../widgets/ar_camera_actions_bar.dart';
import '../widgets/ar_camera_status_overlays.dart';
import '../widgets/ar_control_hints.dart';
import '../widgets/ar_quality_indicator.dart';
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

  // Variables para registro de visita
  DateTime? _visitStartTime;
  final VisitsService _visitsService = const VisitsService();

  // Nuevas variables para mejoras de UX
  bool _isInfoModalOpen = false;
  late Stopwatch _frameStopwatch;

  @override
  void initState() {
    super.initState();
    _arController = ArCameraArController(
      onChanged: () {
        if (mounted) {
          setState(() {});
        }
      },
      onShowMessage: _showSnackbar,
    );
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
    _arController.updateARMetrics();
  }

  @override
  void dispose() {
    _frameStopwatch.stop();
    _arController.dispose();
    _registerVisit();
    super.dispose();
  }

  /// Reset la posición del modelo al estado inicial
  Future<void> _resetModelPosition() async {
    await _arController.resetModelPosition();
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
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          GestureDetector(
            onScaleStart: (details) {
              _arController.handleScaleStart(details);
            },
            onScaleUpdate: (details) {
              _arController.handleScaleUpdate(details);
            },
            child: RepaintBoundary(
              key: _arController.repaintKey,
              child: ARView(
                onARViewCreated: onARViewCreated,
                planeDetectionConfig: PlaneDetectionConfig.horizontal,
              ),
            ),
          ),
          if (_arController.isLoadingModel) const ArCameraLoadingOverlay(),
          if (_arController.loadError != null && !_arController.isLoadingModel)
            ArCameraErrorBanner(
              message: _arController.loadError!,
              onDismiss: () => setState(() => _arController.loadError = null),
            ),
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
          Align(
            alignment: Alignment.topRight,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(right: 12, top: 12),
                child: ArQualityIndicator(
                  isTrackingActive: _arController.isTrackingActive,
                  isPlanDetected: _arController.isPlanDetected,
                  lightIntensity: _arController.ambientLightIntensity,
                  showDebugInfo: false,
                ),
              ),
            ),
          ),
          if (!_arController.isLoadingModel &&
              _arController.webObjectNode == null)
            Align(
              alignment: Alignment.center,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ArControlHints(
                  isModelLoaded: _arController.webObjectNode != null,
                  onDismiss: () => setState(() {}),
                ),
              ),
            ),
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
                        onReset: _resetModelPosition,
                        onScreenshot: _captureScreenshot,
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
    );
  }

  Future<void> _onBackPressed() async {
    Navigator.of(context).pop();
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
}
