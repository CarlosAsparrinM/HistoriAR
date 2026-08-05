import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/web_config.dart';
import '../models/historical_entry.dart';
import '../models/monument.dart';

class PublicApi {
  PublicApi({http.Client? client}) : _client = client ?? http.Client();
  final http.Client _client;

  Future<List<Monument>> getMonuments({String? search}) async {
    final query = <String, String>{'limit': '100'};
    if (search != null && search.trim().isNotEmpty) query['text'] = search.trim();
    final base = WebConfig.apiUri;
    final response = await _client.get(base.replace(path: '${base.path}/monuments', queryParameters: query))
        .timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) throw PublicApiException('No se pudo cargar el catálogo (${response.statusCode}).');
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return (body['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>().map(Monument.fromJson).toList(growable: false);
  }

  Future<Monument> getMonument(String id) async {
    if (!RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(id)) {
      throw const PublicApiException('Identificador de monumento inválido.');
    }
    final base = WebConfig.apiUri;
    final response = await _client
        .get(base.replace(path: '${base.path}/monuments/$id'))
        .timeout(const Duration(seconds: 12));
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
        .get(base.replace(path: '${base.path}/monuments/$monumentId/historical-data/public'))
        .timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) {
      throw PublicApiException('No se pudo cargar la información histórica.');
    }
    return (jsonDecode(response.body) as List<dynamic>)
        .whereType<Map<String, dynamic>>().map(HistoricalEntry.fromJson).toList(growable: false);
  }
}

class PublicApiException implements Exception {
  const PublicApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
