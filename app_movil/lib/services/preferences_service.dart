import 'dart:convert';

import 'package:app_movil/config/environment.dart';
import 'package:http/http.dart' as http;

import '../models/user_preferences.dart';

class PreferencesService {
  static const String _basePath = '/api/users';

  /// Obtiene las preferencias del usuario
  Future<UserPreferences> getUserPreferences({
    required String userId,
    required String token,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}$_basePath/$userId/preferences',
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
      final preferencesData = data['data'] ?? data;
      return UserPreferences.fromJson(preferencesData);
    } else {
      String message = 'Error al obtener preferencias';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  /// Actualiza las preferencias del usuario
  Future<UserPreferences> updateUserPreferences({
    required String userId,
    required String token,
    required UserPreferences preferences,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}$_basePath/$userId/preferences',
    );

    final response = await http.put(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(preferences.toJson()),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final preferencesData = data['data'] ?? data;
      return UserPreferences.fromJson(preferencesData);
    } else {
      String message = 'Error al actualizar preferencias';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  /// Actualización parcial de preferencias (solo los campos proporcionados)
  Future<UserPreferences> partialUpdatePreferences({
    required String userId,
    required String token,
    bool? askForQuizzes,
    bool? notifications,
    bool? location,
    bool? arEffects,
    bool? sound,
    bool? highQuality,
    bool? offlineMode,
    bool? dataUsage,
    String? language,
    String? theme,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}$_basePath/$userId/preferences',
    );

    final body = <String, dynamic>{};
    if (askForQuizzes != null) body['askForQuizzes'] = askForQuizzes;
    if (notifications != null) body['notifications'] = notifications;
    if (location != null) body['location'] = location;
    if (arEffects != null) body['arEffects'] = arEffects;
    if (sound != null) body['sound'] = sound;
    if (highQuality != null) body['highQuality'] = highQuality;
    if (offlineMode != null) body['offlineMode'] = offlineMode;
    if (dataUsage != null) body['dataUsage'] = dataUsage;
    if (language != null) body['language'] = language;
    if (theme != null) body['theme'] = theme;

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
      final preferencesData = data['data'] ?? data;
      return UserPreferences.fromJson(preferencesData);
    } else {
      String message = 'Error al actualizar preferencias';
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
