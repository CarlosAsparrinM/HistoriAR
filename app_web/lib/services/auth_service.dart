import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/web_config.dart';
import 'session_storage_helper.dart';

class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? _currentToken;
  Map<String, dynamic>? _currentUser;

  String? get token => _currentToken ?? SessionStorageHelper.getToken();
  bool get isAuthenticated => token != null && token!.isNotEmpty;
  Map<String, dynamic>? get currentUser => _currentUser;

  Future<bool> initSession() async {
    final storedToken = SessionStorageHelper.getToken();
    if (storedToken == null || storedToken.isEmpty) {
      _currentToken = null;
      _currentUser = null;
      return false;
    }

    try {
      final isValid = await validateToken(storedToken);
      if (isValid) {
        _currentToken = storedToken;
        return true;
      } else {
        logout();
        return false;
      }
    } catch (_) {
      logout();
      return false;
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final base = WebConfig.apiUri;
    final url = base.replace(path: '${base.path}/auth/login');

    final response = await _client.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    ).timeout(const Duration(seconds: 12));

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final token = body['token'] as String?;
      if (token == null || token.isEmpty) {
        throw const AuthException('No se recibió el token de autenticación.');
      }
      _currentToken = token;
      _currentUser = body['user'] as Map<String, dynamic>?;
      SessionStorageHelper.saveToken(token);
      return body;
    } else if (response.statusCode == 401) {
      throw const AuthException('Correo o contraseña incorrectos.');
    } else {
      final errorMsg = _extractErrorMessage(response.body, 'Error al iniciar sesión.');
      throw AuthException(errorMsg);
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? district,
  }) async {
    final base = WebConfig.apiUri;
    final url = base.replace(path: '${base.path}/auth/register');

    final payload = <String, dynamic>{
      'name': name,
      'email': email,
      'password': password,
    };
    if (district != null && district.trim().isNotEmpty) {
      payload['district'] = district.trim();
    }

    final response = await _client.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    ).timeout(const Duration(seconds: 12));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    } else if (response.statusCode == 409) {
      throw const AuthException('El correo ya se encuentra registrado.');
    } else {
      final errorMsg = _extractErrorMessage(response.body, 'Error al registrar usuario.');
      throw AuthException(errorMsg);
    }
  }

  Future<bool> validateToken(String token) async {
    final base = WebConfig.apiUri;
    final url = base.replace(path: '${base.path}/auth/validate');

    final response = await _client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      if (body['user'] != null) {
        _currentUser = body['user'] as Map<String, dynamic>?;
      }
      return true;
    }
    return false;
  }

  void logout() {
    _currentToken = null;
    _currentUser = null;
    SessionStorageHelper.clearToken();
  }

  String _extractErrorMessage(String body, String defaultMessage) {
    try {
      final parsed = jsonDecode(body);
      if (parsed is Map && parsed['message'] is String) {
        return parsed['message'] as String;
      }
    } catch (_) {}
    return defaultMessage;
  }
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
