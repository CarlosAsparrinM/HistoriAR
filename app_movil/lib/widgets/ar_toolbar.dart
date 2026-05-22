import 'package:flutter/material.dart';

import '../styles/app_colors.dart';

/// Toolbar flotante con acciones rápidas en la pantalla AR.
/// Incluye: reset posición, screenshot, info expandida, etc.
class ArToolbar extends StatefulWidget {
  final VoidCallback? onReset;
  final VoidCallback? onScreenshot;
  final VoidCallback? onInfo;
  final VoidCallback? onClose;

  const ArToolbar({
    super.key,
    this.onReset,
    this.onScreenshot,
    this.onInfo,
    this.onClose,
  });

  @override
  State<ArToolbar> createState() => _ArToolbarState();
}

class _ArToolbarState extends State<ArToolbar>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 320),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _toggleExpanded() {
    setState(() => _isExpanded = !_isExpanded);
    if (_isExpanded) {
      _animationController.forward();
    } else {
      _animationController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomRight,
      child: Padding(
        padding: const EdgeInsets.only(right: 16, bottom: 24),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Acciones expandidas con aparición escalonada
            if (_isExpanded)
              Align(
                alignment: Alignment.bottomRight,
                child: AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Opacity(
                          opacity: CurvedAnimation(
                            parent: _animationController,
                            curve: const Interval(0.0, 0.45),
                          ).value,
                          child: Transform.translate(
                            offset: Offset(
                              0,
                              (1 -
                                      CurvedAnimation(
                                        parent: _animationController,
                                        curve: const Interval(0.0, 0.45),
                                      ).value) *
                                  12,
                            ),
                            child: _ActionButton(
                              icon: Icons.refresh_outlined,
                              label: 'Reset',
                              onTap: () {
                                widget.onReset?.call();
                                _toggleExpanded();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Opacity(
                          opacity: CurvedAnimation(
                            parent: _animationController,
                            curve: const Interval(0.08, 0.7),
                          ).value,
                          child: Transform.translate(
                            offset: Offset(
                              0,
                              (1 -
                                      CurvedAnimation(
                                        parent: _animationController,
                                        curve: const Interval(0.08, 0.7),
                                      ).value) *
                                  12,
                            ),
                            child: _ActionButton(
                              icon: Icons.screenshot_monitor,
                              label: 'Screenshot',
                              onTap: () {
                                widget.onScreenshot?.call();
                                _toggleExpanded();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Opacity(
                          opacity: CurvedAnimation(
                            parent: _animationController,
                            curve: const Interval(0.16, 0.9),
                          ).value,
                          child: Transform.translate(
                            offset: Offset(
                              0,
                              (1 -
                                      CurvedAnimation(
                                        parent: _animationController,
                                        curve: const Interval(0.16, 0.9),
                                      ).value) *
                                  12,
                            ),
                            child: _ActionButton(
                              icon: Icons.info_outline,
                              label: 'Información',
                              onTap: () {
                                widget.onInfo?.call();
                                _toggleExpanded();
                              },
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            // Botón flotante principal (FAB)
            GestureDetector(
              onTap: _toggleExpanded,
              child: ScaleTransition(
                scale: Tween<double>(begin: 1.0, end: 0.96).animate(
                  CurvedAnimation(
                    parent: _animationController,
                    curve: const Interval(0.0, 0.6),
                  ),
                ),
                child: FloatingActionButton(
                  onPressed: _toggleExpanded,
                  backgroundColor: AppColors.primary,
                  elevation: _isExpanded ? 2 : 6,
                  child: AnimatedIcon(
                    icon: AnimatedIcons.menu_close,
                    progress: _animationController,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatefulWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _ActionButton({required this.icon, required this.label, this.onTap});

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton>
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
      end: 0.9,
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
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.8),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.primary.withOpacity(0.5),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.2),
                blurRadius: 8,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon, color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text(
                widget.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
