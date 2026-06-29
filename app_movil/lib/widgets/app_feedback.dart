import 'package:flutter/material.dart';

import '../styles/app_colors.dart';

enum AppFeedbackType { success, info, warning, error, loading }

class AppFeedback {
  static void show(
    BuildContext context, {
    required String message,
    String? title,
    AppFeedbackType type = AppFeedbackType.info,
    Duration? duration,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    final style = _styleFor(type);
    final effectiveDuration =
        duration ??
        (type == AppFeedbackType.loading
            ? const Duration(seconds: 10)
            : const Duration(seconds: 3));

    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: effectiveDuration,
        backgroundColor: style.background,
        content: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(style.icon, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (title != null)
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  Text(message, style: const TextStyle(color: Colors.white)),
                ],
              ),
            ),
            if (type == AppFeedbackType.loading) ...[
              const SizedBox(width: 8),
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static void success(BuildContext context, String message, {String? title}) {
    show(
      context,
      message: message,
      title: title,
      type: AppFeedbackType.success,
    );
  }

  static void info(BuildContext context, String message, {String? title}) {
    show(context, message: message, title: title, type: AppFeedbackType.info);
  }

  static void warning(BuildContext context, String message, {String? title}) {
    show(
      context,
      message: message,
      title: title,
      type: AppFeedbackType.warning,
    );
  }

  static void error(BuildContext context, String message, {String? title}) {
    show(context, message: message, title: title, type: AppFeedbackType.error);
  }

  static void loading(BuildContext context, String message, {String? title}) {
    show(
      context,
      message: message,
      title: title,
      type: AppFeedbackType.loading,
    );
  }

  static Future<bool> confirm(
    BuildContext context, {
    required String title,
    required String message,
    String cancelText = 'Cancelar',
    String confirmText = 'Confirmar',
    bool isDestructive = false,
    IconData icon = Icons.help_outline,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: Icon(
          icon,
          color: isDestructive ? AppColors.danger : AppColors.primary,
        ),
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(cancelText),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: isDestructive
                  ? AppColors.danger
                  : AppColors.primary,
            ),
            child: Text(confirmText),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  static Future<void> showLoadingDialog(
    BuildContext context, {
    String title = 'Procesando',
    String message = 'Por favor espera...',
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: Text(title),
          content: Row(
            children: [
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      ),
    );
  }

  static void hideLoadingDialog(BuildContext context) {
    final navigator = Navigator.of(context, rootNavigator: true);
    if (navigator.canPop()) {
      navigator.pop();
    }
  }
}

class _FeedbackStyle {
  final Color background;
  final IconData icon;

  const _FeedbackStyle({required this.background, required this.icon});
}

_FeedbackStyle _styleFor(AppFeedbackType type) {
  return switch (type) {
    AppFeedbackType.success => const _FeedbackStyle(
      background: AppColors.success,
      icon: Icons.check_circle_outline,
    ),
    AppFeedbackType.info => const _FeedbackStyle(
      background: AppColors.secondary,
      icon: Icons.info_outline,
    ),
    AppFeedbackType.warning => const _FeedbackStyle(
      background: AppColors.warning,
      icon: Icons.warning_amber_rounded,
    ),
    AppFeedbackType.error => const _FeedbackStyle(
      background: AppColors.danger,
      icon: Icons.error_outline,
    ),
    AppFeedbackType.loading => const _FeedbackStyle(
      background: AppColors.textSecondary,
      icon: Icons.hourglass_top,
    ),
  };
}
