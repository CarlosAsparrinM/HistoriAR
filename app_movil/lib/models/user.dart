class User {
  final String id;
  final String name;
  final String email;
  final String? profileImage;
  final int level;
  final int totalPoints;
  final int monumentsVisited;
  final int arScans;
  final String? timeSpent;
  final String? joinDate;
  final int achievements;
  final List<String> badges;
  final DateTime createdAt;
  final DateTime updatedAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.profileImage,
    this.level = 1,
    this.totalPoints = 0,
    this.monumentsVisited = 0,
    this.arScans = 0,
    this.timeSpent,
    this.joinDate,
    this.achievements = 0,
    this.badges = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      profileImage: json['profileImage'],
      level: json['level'] ?? 1,
      totalPoints: json['totalPoints'] ?? 0,
      monumentsVisited: json['monumentsVisited'] ?? 0,
      arScans: json['arScans'] ?? 0,
      timeSpent: json['timeSpent'],
      joinDate: json['joinDate'],
      achievements: json['achievements'] ?? 0,
      badges: List<String>.from(json['badges'] ?? []),
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
      'name': name,
      'email': email,
      'profileImage': profileImage,
      'level': level,
      'totalPoints': totalPoints,
      'monumentsVisited': monumentsVisited,
      'arScans': arScans,
      'timeSpent': timeSpent,
      'joinDate': joinDate,
      'achievements': achievements,
      'badges': badges,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? name,
    String? email,
    String? profileImage,
    int? level,
    int? totalPoints,
    int? monumentsVisited,
    int? arScans,
    String? timeSpent,
    String? joinDate,
    int? achievements,
    List<String>? badges,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      profileImage: profileImage ?? this.profileImage,
      level: level ?? this.level,
      totalPoints: totalPoints ?? this.totalPoints,
      monumentsVisited: monumentsVisited ?? this.monumentsVisited,
      arScans: arScans ?? this.arScans,
      timeSpent: timeSpent ?? this.timeSpent,
      joinDate: joinDate ?? this.joinDate,
      achievements: achievements ?? this.achievements,
      badges: badges ?? this.badges,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
