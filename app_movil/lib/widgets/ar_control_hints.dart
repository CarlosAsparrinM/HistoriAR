import 'dart:async';

import 'package:flutter/material.dart';

import '../styles/app_colors.dart';

/// Widget que muestra hints interactivos sobre cómo controlar el modelo AR.
/// Se oculta automáticamente después de que el usuario realiza gestos.
class ArControlHints extends StatefulWidget {
  final bool isModelLoaded;
  final VoidCallback? onDismiss;

  const ArControlHints({super.key, this.isModelLoaded = true, this.onDismiss});

  @override
  State<ArControlHints> createState() => _ArControlHintsState();
}

class _ArControlHintsState extends State<ArControlHints>
    with SingleTickerProviderStateMixin {
  bool _showHints = true;
  late final AnimationController _animationController;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;
  Timer? _autoHideTimer;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 320),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero).animate(
          CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
        );
    _startAutoHideTimer();
  }

  @override
  void dispose() {
    _autoHideTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  void _startAutoHideTimer() {
    _autoHideTimer?.cancel();
    _autoHideTimer = Timer(const Duration(milliseconds: 3500), () {
      if (mounted && _showHints) {
        _hideHints();
      }
    });
  }

  void _hideHints() {
    if (!_showHints) return;
    setState(() => _showHints = false);
    _autoHideTimer?.cancel();
    _animationController.forward();
    widget.onDismiss?.call();
  }

  void _onUserInteraction() {
    _startAutoHideTimer();
  }

  @override
  Widget build(BuildContext context) {
    if (!_showHints) return const SizedBox.shrink();

    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: GestureDetector(
          onTap: _hideHints,
          onPanDown: (_) => _onUserInteraction(),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.5),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.touch_app_outlined,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Controles interactivos',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _hideHints,
                      iconSize: 18,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: Icon(
                        Icons.close,
                        color: Colors.white.withValues(alpha: 0.6),
                        size: 18,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _HintRow(
                  icon: Icons.pan_tool_outlined,
                  label: 'Un dedo',
                  description: 'Rota el modelo',
                ),
                const SizedBox(height: 8),
                _HintRow(
                  icon: Icons.pinch_outlined,
                  label: 'Dos dedos',
                  description: 'Zoom y giro',
                ),
                const SizedBox(height: 8),
                _HintRow(
                  icon: Icons.refresh_outlined,
                  label: 'Tap en plano',
                  description: 'Reposiciona',
                ),
                const SizedBox(height: 12),
                Text(
                  'Tap para descartar',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6),
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HintRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;

  const _HintRow({
    required this.icon,
    required this.label,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                ),
              ),
              Text(
                description,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
