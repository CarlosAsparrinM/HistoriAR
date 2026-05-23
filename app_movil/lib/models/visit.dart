class Visit {
  final String id;
  final String userId;
  final String monumentId;
  final DateTime date;
  final int? duration; // en minutos
  final int? rating; // 1-5
  final String? device;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Visit({
    required this.id,
    required this.userId,
    required this.monumentId,
    required this.date,
    this.duration,
    this.rating,
    this.device,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Visit.fromJson(Map<String, dynamic> json) {
    return Visit(
      id: json['_id'] ?? json['id'] ?? '',
      userId: json['userId'] ?? '',
      monumentId: json['monumentId'] ?? '',
      date: json['date'] != null
          ? DateTime.parse(json['date'] as String)
          : DateTime.now(),
      duration: json['duration'] as int?,
      rating: json['rating'] as int?,
      device: json['device'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }


}
