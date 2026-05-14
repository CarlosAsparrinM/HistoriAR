import 'monument.dart';

class TourInstitution {
  final String id;
  final String name;
  final String? description;
  final double? distanceMeters;
  final int? radiusMeters;

  const TourInstitution({
    required this.id,
    required this.name,
    this.description,
    this.distanceMeters,
    this.radiusMeters,
  });

  factory TourInstitution.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>?;

    return TourInstitution(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Institucion',
      description: json['description'] as String?,
      distanceMeters:
          (json['distance'] as num?)?.toDouble() ??
          (json['distanceMeters'] as num?)?.toDouble(),
      radiusMeters: (location?['radius'] as num?)?.toInt(),
    );
  }
}

class TourStop {
  final int order;
  final String? description;
  final Monument monument;

  const TourStop({
    required this.order,
    required this.description,
    required this.monument,
  });

  factory TourStop.fromJson(Map<String, dynamic> json) {
    final monumentJson = json['monumentId'];
    if (monumentJson is! Map<String, dynamic>) {
      throw const FormatException('Tour stop sin monumento poblado');
    }

    return TourStop(
      order: (json['order'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      monument: Monument.fromJson(monumentJson),
    );
  }
}

class TourItem {
  final String id;
  final String name;
  final String description;
  final String type;
  final int estimatedDuration;
  final bool isActive;
  final TourInstitution? institution;
  final List<TourStop> stops;

  const TourItem({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.estimatedDuration,
    required this.isActive,
    required this.institution,
    required this.stops,
  });

  factory TourItem.fromJson(Map<String, dynamic> json) {
    final institutionJson = json['institutionId'];
    final monumentsJson = json['monuments'] as List<dynamic>? ?? const [];

    final stops = monumentsJson
        .whereType<Map<String, dynamic>>()
        .map((item) {
          try {
            return TourStop.fromJson(item);
          } catch (_) {
            return null;
          }
        })
        .whereType<TourStop>()
        .toList();

    return TourItem(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Tour',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? 'Recomendado',
      estimatedDuration: (json['estimatedDuration'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      institution: institutionJson is Map<String, dynamic>
          ? TourInstitution.fromJson(institutionJson)
          : null,
      stops: stops,
    );
  }

  List<TourStop> get orderedStops {
    final ordered = List<TourStop>.from(stops);
    ordered.sort((a, b) => a.order.compareTo(b.order));
    return ordered;
  }
}

class TourContextResponse {
  final TourInstitution? institution;
  final List<TourItem> tours;

  const TourContextResponse({required this.institution, required this.tours});

  factory TourContextResponse.fromJson(Map<String, dynamic> json) {
    final institutionJson = json['institution'];
    final toursJson = json['tours'] as List<dynamic>? ?? const [];

    return TourContextResponse(
      institution: institutionJson is Map<String, dynamic>
          ? TourInstitution.fromJson(institutionJson)
          : null,
      tours: toursJson
          .whereType<Map<String, dynamic>>()
          .map((item) => TourItem.fromJson(item))
          .toList(),
    );
  }
}
