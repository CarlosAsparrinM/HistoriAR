/// Modelo de dominio para fichas históricas de un monumento.
class HistoricalData {
  final String id;
  final String monumentId;
  final String title;
  final String? description;
  final String? imageUrl;
  final String? s3ImageKey;
  final String? s3ImageFileName;
  final String? discoveryInfo;
  final List<String> oldImages;
  final List<String> activities;
  final List<String> sources;
  final int order;
  final DateTime createdAt;
  final DateTime updatedAt;

  const HistoricalData({
    required this.id,
    required this.monumentId,
    required this.title,
    this.description,
    this.imageUrl,
    this.s3ImageKey,
    this.s3ImageFileName,
    this.discoveryInfo,
    this.oldImages = const [],
    this.activities = const [],
    this.sources = const [],
    this.order = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory HistoricalData.fromJson(Map<String, dynamic> json) {
    return HistoricalData(
      id: json['_id'] as String? ?? '',
      monumentId: json['monumentId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      s3ImageKey: json['s3ImageKey'] as String?,
      s3ImageFileName: json['s3ImageFileName'] as String?,
      discoveryInfo: json['discoveryInfo'] as String?,
      oldImages:
          (json['oldImages'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      activities:
          (json['activities'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      sources:
          (json['sources'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      order: (json['order'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'monumentId': monumentId,
      'title': title,
      'description': description,
      'imageUrl': imageUrl,
      's3ImageKey': s3ImageKey,
      's3ImageFileName': s3ImageFileName,
      'discoveryInfo': discoveryInfo,
      'oldImages': oldImages,
      'activities': activities,
      'sources': sources,
      'order': order,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
