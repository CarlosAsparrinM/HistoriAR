import 'dart:convert';

import 'package:app_movil/config/environment.dart';
import 'package:http/http.dart' as http;

/// Servicio para consumir la API de quizzes
class QuizService {
  static const String _basePath = '/api/quizzes';

  const QuizService();

  Future<Map<String, dynamic>?> getQuizForMonument({
    required String monumentId,
    required String token,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}$_basePath?monumentId=$monumentId',
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

      if (data is Map<String, dynamic> && data['items'] is List) {
        final items = data['items'] as List;
        if (items.isEmpty) return null;
        final first = items.first;
        if (first is Map<String, dynamic>) return first;
      }

      if (data is Map<String, dynamic>) {
        return data;
      }

      throw Exception('Formato inesperado de respuesta al obtener quiz');
    } else {
      String message = 'Error al obtener quiz';
      try {
        final data = jsonDecode(response.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    }
  }

  Future<Map<String, dynamic>> submitQuizAttempt({
    required String quizId,
    required List<Map<String, dynamic>> answers,
    required Duration timeSpent,
    required String token,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}$_basePath/$quizId/submit');

    final body = jsonEncode({
      'answers': answers,
      'timeSpent': timeSpent.inSeconds,
    });

    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: body,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw Exception('Formato inesperado de respuesta al enviar intento');
    } else {
      String message = 'Error al enviar intento de quiz';
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
