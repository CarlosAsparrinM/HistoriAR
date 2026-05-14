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

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'userId': userId,
      'monumentId': monumentId,
      'date': date.toIso8601String(),
      'duration': duration,
      'rating': rating,
      'device': device,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Visit copyWith({
    String? id,
    String? userId,
    String? monumentId,
    DateTime? date,
    int? duration,
    int? rating,
    String? device,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Visit(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      monumentId: monumentId ?? this.monumentId,
      date: date ?? this.date,
      duration: duration ?? this.duration,
      rating: rating ?? this.rating,
      device: device ?? this.device,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
