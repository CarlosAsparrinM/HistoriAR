import 'dart:convert';

import 'package:http/http.dart' as http;

import 'package:app_movil/config/environment.dart';
import '../models/user.dart';

class UserService {
  static const String _basePath = '/api/users';

  /// Obtiene el perfil del usuario autenticado
  Future<User> getMyProfile(String token) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}$_basePath/me');

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final userData = data['data'] ?? data;
      return User.fromJson(userData);
    } else {
      String message = 'Error al obtener el perfil';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  /// Obtiene los datos de un usuario específico (solo admin)
  Future<User> getUser(String userId, String token) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}$_basePath/$userId');

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final userData = data['data'] ?? data;
      return User.fromJson(userData);
    } else {
      String message = 'Error al obtener usuario';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  /// Actualiza el perfil del usuario
  Future<User> updateProfile({
    required String userId,
    required String token,
    String? name,
    String? email,
    String? profileImage,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}$_basePath/$userId');

    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (email != null) body['email'] = email;
    if (profileImage != null) body['profileImage'] = profileImage;

    final response = await http.put(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final userData = data['data'] ?? data;
      return User.fromJson(userData);
    } else {
      String message = 'Error al actualizar el perfil';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  /// Lista todos los usuarios (solo admin)
  Future<List<User>> listUsers(String token) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}$_basePath');

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final List<dynamic> users = data['data'] ?? data;
      return users
          .map((user) => User.fromJson(user as Map<String, dynamic>))
          .toList();
    } else {
      String message = 'Error al obtener usuarios';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  Future<List<Map<String, dynamic>>> getUserQuizAttempts({
    required String userId,
    required String token,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}$_basePath/$userId/quiz-attempts',
    );

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final items = data is Map<String, dynamic> ? data['items'] : null;
      if (items is List) {
        return items.whereType<Map<String, dynamic>>().toList();
      }
      return const [];
    } else {
      String message = 'Error al obtener intentos de quiz';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }
}
