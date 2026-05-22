import 'package:flutter/material.dart';

import '../styles/app_tokens.dart';

class AppFadeSwitcher extends StatelessWidget {
  final Widget child;

  const AppFadeSwitcher({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: AppDurations.normal,
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (widget, animation) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.02),
              end: Offset.zero,
            ).animate(animation),
            child: widget,
          ),
        );
      },
      child: child,
    );
  }
}
