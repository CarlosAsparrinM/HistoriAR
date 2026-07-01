import 'package:flutter/material.dart';

import '../styles/app_colors.dart';

/// Indicador visual de la calidad del tracking de AR.
/// Muestra: luz ambiental, anclaje del modelo, y estabilidad del tracking.
class ArQualityIndicator extends StatefulWidget {
  final bool isTrackingActive;
  final bool isModelVisible;
  final bool isModelAnchoredToPlane;
  final double lightIntensity; // 0.0 a 1.0
  final bool showDebugInfo;

  const ArQualityIndicator({
    super.key,
    this.isTrackingActive = true,
    this.isModelVisible = false,
    this.isModelAnchoredToPlane = false,
    this.lightIntensity = 0.5,
    this.showDebugInfo = false,
  });

  @override
  State<ArQualityIndicator> createState() => _ArQualityIndicatorState();
}

class _ArQualityIndicatorState extends State<ArQualityIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Color _getTrackingColor() {
    if (!widget.isTrackingActive) return AppColors.danger;
    if (!widget.isModelVisible) return AppColors.warning;
    if (!widget.isModelAnchoredToPlane) return AppColors.primary;
    return AppColors.success;
  }

  String _getTrackingStatus() {
    if (!widget.isTrackingActive) return 'Tracking desactivado';
    if (!widget.isModelVisible) return 'Cargando modelo';
    if (!widget.isModelAnchoredToPlane) return 'Modelo libre';
    return 'Modelo anclado';
  }

  @override
  Widget build(BuildContext context) {
    final trackingColor = _getTrackingColor();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Status principal
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: trackingColor.withValues(alpha: 0.6),
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: trackingColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        if (widget.isTrackingActive && widget.isModelVisible)
                          BoxShadow(
                            color: trackingColor.withValues(
                              alpha: 0.5 + 0.5 * (1 - _pulseController.value),
                            ),
                            blurRadius: 8 * _pulseController.value,
                            spreadRadius: 2 * _pulseController.value,
                          ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(width: 8),
              Text(
                _getTrackingStatus(),
                style: TextStyle(
                  color: trackingColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        if (widget.showDebugInfo) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.2),
                width: 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _DebugRow(
                  label: 'Luz ambiente',
                  value: '${(widget.lightIntensity * 100).toStringAsFixed(0)}%',
                  color: widget.lightIntensity > 0.3
                      ? AppColors.success
                      : AppColors.warning,
                ),
                const SizedBox(height: 4),
                _DebugRow(
                  label: 'Anclado a superficie',
                  value: widget.isModelAnchoredToPlane ? 'Sí' : 'No',
                  color: widget.isModelAnchoredToPlane
                      ? AppColors.success
                      : AppColors.warning,
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _DebugRow extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _DebugRow({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label: ',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 11,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
