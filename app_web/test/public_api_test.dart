import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:historiar_web/services/public_api.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('usa exclusivamente la ruta pública para el historial', () async {
    late http.Request request;
    final api = PublicApi(
      client: MockClient((received) async {
        request = received;
        return http.Response(
          jsonEncode([
            {'id': 'history-1', 'title': 'Fundación', 'description': 'Texto', 'order': 0},
          ]),
          200,
        );
      }),
    );

    final entries = await api.getHistoricalData('507f1f77bcf86cd799439011');

    expect(entries.single.title, 'Fundación');
    expect(request.method, 'GET');
    expect(request.url.path, '/api/monuments/507f1f77bcf86cd799439011/historical-data/public');
    expect(request.headers.containsKey('authorization'), isFalse);
  });

  test('no realiza solicitudes con identificadores inválidos', () async {
    final api = PublicApi(client: MockClient((_) async => http.Response('', 500)));

    await expectLater(
      api.getHistoricalData('invalid-id'),
      throwsA(isA<PublicApiException>()),
    );
  });
}
