import 'dart:convert';

import 'package:app_movil/config/environment.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import '../models/monument.dart';
import 'location_service.dart';

/// Servicio responsable de obtener monumentos desde la API.
/// Prioriza monumentos cercanos por ubicación del usuario.
class MonumentsService {
  MonumentsService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  final LocationService _locationService = const LocationService();

  /// Obtiene monumentos cercanos a la ubicación actual del usuario.
  /// Si no se puede obtener la ubicación, devuelve todos los monumentos.
  Future<List<Monument>> fetchMonuments() async {
    try {
      // Intentar obtener la ubicación actual
      final position = await _getCurrentPosition();

      // Si tenemos ubicación, obtener monumentos cercanos
      try {
        return await _locationService.getNearbyMonuments(
          latitude: position.latitude,
          longitude: position.longitude,
          maxDistance: 20000, // 20km en metros
        );
      } catch (e) {
        // Si falla obtener monumentos cercanos, usar fallback
        print('⚠️ Error obteniendo monumentos cercanos: $e');
        return await _fetchAllMonuments();
      }
    } catch (e) {
      // Si no se puede obtener ubicación, devolver todos los monumentos
      print('⚠️ No se pudo obtener ubicación: $e');
      return await _fetchAllMonuments();
    }
  }

  /// Obtiene todos los monumentos sin filtro de ubicación
  Future<List<Monument>> _fetchAllMonuments() async {
    final uri = Uri.parse('${Environment.apiBaseUrl}/api/monuments');
    final response = await _client.get(uri);

    if (response.statusCode != 200) {
      throw Exception(
        'Error HTTP al obtener monumentos: ${response.statusCode}',
      );
    }

    final decoded = json.decode(response.body) as Map<String, dynamic>;
    final items = (decoded['items'] as List<dynamic>? ?? []);

    return items
        .where((raw) {
          final map = raw as Map<String, dynamic>;
          final status = map['status']?.toString().trim().toLowerCase();
          return status != 'oculto';
        })
        .map((raw) => Monument.fromJson(raw as Map<String, dynamic>))
        .toList();
  }

  /// Obtiene la posición actual del usuario
  Future<Position> _getCurrentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Servicio de ubicación desactivado');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception('Permiso de ubicación denegado');
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }
}
