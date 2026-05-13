import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'api_config.dart';

class AuthService {
  static const String _basePath = '/api/auth';
  static const int _timeoutSeconds = 30;
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  /// Extrae mensaje de error del response de forma segura
  String _extractErrorMessage(String responseBody, String defaultMessage) {
    try {
      final data = jsonDecode(responseBody);
      if (data is Map && data['message'] is String) {
        return data['message'] as String;
      }
    } catch (_) {
      // Si falla el parseo, devolver el mensaje por defecto
    }
    return defaultMessage;
  }

  /// Convierte excepciones de red a mensajes amigables
  String _handleNetworkError(dynamic error) {
    if (error is http.ClientException) {
      if (error.toString().contains('Connection refused')) {
        return 'No se puede conectar con el servidor. Verifica tu conexión.';
      }
      if (error.toString().contains('Connection reset')) {
        return 'Conexión perdida con el servidor.';
      }
      return 'Error de conexión: ${error.message}';
    }
    if (error.toString().contains('SocketException')) {
      return 'Error de red. Verifica tu conexión a internet.';
    }
    if (error.toString().contains('TimeoutException')) {
      return 'Timeout: El servidor tardó demasiado en responder.';
    }
    return 'Error desconocido: ${error.toString()}';
  }

  Future<String> login({
    required String email,
    required String password,
  }) async {
    final uri = Uri.parse('$apiBaseUrl$_basePath/login');

    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(
        const Duration(seconds: _timeoutSeconds),
        onTimeout: () => throw Exception('Timeout: El servidor tardó más de 30 segundos en responder'),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        final token = data['token'] as String?;
        if (token == null) {
          throw Exception('Respuesta inesperada del servidor: token no recibido');
        }
        return token;
      } else if (response.statusCode == 401) {
        throw Exception('Credenciales inválidas');
      } else if (response.statusCode == 500) {
        throw Exception('Error del servidor. Intenta más tarde.');
      } else {
        String message = 'Error al iniciar sesión (código: ${response.statusCode})';
        message = _extractErrorMessage(response.body, message);
        throw Exception(message);
      }
    } on http.ClientException catch (e) {
      throw Exception(_handleNetworkError(e));
    } on FormatException catch (e) {
      throw Exception('Error al procesar la respuesta del servidor: ${e.message}');
    } on Exception {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado: ${e.toString()}');
    }
  }

  /// Valida un token existente contra /api/auth/validate.
  /// Si es válido, devuelve true; si no, lanza una excepción.
  Future<bool> validateToken(String token) async {
    final uri = Uri.parse('$apiBaseUrl$_basePath/validate');

    try {
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(
        const Duration(seconds: _timeoutSeconds),
        onTimeout: () => throw Exception('Timeout: El servidor tardó más de 30 segundos en responder'),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      } else if (response.statusCode == 401) {
        throw Exception('Token expirado o inválido');
      } else if (response.statusCode == 500) {
        throw Exception('Error del servidor');
      } else {
        String message = 'Error al validar token (código: ${response.statusCode})';
        message = _extractErrorMessage(response.body, message);
        throw Exception(message);
      }
    } on http.ClientException catch (e) {
      throw Exception(_handleNetworkError(e));
    } on Exception {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado: ${e.toString()}');
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final uri = Uri.parse('$apiBaseUrl$_basePath/register');

    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'email': email, 'password': password}),
      ).timeout(
        const Duration(seconds: _timeoutSeconds),
        onTimeout: () => throw Exception('Timeout: El servidor tardó más de 30 segundos en responder'),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return;
      } else if (response.statusCode == 400) {
        String message = 'Datos inválidos';
        message = _extractErrorMessage(response.body, message);
        throw Exception(message);
      } else if (response.statusCode == 409) {
        throw Exception('El correo ya está registrado');
      } else if (response.statusCode == 500) {
        throw Exception('Error del servidor. Intenta más tarde.');
      } else {
        String message = 'Error al crear la cuenta (código: ${response.statusCode})';
        message = _extractErrorMessage(response.body, message);
        throw Exception(message);
      }
    } on http.ClientException catch (e) {
      throw Exception(_handleNetworkError(e));
    } on FormatException catch (e) {
      throw Exception('Error al procesar la respuesta del servidor: ${e.message}');
    } on Exception {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado: ${e.toString()}');
    }
  }

  Future<String> loginWithGoogle() async {
    try {
      // Paso 1: Obtener cuenta de Google
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Inicio de sesión cancelado por el usuario');
      }

      // Paso 2: Obtener autenticación de Google
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception('No se pudo obtener el token de Google. Intenta de nuevo.');
      }

      // Paso 3: Enviar token al backend
      final uri = Uri.parse('$apiBaseUrl$_basePath/google');
      
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      ).timeout(
        const Duration(seconds: _timeoutSeconds),
        onTimeout: () => throw Exception('Timeout: El servidor tardó más de 30 segundos en responder'),
      );

      // Paso 4: Procesar respuesta
      if (response.statusCode >= 200 && response.statusCode < 300) {
        try {
          final data = jsonDecode(response.body);
          final token = data['token'] as String?;
          
          if (token == null) {
            throw Exception('Respuesta inesperada del servidor: token no recibido');
          }
          return token;
        } on FormatException {
          throw Exception('Respuesta inválida del servidor');
        }
      } else if (response.statusCode == 401) {
        throw Exception('Token de Google rechazado. Intenta de nuevo.');
      } else if (response.statusCode == 500) {
        throw Exception('Error del servidor. Intenta más tarde.');
      } else {
        String message = 'Error en la autenticación con Google (código: ${response.statusCode})';
        message = _extractErrorMessage(response.body, message);
        throw Exception(message);
      }
    } on Exception catch (e) {
      // Si es una excepción conocida, relanzarla
      if (e.toString().contains('cancelado')) {
        rethrow; // No mostrar snackbar si el usuario cancela
      }
      
      // Manejar errores de red específicos
      if (e.toString().contains('SocketException') || 
          e.toString().contains('ClientException')) {
        throw Exception(_handleNetworkError(e));
      }
      
      rethrow;
    } catch (e) {
      // Errores no esperados
      throw Exception('Error inesperado: ${e.toString()}');
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
  }
}