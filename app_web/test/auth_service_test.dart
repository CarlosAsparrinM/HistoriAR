import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:historiar_web/services/auth_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  group('AuthService Web', () {
    test('login procesa correctamente credenciales válidas y retorna token', () async {
      final client = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          final body = jsonDecode(request.body);
          if (body['email'] == 'test@ejemplo.pe' && body['password'] == '123456') {
            return http.Response(
              jsonEncode({
                'token': 'jwt_token_mock',
                'user': {'id': 'u-1', 'name': 'Usuario Test', 'email': 'test@ejemplo.pe'},
              }),
              200,
            );
          }
        }
        return http.Response(jsonEncode({'message': 'Credenciales inválidas'}), 401);
      });

      final authService = AuthService(client: client);
      final result = await authService.login(
        email: 'test@ejemplo.pe',
        password: '123456',
      );

      expect(result['token'], 'jwt_token_mock');
      expect(authService.token, 'jwt_token_mock');
      expect(authService.isAuthenticated, isTrue);
      expect(authService.currentUser?['name'], 'Usuario Test');
    });

    test('register envía campos correctamente', () async {
      late http.Request sentRequest;
      final client = MockClient((request) async {
        sentRequest = request;
        return http.Response(jsonEncode({'message': 'Creado'}), 201);
      });

      final authService = AuthService(client: client);
      await authService.register(
        name: 'Nuevo Usuario',
        email: 'nuevo@ejemplo.pe',
        password: 'password123',
        district: 'Miraflores',
      );

      expect(sentRequest.url.path.endsWith('/auth/register'), isTrue);
      final payload = jsonDecode(sentRequest.body);
      expect(payload['name'], 'Nuevo Usuario');
      expect(payload['email'], 'nuevo@ejemplo.pe');
      expect(payload['district'], 'Miraflores');
    });

    test('logout limpia memoria de sesión', () {
      final authService = AuthService();
      authService.logout();
      expect(authService.isAuthenticated, isFalse);
      expect(authService.token, isNull);
    });
  });
}
