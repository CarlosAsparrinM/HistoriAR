import 'dart:convert';

import 'package:app_movil/config/environment.dart';
import '../utils/http_interceptor.dart' as http;

import '../models/tour.dart';

class ToursService {
  const ToursService();

  static const int _pageSize = 50;

  Future<TourContextResponse> getContextForLocation({
    required double latitude,
    required double longitude,
  }) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/location/context')
        .replace(
          queryParameters: {
            'lat': latitude.toString(),
            'lng': longitude.toString(),
            'page': '1',
            'limit': _pageSize.toString(),
          },
        );

    final response = await http.get(uri);
    final data = _decodeMapResponse(response, 'Error al obtener el contexto');

    return TourContextResponse.fromJson(data);
  }

  Future<List<TourItem>> getAllTours({bool activeOnly = true}) async {
    return _fetchTourPages(
      (page) => Uri.parse('${Environment.apiBaseUrl}/api/tours').replace(
        queryParameters: {
          if (activeOnly) 'isActive': 'true',
          'page': page.toString(),
          'limit': _pageSize.toString(),
          'populate': 'true',
        },
      ),
    );
  }

  Future<List<TourItem>> getToursByInstitution(
    String institutionId, {
    bool activeOnly = true,
  }) async {
    return _fetchTourPages(
      (page) => Uri.parse(
        '${Environment.apiBaseUrl}/api/tours/institution/$institutionId',
      ).replace(
        queryParameters: {
          'activeOnly': activeOnly.toString(),
          'page': page.toString(),
          'limit': _pageSize.toString(),
          'populate': 'true',
        },
      ),
    );
  }

  /// Obtener un tour específico por ID (con detalles completos)
  Future<TourItem> getTourById(String tourId) async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/tours/$tourId');

    final response = await http.get(uri);
    final data = _decodeMapResponse(response, 'Error al obtener tour');

    return TourItem.fromJson(data);
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

  Future<List<TourItem>> _fetchTourPages(Uri Function(int page) buildUri) async {
    final tours = <TourItem>[];
    int page = 1;
    int? total;

    while (true) {
      final response = await http.get(buildUri(page));
      final data = _decodeMapResponse(response, 'Error al obtener tours');
      total ??= (data['total'] as num?)?.toInt();

      final items = data['items'];
      if (items is! List || items.isEmpty) break;

      tours.addAll(
        items
            .whereType<Map<String, dynamic>>()
            .map((item) => TourItem.fromJson(item)),
      );

      final fetchedAllItems = total != null && tours.length >= total;
      if (items.length < _pageSize || fetchedAllItems) break;

      page += 1;
    }

    return tours;
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
