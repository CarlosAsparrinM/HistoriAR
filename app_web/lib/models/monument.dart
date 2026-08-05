import 'package:latlong2/latlong.dart';

class Monument {
  const Monument({
    required this.id, required this.name, required this.description, required this.position,
    this.district, this.culture, this.imageUrl, this.model3dUrl,
  });

  final String id;
  final String name;
  final String description;
  final LatLng position;
  final String? district;
  final String? culture;
  final String? imageUrl;
  final String? model3dUrl;

  factory Monument.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? const {};
    final lat = location['lat'];
    final lng = location['lng'];
    if (lat is! num || lng is! num) throw const FormatException('Monumento sin coordenadas válidas');
    return Monument(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? 'Monumento sin nombre',
      description: json['description'] as String? ?? '',
      position: LatLng(lat.toDouble(), lng.toDouble()),
      district: location['district'] as String?,
      culture: json['culture'] as String?,
      imageUrl: json['imageUrl'] as String?,
      model3dUrl: json['model3DUrl'] as String?,
    );
  }
}
