import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/tour.dart';
import 'api_config.dart';

class ToursService {
  const ToursService();

  Future<TourContextResponse> getContextForLocation({
    required double latitude,
    required double longitude,
  }) async {
    final uri = Uri.parse(
      '$apiBaseUrl/api/location/context?lat=$latitude&lng=$longitude',
    );

    final response = await http.get(uri);
    final data = _decodeMapResponse(response, 'Error al obtener el contexto');

    return TourContextResponse.fromJson(data);
  }

  Future<List<TourItem>> getAllTours({bool activeOnly = true}) async {
    final uri = Uri.parse(
      '$apiBaseUrl/api/tours${activeOnly ? '?isActive=true' : ''}',
    );

    final response = await http.get(uri);
    final data = _decodeMapResponse(response, 'Error al obtener tours');

    final items = data['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map<String, dynamic>>()
        .map((item) => TourItem.fromJson(item))
        .toList();
  }

  Future<List<TourItem>> getToursByInstitution(
    String institutionId, {
    bool activeOnly = true,
  }) async {
    final uri = Uri.parse(
      '$apiBaseUrl/api/tours/institution/$institutionId?activeOnly=$activeOnly',
    );

    final response = await http.get(uri);
    final data = _decodeMapResponse(response, 'Error al obtener tours');

    final items = data['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map<String, dynamic>>()
        .map((item) => TourItem.fromJson(item))
        .toList();
  }

  Map<String, dynamic> _decodeMapResponse(
    http.Response response,
    String fallbackMessage,
  ) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_extractMessage(response.body, fallbackMessage));
    }

    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }

    throw Exception('Formato inesperado de respuesta del servidor');
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
