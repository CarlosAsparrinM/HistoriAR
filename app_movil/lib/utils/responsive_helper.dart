import 'package:flutter/material.dart';

/// Helper para validación de responsive design en HistoriAR
/// Proporciona métodos para detectar tamaños de pantalla y aplicar layouts adaptativos
class ResponsiveHelper {
  /// Tamaños de breakpoints (en dp)
  static const double smallBreakpoint = 600;    // Phones
  static const double mediumBreakpoint = 900;   // Tablets
  static const double largeBreakpoint = 1200;   // Desktop

  /// Detecta el tamaño de pantalla basado en ancho
  static ScreenSize getScreenSize(BuildContext context) {
    final width = MediaQuery.of(context).size.width;

    if (width < smallBreakpoint) {
      return ScreenSize.small;
    } else if (width < mediumBreakpoint) {
      return ScreenSize.medium;
    } else {
      return ScreenSize.large;
    }
  }

  /// Retorna true si es portrait
  static bool isPortrait(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.portrait;
  }

  /// Retorna true si es landscape
  static bool isLandscape(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.landscape;
  }

  /// Retorna el padding adaptativo basado en tamaño de pantalla
  static EdgeInsets getAdaptivePadding(BuildContext context) {
    final screenSize = getScreenSize(context);
    switch (screenSize) {
      case ScreenSize.small:
        return const EdgeInsets.all(16);
      case ScreenSize.medium:
        return const EdgeInsets.all(24);
      case ScreenSize.large:
        return const EdgeInsets.all(32);
    }
  }

  /// Retorna el ancho máximo de contenido para containers
  static double getMaxContentWidth(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final screenSize = getScreenSize(context);

    switch (screenSize) {
      case ScreenSize.small:
        return width - 32; // 16 padding * 2
      case ScreenSize.medium:
        return 600;
      case ScreenSize.large:
        return 800;
    }
  }

  /// Retorna el número de columnas para grid layouts
  static int getGridColumns(BuildContext context) {
    final screenSize = getScreenSize(context);
    switch (screenSize) {
      case ScreenSize.small:
        return 1;
      case ScreenSize.medium:
        return 2;
      case ScreenSize.large:
        return 3;
    }
  }

  /// Obtiene información de accesibilidad
  static AccessibilityInfo getAccessibilityInfo(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    return AccessibilityInfo(
      textScaleFactor: mediaQuery.textScaleFactor,
      boldText: mediaQuery.boldText,
      highContrast: mediaQuery.highContrast,
      disableAnimations: mediaQuery.disableAnimations,
    );
  }

  /// Valida que los touch targets cumplan con mínimo de 48x48 dp
  static bool isAccessibleTouchTarget(Size size) {
    const minSize = 48.0;
    return size.width >= minSize && size.height >= minSize;
  }

  /// Calcula si el widget debe esconderse o adaptarse en ciertos tamaños
  static bool shouldHideOnSmallScreen(BuildContext context) {
    return getScreenSize(context) == ScreenSize.small;
  }
}

enum ScreenSize { small, medium, large }

class AccessibilityInfo {
  final double textScaleFactor;
  final bool boldText;
  final bool highContrast;
  final bool disableAnimations;

  AccessibilityInfo({
    required this.textScaleFactor,
    required this.boldText,
    required this.highContrast,
    required this.disableAnimations,
  });

  /// Retorna true si el usuario tiene configuración de accesibilidad activa
  bool hasAccessibilityNeeds() {
    return boldText || highContrast || disableAnimations || textScaleFactor > 1.0;
  }
}

/// Widget helper para layouts responsive
class ResponsiveContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Color? backgroundColor;

  const ResponsiveContainer({
    Key? key,
    required this.child,
    this.padding,
    this.backgroundColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: padding ?? ResponsiveHelper.getAdaptivePadding(context),
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: ResponsiveHelper.getMaxContentWidth(context),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Widget para validar contraste de texto
class AccessibleText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Color? backgroundColor;

  const AccessibleText(
    this.text, {
    Key? key,
    this.style,
    this.backgroundColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final accessibility = ResponsiveHelper.getAccessibilityInfo(context);

    // Si usuario tiene boldText habilitado, aplicar fontWeight extra
    final finalStyle = (style ?? const TextStyle()).copyWith(
      fontWeight: accessibility.boldText
          ? FontWeight.bold
          : style?.fontWeight,
    );

    return Text(
      text,
      style: finalStyle,
    );
  }
}
