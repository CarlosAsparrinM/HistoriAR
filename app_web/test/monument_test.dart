import 'package:flutter_test/flutter_test.dart';
import 'package:historiar_web/models/monument.dart';

void main() {
  test('convierte un monumento público con coordenadas válidas', () {
    final monument = Monument.fromJson({
      '_id': 'monument-1',
      'name': 'Huaca',
      'description': 'Historia',
      'location': {'lat': -12.1, 'lng': -77.0, 'district': 'Miraflores'},
      'model3DUrl': 'https://media.example/model.glb',
    });

    expect(monument.id, 'monument-1');
    expect(monument.position.latitude, -12.1);
    expect(monument.model3dUrl, contains('model.glb'));
  });

  test('rechaza monumentos sin coordenadas', () {
    expect(() => Monument.fromJson({'_id': 'missing-location'}), throwsFormatException);
  });
}
