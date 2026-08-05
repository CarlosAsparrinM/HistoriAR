import 'package:flutter/foundation.dart';

class WebConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:4000/api',
  );

  static Uri get apiUri {
    final uri = Uri.tryParse(apiBaseUrl);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw StateError('API_BASE_URL no es una URL válida.');
    }
    if (kReleaseMode && uri.scheme != 'https') {
      throw StateError('API_BASE_URL debe usar HTTPS en producción.');
    }
    return uri;
  }
}
