import 'dart:async';

import 'package:flutter/material.dart';

import '../models/monument.dart';
import '../styles/app_colors.dart';

class ArContextualGuide extends StatefulWidget {
  final Monument monument;
  final bool isModelLoaded;
  final bool isTrackingActive;
  final VoidCallback onDismiss;

  const ArContextualGuide({
    super.key,
    required this.monument,
    required this.isModelLoaded,
    required this.isTrackingActive,
    required this.onDismiss,
  });

  @override
  State<ArContextualGuide> createState() => _ArContextualGuideState();
}

class _ArContextualGuideState extends State<ArContextualGuide>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _animationController.forward();

    if (widget.isModelLoaded) {
      _scheduleAutoDismiss();
    }
  }

  @override
  void didUpdateWidget(covariant ArContextualGuide oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.isModelLoaded && widget.isModelLoaded) {
      _scheduleAutoDismiss();
    }
  }

  void _scheduleAutoDismiss() {
    _dismissTimer?.cancel();
    _dismissTimer = Timer(const Duration(seconds: 8), () async {
      if (!mounted || !widget.isModelLoaded) return;

      await _animationController.reverse();
      if (mounted) {
        widget.onDismiss();
      }
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero)
            .animate(
              CurvedAnimation(
                parent: _animationController,
                curve: Curves.easeOut,
              ),
            ),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.black.withValues(alpha: 0.8),
                Colors.black.withValues(alpha: 0.7),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.4),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.2),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: AppColors.primary,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Explorando: ${widget.monument.name}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: widget.onDismiss,
                    child: Icon(Icons.close, color: Colors.white54, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (!widget.isModelLoaded)
                _buildGuideStep(
                  '1️⃣',
                  'Cargando modelo 3D...',
                  'Aguarda un momento mientras se carga la representación del ${widget.monument.culture ?? 'monumento'}.',
                )
              else if (!widget.isTrackingActive)
                _buildGuideStep(
                  '👆',
                  'Detectando planos...',
                  'Apunta tu cámara a una superficie plana para anclar el modelo en la realidad.',
                )
              else
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildGuideStep(
                      '✌️',
                      'Pinch para escalar',
                      'Usa dos dedos para agrandar o reducir el modelo.',
                    ),
                    const SizedBox(height: 10),
                    _buildGuideStep(
                      '🔄',
                      'Desliza para rotar',
                      'Arrastra con un dedo para girar el ${widget.monument.culture ?? 'monumento'}.',
                    ),
                    const SizedBox(height: 10),
                    _buildGuideStep(
                      '📸',
                      'Captura tu momento',
                      'Usa el botón inferior para guardar tu fotografía de RA.',
                    ),
                  ],
                ),
              if (widget.monument.periodName != null &&
                  widget.monument.periodName!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.history, color: AppColors.primary, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Período: ${widget.monument.periodName}',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGuideStep(String emoji, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(emoji, style: const TextStyle(fontSize: 18)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 11,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
