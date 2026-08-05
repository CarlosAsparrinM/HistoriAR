import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/web_config.dart';
import '../models/historical_entry.dart';
import '../models/monument.dart';
import 'auth_service.dart';

class PublicApi {
  PublicApi({http.Client? client, this.authService})
      : _client = client ?? http.Client();

  final http.Client _client;
  final AuthService? authService;

  Map<String, String> _buildHeaders() {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final token = authService?.token;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<List<Monument>> getMonuments({String? search, String? culture, String? category}) async {
    final query = <String, String>{'limit': '100'};
    if (search != null && search.trim().isNotEmpty) query['text'] = search.trim();
    if (culture != null && culture.trim().isNotEmpty) query['culture'] = culture.trim();
    if (category != null && category.trim().isNotEmpty) query['category'] = category.trim();

    final base = WebConfig.apiUri;
    final uri = base.replace(path: '${base.path}/monuments', queryParameters: query);
    final response = await _client
        .get(uri, headers: _buildHeaders())
        .timeout(const Duration(seconds: 12));

    if (response.statusCode == 401 || response.statusCode == 403) {
      authService?.logout();
      throw const PublicApiException('Sesión expirada. Inicia sesión nuevamente.');
    }
    if (response.statusCode != 200) {
      throw PublicApiException('No se pudo cargar el catálogo (${response.statusCode}).');
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return (body['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Monument.fromJson)
        .toList(growable: false);
  }

  Future<Monument> getMonument(String id) async {
    if (!RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(id)) {
      throw const PublicApiException('Identificador de monumento inválido.');
    }
    final base = WebConfig.apiUri;
    final response = await _client
        .get(base.replace(path: '${base.path}/monuments/$id'), headers: _buildHeaders())
        .timeout(const Duration(seconds: 12));

    if (response.statusCode == 401 || response.statusCode == 403) {
      authService?.logout();
      throw const PublicApiException('Sesión expirada. Inicia sesión nuevamente.');
    }
    if (response.statusCode != 200) {
      throw PublicApiException('No se pudo cargar el monumento (${response.statusCode}).');
    }

    return Monument.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<List<HistoricalEntry>> getHistoricalData(String monumentId) async {
    if (!RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(monumentId)) {
      throw const PublicApiException('Identificador de monumento inválido.');
    }
    final base = WebConfig.apiUri;
    final response = await _client
        .get(
          base.replace(path: '${base.path}/monuments/$monumentId/historical-data/public'),
          headers: _buildHeaders(),
        )
        .timeout(const Duration(seconds: 12));

    if (response.statusCode == 401 || response.statusCode == 403) {
      authService?.logout();
      throw const PublicApiException('Sesión expirada. Inicia sesión nuevamente.');
    }
    if (response.statusCode != 200) {
      throw PublicApiException('No se pudo cargar la información histórica.');
    }

    return (jsonDecode(response.body) as List<dynamic>)
        .whereType<Map<String, dynamic>>()
        .map(HistoricalEntry.fromJson)
        .toList(growable: false);
  }

  Future<Map<String, dynamic>?> getQuizByMonument(String monumentId) async {
    final base = WebConfig.apiUri;
    final uri = base.replace(
      path: '${base.path}/quizzes',
      queryParameters: {'monumentId': monumentId},
    );
    final response = await _client
        .get(uri, headers: _buildHeaders())
        .timeout(const Duration(seconds: 12));

    if (response.statusCode != 200) return null;
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final items = body['items'] as List<dynamic>? ?? [];
    if (items.isEmpty) return null;
    return items.first as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitQuizAttempt({
    required String quizId,
    required List<Map<String, int>> answers,
    int? timeSpent,
  }) async {
    final base = WebConfig.apiUri;
    final uri = base.replace(path: '${base.path}/quizzes/$quizId/submit');

    final payload = <String, dynamic>{'answers': answers};
    if (timeSpent != null) payload['timeSpent'] = timeSpent;

    final response = await _client
        .post(
          uri,
          headers: _buildHeaders(),
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 12));

    if (response.statusCode == 429) {
      throw const PublicApiException('Has excedido el límite de intentos. Intenta en un minuto.');
    }
    if (response.statusCode != 201 && response.statusCode != 200) {
      throw PublicApiException('Error al enviar el quiz (${response.statusCode}).');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}

class PublicApiException implements Exception {
  const PublicApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
