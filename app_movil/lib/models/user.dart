class User {
  final String id;
  final String name;
  final String email;
  final String? profileImage;
  final String? district;
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
    this.district,
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
      district: json['district'],
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


}
