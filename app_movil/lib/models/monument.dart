import 'package:latlong2/latlong.dart';

/// Modelo de dominio para un monumento tal como lo usa la app móvil.
class Monument {
  final String id;
  final String name;
  final String description;
  final String status; // Disponible, Visitado, Oculto, etc.
  final LatLng position;
  final String? culture;
  final String? periodName;
  final bool periodIsIdentified;
  final int? periodStartYear;
  final int? periodEndYear;
  final bool discoveryIsDateKnown;
  final DateTime? discoveryDiscoveredAt;
  final bool discoveryIsDiscovererKnown;
  final String? discoveryDiscovererName;
  final String? imageUrl;
  final String? s3ImageKey;
  final String? model3DUrl;
  final String? s3ModelKey;
  final String? district;

  const Monument({
    required this.id,
    required this.name,
    required this.description,
    required this.status,
    required this.position,
    this.culture,
    this.periodName,
    this.periodIsIdentified = true,
    this.periodStartYear,
    this.periodEndYear,
    this.discoveryIsDateKnown = false,
    this.discoveryDiscoveredAt,
    this.discoveryIsDiscovererKnown = false,
    this.discoveryDiscovererName,
    this.imageUrl,
    this.s3ImageKey,
    this.model3DUrl,
    this.s3ModelKey,
    this.district,
  });

  factory Monument.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>?;
    final period = json['period'] as Map<String, dynamic>?;
    final discovery = json['discovery'] as Map<String, dynamic>?;

    if (location == null || location['lat'] == null || location['lng'] == null) {
      throw const FormatException('Monument sin coordenadas válidas');
    }

    final double lat = (location['lat'] as num).toDouble();
    final double lng = (location['lng'] as num).toDouble();

    return Monument(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'Disponible',
      position: LatLng(lat, lng),
        culture: json['culture'] as String?,
        periodName: period?['name'] as String?,
        periodIsIdentified: period?['isIdentified'] as bool? ?? true,
        periodStartYear: (period?['startYear'] as num?)?.toInt(),
        periodEndYear: (period?['endYear'] as num?)?.toInt(),
        discoveryIsDateKnown: discovery?['isDateKnown'] as bool? ?? false,
        discoveryDiscoveredAt: discovery?['discoveredAt'] != null
          ? DateTime.tryParse(discovery!['discoveredAt'] as String)
          : null,
        discoveryIsDiscovererKnown: discovery?['isDiscovererKnown'] as bool? ?? false,
        discoveryDiscovererName: discovery?['discovererName'] as String?,
      imageUrl: json['imageUrl'] as String?,
      s3ImageKey: json['s3ImageKey'] as String?,
      model3DUrl: json['model3DUrl'] as String?,
      s3ModelKey: json['s3ModelKey'] as String?,
      district: (location['district'] as String?) ?? '',
    );
  }
}
