import 'dart:convert';

import 'package:app_movil/config/environment.dart';
import '../utils/http_interceptor.dart' as http;

class SessionsService {
  const SessionsService();

  Future<Map<String, dynamic>> startSession({
    required String tourId,
    required String token,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/tours/$tourId/start');

    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error al iniciar sesión de tour');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> stopSession({
    required String sessionId,
    required String token,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}/api/tours/sessions/$sessionId/stop',
    );

    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error al finalizar sesión de tour');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> rateSession({
    required String sessionId,
    required int rating,
    required String token,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}/api/tours/sessions/$sessionId/rate',
    );

    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'rating': rating}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error al calificar sesión de tour');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getMySessions({
    required String token,
    int limit = 20,
    bool activeOnly = false,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/tours/sessions/me')
        .replace(
          queryParameters: {
            'limit': limit.toString(),
            if (activeOnly) 'activeOnly': 'true',
          },
        );

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error al obtener sesiones de tour');
    }

    final decoded = jsonDecode(response.body);
    final items = decoded['items'];
    if (items is! List) return [];
    return items.whereType<Map<String, dynamic>>().toList();
  }
}
