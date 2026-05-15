import 'package:flutter_dotenv/flutter_dotenv.dart';

class Environment {
  /// URL base de la API del backend
  static String get apiBaseUrl {
    return dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';
  }

  /// Timeout para las peticiones de API (en milisegundos)
  static int get apiTimeout {
    return int.tryParse(dotenv.env['API_TIMEOUT'] ?? '30000') ?? 30000;
  }

  /// Ambiente de ejecución (development, staging, production)
  static String get environment {
    return dotenv.env['ENVIRONMENT'] ?? 'development';
  }

  /// Habilitar modo debug
  static bool get debugMode {
    return dotenv.env['DEBUG_MODE']?.toLowerCase() == 'true';
  }

  /// Habilitar características de AR
  static bool get arEnabled {
    return dotenv.env['AR_ENABLED']?.toLowerCase() != 'false';
  }

  /// Intervalo de actualización de ubicación (en milisegundos)
  static int get locationUpdateInterval {
    return int.tryParse(dotenv.env['LOCATION_UPDATE_INTERVAL'] ?? '5000') ??
        5000;
  }

  /// Precisión de ubicación (best, high, medium, low, bestForNavigation)
  static String get locationAccuracy {
    return dotenv.env['LOCATION_ACCURACY'] ?? 'best';
  }

  /// Verificar si está en modo desarrollo
  static bool isDevelopment() => environment == 'development';

  /// Verificar si está en modo staging
  static bool isStaging() => environment == 'staging';

  /// Verificar si está en modo producción
  static bool isProduction() => environment == 'production';
}
