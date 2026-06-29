import 'dart:async';
import 'dart:convert';

import 'package:app_movil/config/environment.dart';

import '../models/historical_data.dart';
import '../utils/http_interceptor.dart' as http;

/// Servicio responsable de obtener fichas históricas de monumentos desde la API.
class HistoricalDataService {
  HistoricalDataService({http.Client? client})
    : _client = client ?? http.Client();

  final http.Client _client;

  /// Obtiene todas las fichas históricas de un monumento específico.
  Future<List<HistoricalData>> fetchHistoricalDataByMonument(
    String monumentId, {
    String? token,
  }) async {
    try {
      final uri = Uri.parse(
        '${Environment.apiBaseUrl}/api/monuments/$monumentId/historical-data',
      );

      final headers = <String, String>{'Content-Type': 'application/json'};

      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await _client
          .get(uri, headers: headers)
          .timeout(const Duration(seconds: 10));
      await http.inspectResponse(response, headers: headers);

      if (response.statusCode == 200) {
        final List<dynamic> decoded =
            json.decode(response.body) as List<dynamic>;
        return decoded
            .map((e) => HistoricalData.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (response.statusCode == 404) {
        // Monumento sin fichas históricas
        return [];
      } else {
        throw Exception(
          'Error al cargar fichas históricas: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error al cargar fichas históricas: $e');
    }
  }

  /// Obtiene una ficha histórica específica por ID.
  Future<HistoricalData?> fetchHistoricalDataById(
    String id, {
    String? token,
  }) async {
    try {
      final uri = Uri.parse(
        '${Environment.apiBaseUrl}/api/historical-data/$id',
      );

      final headers = <String, String>{'Content-Type': 'application/json'};

      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await _client
          .get(uri, headers: headers)
          .timeout(const Duration(seconds: 10));
      await http.inspectResponse(response, headers: headers);

      if (response.statusCode == 200) {
        final decoded = json.decode(response.body) as Map<String, dynamic>;
        return HistoricalData.fromJson(decoded);
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
}
