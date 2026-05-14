class UserPreferences {
  final String userId;
  final bool notifications;
  final bool location;
  final bool arEffects;
  final bool sound;
  final bool highQuality;
  final bool offlineMode;
  final bool dataUsage;
  final String language;
  final String theme;

  UserPreferences({
    required this.userId,
    this.notifications = true,
    this.location = true,
    this.arEffects = true,
    this.sound = true,
    this.highQuality = true,
    this.offlineMode = false,
    this.dataUsage = false,
    this.language = 'es',
    this.theme = 'light',
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      userId: json['userId'] ?? json['_id'] ?? '',
      notifications: json['notifications'] ?? true,
      location: json['location'] ?? true,
      arEffects: json['arEffects'] ?? true,
      sound: json['sound'] ?? true,
      highQuality: json['highQuality'] ?? true,
      offlineMode: json['offlineMode'] ?? false,
      dataUsage: json['dataUsage'] ?? false,
      language: json['language'] ?? 'es',
      theme: json['theme'] ?? 'light',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'notifications': notifications,
      'location': location,
      'arEffects': arEffects,
      'sound': sound,
      'highQuality': highQuality,
      'offlineMode': offlineMode,
      'dataUsage': dataUsage,
      'language': language,
      'theme': theme,
    };
  }

  UserPreferences copyWith({
    String? userId,
    bool? notifications,
    bool? location,
    bool? arEffects,
    bool? sound,
    bool? highQuality,
    bool? offlineMode,
    bool? dataUsage,
    String? language,
    String? theme,
  }) {
    return UserPreferences(
      userId: userId ?? this.userId,
      notifications: notifications ?? this.notifications,
      location: location ?? this.location,
      arEffects: arEffects ?? this.arEffects,
      sound: sound ?? this.sound,
      highQuality: highQuality ?? this.highQuality,
      offlineMode: offlineMode ?? this.offlineMode,
      dataUsage: dataUsage ?? this.dataUsage,
      language: language ?? this.language,
      theme: theme ?? this.theme,
    );
  }
}
