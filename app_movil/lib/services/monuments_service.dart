import 'dart:async';
import 'dart:convert';

import 'package:app_movil/config/environment.dart';

import '../models/monument.dart';
import '../utils/http_interceptor.dart' as http;

/// Servicio responsable de obtener monumentos desde la API.
/// Incluye caché, validación y retry logic para mejor performance y confiabilidad.
class MonumentsService {
  MonumentsService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  // Caché de monumentos
  List<Monument>? _cachedMonuments;
  DateTime? _cacheTimestamp;
  static const Duration _cacheDuration = Duration(hours: 1);

  // Retry configuration
  static const int _maxRetries = 3;
  static const Duration _retryDelay = Duration(milliseconds: 500);
  static const int _pageSize = 100;

  /// Obtiene monumentos con soporte para caché y reintentos.
  /// Si [forceRefresh] es true, ignora la caché y obtiene datos frescos.
  Future<List<Monument>> fetchMonuments({bool forceRefresh = false}) async {
    // Retornar caché si está disponible y válida
    if (!forceRefresh && _isCacheValid()) {
      return _cachedMonuments!;
    }

    // Intentar obtener del API con reintentos
    List<Monument>? monuments;
    for (int i = 0; i < _maxRetries; i++) {
      try {
        monuments = await _fetchMonumentsFromAPI();
        break;
      } catch (e) {
        if (i < _maxRetries - 1) {
          await Future.delayed(_retryDelay);
        } else {
          rethrow;
        }
      }
    }

    if (monuments != null) {
      _cachedMonuments = monuments;
      _cacheTimestamp = DateTime.now();
      return monuments;
    }

    throw Exception(
      'No se pudieron cargar los monumentos después de $_maxRetries intentos.',
    );
  }

  /// Obtiene un monumento específico por ID.
  Future<Monument?> fetchMonumentById(String id) async {
    try {
      final uri = Uri.parse('${Environment.apiBaseUrl}/api/monuments/$id');
      final response = await _client
          .get(uri)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        return null;
      }

      final decoded = json.decode(response.body) as Map<String, dynamic>;
      return Monument.fromJson(decoded);
    } catch (e) {
      return null;
    }
  }

  /// Valida que un monumento tenga datos de modelo 3D válidos.
  /// Retorna true si el monumento tiene:
  /// - Nombre no vacío
  /// - Coordenadas válidas
  /// - Al menos una URL de modelo 3D (directa o S3 key)
  bool isMonumentValid(Monument monument) {
    final hasDirectUrl = (monument.model3DUrl ?? '').isNotEmpty;
    final hasS3Key = (monument.s3ModelKey ?? '').isNotEmpty;
    final hasName = (monument.name).isNotEmpty;
    final hasPosition =
        monument.position.latitude != 0 && monument.position.longitude != 0;

    return hasName && hasPosition && (hasDirectUrl || hasS3Key);
  }

  /// Filtra monumentos válidos de una lista.
  List<Monument> filterValidMonuments(List<Monument> monuments) {
    return monuments.where((m) => isMonumentValid(m)).toList();
  }

  /// Limpia la caché de monumentos.
  void clearCache() {
    _cachedMonuments = null;
    _cacheTimestamp = null;
  }

  // === Private methods ===

  bool _isCacheValid() {
    if (_cachedMonuments == null || _cacheTimestamp == null) {
      return false;
    }
    final now = DateTime.now();
    final elapsed = now.difference(_cacheTimestamp!);
    return elapsed < _cacheDuration;
  }

  Future<List<Monument>> _fetchMonumentsFromAPI() async {
    final monuments = <Monument>[];
    int page = 1;
    int? total;

    while (true) {
      final uri = Uri.parse('${Environment.apiBaseUrl}/api/monuments').replace(
        queryParameters: {
          'page': page.toString(),
          'limit': _pageSize.toString(),
        },
      );

      final response = await _client
          .get(uri)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        throw Exception(
          'Error HTTP al obtener monumentos: ${response.statusCode}',
        );
      }

      final decoded = json.decode(response.body) as Map<String, dynamic>;
      total ??= (decoded['total'] as num?)?.toInt();
      final items = (decoded['items'] as List<dynamic>? ?? []);

      monuments.addAll(
        items
            .where((raw) {
              final map = raw as Map<String, dynamic>;
              final status = map['status']?.toString().trim().toLowerCase();
              return status != 'oculto';
            })
            .map((raw) => Monument.fromJson(raw as Map<String, dynamic>)),
      );

      final receivedCount = items.length;
      final fetchedAllItems = total != null && monuments.length >= total;

      if (receivedCount < _pageSize || fetchedAllItems) {
        break;
      }

      page += 1;
    }

    return monuments;
  }
}
