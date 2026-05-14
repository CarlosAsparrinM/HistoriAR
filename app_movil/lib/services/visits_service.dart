import 'dart:convert';
import 'dart:io';

import 'package:app_movil/config/environment.dart';
import 'package:app_movil/models/visit.dart';
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

  Future<String> registerVisit({
    required String userId,
    required String monumentId,
    required String token,
    int? durationMinutes,
    String? device,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/visits');

    final body = {
      'userId': userId,
      'monumentId': monumentId,
      'duration': durationMinutes,
      'device': device ?? _getPlatformDevice(),
    };

    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        _extractMessage(response.body, 'Error al registrar visita'),
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Formato inesperado de respuesta al registrar visita');
    }

    final id = decoded['id'] as String?;
    if (id == null) {
      throw Exception('No se recibió ID de visita');
    }

    return id;
  }

  Future<Visit> updateVisit({
    required String visitId,
    required String token,
    int? durationMinutes,
    int? rating,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/visits/$visitId');

    final body = <String, dynamic>{};
    if (durationMinutes != null) body['duration'] = durationMinutes;
    if (rating != null) body['rating'] = rating;

    final response = await http.put(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        _extractMessage(response.body, 'Error al actualizar visita'),
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Formato inesperado de respuesta al actualizar visita');
    }

    return Visit.fromJson(decoded);
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

  String _getPlatformDevice() {
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    if (Platform.isWindows) return 'windows';
    if (Platform.isMacOS) return 'macos';
    if (Platform.isLinux) return 'linux';
    return 'unknown';
  }
}
