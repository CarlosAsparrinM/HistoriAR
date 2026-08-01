import 'package:app_movil/config/environment.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Environment API URL security', () {
    test('usa el host del emulador y puerto Docker solo en desarrollo', () {
      expect(
        Environment.validateApiBaseUrl(null, releaseMode: false),
        'http://10.0.2.2:4000',
      );
    });

    test('requiere configuración explícita en release', () {
      expect(
        () => Environment.validateApiBaseUrl(null, releaseMode: true),
        throwsStateError,
      );
    });

    test('rechaza HTTP en release', () {
      expect(
        () => Environment.validateApiBaseUrl(
          'http://api.example.com',
          releaseMode: true,
        ),
        throwsStateError,
      );
    });

    test('acepta HTTPS y normaliza la barra final', () {
      expect(
        Environment.validateApiBaseUrl(
          'https://api.example.com/',
          releaseMode: true,
        ),
        'https://api.example.com',
      );
    });
  });
}
