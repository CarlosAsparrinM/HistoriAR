import 'package:flutter/material.dart';

import '../styles/app_colors.dart';

class ArCameraActionsBar extends StatelessWidget {
  final VoidCallback? onReset;
  final VoidCallback? onScreenshot;
  final VoidCallback? onInfo;

  const ArCameraActionsBar({
    super.key,
    this.onReset,
    this.onScreenshot,
    this.onInfo,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
          _CompactActionButton(
            icon: Icons.refresh_outlined,
            label: 'Reset',
            onTap: onReset,
          ),
          const SizedBox(width: 8),
          _CompactActionButton(
            icon: Icons.screenshot_monitor,
            label: 'Captura',
            onTap: onScreenshot,
          ),
          const SizedBox(width: 8),
          _CompactActionButton(
            icon: Icons.info_outline,
            label: 'Info',
            onTap: onInfo,
          ),
        ],
      ),
    );
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
    if (widget.onTap == null) return;
    _controller.forward();
  }

  void _onTapUp(TapUpDetails _) {
    if (widget.onTap == null) return;
    _controller.reverse();
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;

    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.label,
      child: GestureDetector(
        onTapDown: _onTapDown,
        onTapUp: _onTapUp,
        onTapCancel: () => _controller.reverse(),
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                decoration: BoxDecoration(
                  color: enabled
                      ? AppColors.primary
                      : Colors.grey.withValues(alpha: 0.7),
                  shape: BoxShape.circle,
                  boxShadow: enabled
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 8,
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Icon(widget.icon, color: Colors.white, size: 20),
              ),
              const SizedBox(height: 4),
              Text(
                widget.label,
                style: TextStyle(
                  color: enabled ? Colors.white : Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
