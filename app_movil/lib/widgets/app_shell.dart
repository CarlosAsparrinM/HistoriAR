import 'package:flutter/material.dart';

import '../styles/app_colors.dart';
import '../styles/app_tokens.dart';

class AppShell extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool useSafeArea;

  const AppShell({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.actions,
    this.padding = const EdgeInsets.fromLTRB(
      AppSpacing.md,
      AppSpacing.sm,
      AppSpacing.md,
      AppSpacing.md,
    ),
    this.useSafeArea = true,
  });

  @override
  Widget build(BuildContext context) {
    final body = Padding(padding: padding, child: child);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        titleSpacing: AppSpacing.md,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title),
            if (subtitle != null)
              Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        actions: actions,
      ),
      body: useSafeArea ? SafeArea(child: body) : body,
    );
  }
}
