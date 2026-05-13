import 'dart:convert';

import 'package:app_movil/config/environment.dart';
import 'package:http/http.dart' as http;

class VisitsService {
  const VisitsService();

  Future<List<Map<String, dynamic>>> getVisitsByUser({
    required String userId,
    required String token,
    int limit = 10,
  }) async {
    final uri = Uri.parse(
      '${Environment.apiBaseUrl}/api/visits?userId=$userId&limit=$limit',
    );

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        _extractMessage(response.body, 'Error al obtener visitas'),
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Formato inesperado de respuesta de visitas');
    }

    final items = decoded['items'];
    if (items is! List) return const [];

    return items.whereType<Map<String, dynamic>>().toList();
  }

  String _extractMessage(String body, String fallbackMessage) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map && decoded['message'] is String) {
        return decoded['message'] as String;
      }
    } catch (_) {}
    return fallbackMessage;
  }
}
