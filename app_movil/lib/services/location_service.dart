import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/monument.dart';
import '../models/tour.dart';
import 'api_config.dart';

class LocationService {
  const LocationService();

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

  Future<List<Monument>> getNearbyMonuments({
    required double latitude,
    required double longitude,
    double maxDistance = 1000,
  }) async {
    final uri = Uri.parse(
      '$apiBaseUrl/api/location/nearby-monuments?lat=$latitude&lng=$longitude&maxDistance=$maxDistance',
    );

    final response = await http.get(uri);
    final data = _decodeMapResponse(
      response,
      'Error al obtener monumentos cercanos',
    );
    final items = data['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map<String, dynamic>>()
        .map((item) => Monument.fromJson(item))
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
