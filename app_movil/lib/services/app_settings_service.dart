import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum QuizPostVisitMode { alwaysAsk, autoOpen, neverShow }

extension QuizPostVisitModeX on QuizPostVisitMode {
  String get storageValue => switch (this) {
        QuizPostVisitMode.alwaysAsk => 'alwaysAsk',
        QuizPostVisitMode.autoOpen => 'autoOpen',
        QuizPostVisitMode.neverShow => 'neverShow',
      };

  String get label => switch (this) {
        QuizPostVisitMode.alwaysAsk => 'Siempre preguntar',
        QuizPostVisitMode.autoOpen => 'Abrir automático',
        QuizPostVisitMode.neverShow => 'Nunca mostrar',
      };

  static QuizPostVisitMode fromStorage(String? value) {
    return switch (value) {
      'autoOpen' => QuizPostVisitMode.autoOpen,
      'neverShow' => QuizPostVisitMode.neverShow,
      'alwaysAsk' => QuizPostVisitMode.alwaysAsk,
      _ => QuizPostVisitMode.alwaysAsk,
    };
  }
}

enum LocationAccuracyMode { high, medium, economy }

extension LocationAccuracyModeX on LocationAccuracyMode {
  String get storageValue => switch (this) {
        LocationAccuracyMode.high => 'high',
        LocationAccuracyMode.medium => 'medium',
        LocationAccuracyMode.economy => 'economy',
      };

  String get label => switch (this) {
        LocationAccuracyMode.high => 'Alta',
        LocationAccuracyMode.medium => 'Media',
        LocationAccuracyMode.economy => 'Ahorro',
      };

  static LocationAccuracyMode fromStorage(String? value) {
    return switch (value) {
      'medium' => LocationAccuracyMode.medium,
      'economy' => LocationAccuracyMode.economy,
      'high' => LocationAccuracyMode.high,
      _ => LocationAccuracyMode.high,
    };
  }

  LocationSettings get locationSettings => switch (this) {
        LocationAccuracyMode.high => const LocationSettings(
            accuracy: LocationAccuracy.best,
            distanceFilter: 1,
          ),
        LocationAccuracyMode.medium => const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 10,
          ),
        LocationAccuracyMode.economy => const LocationSettings(
            accuracy: LocationAccuracy.low,
            distanceFilter: 50,
          ),
      };
}

enum LocationRefreshPreset { fast, normal, economy }

extension LocationRefreshPresetX on LocationRefreshPreset {
  String get storageValue => switch (this) {
        LocationRefreshPreset.fast => 'fast',
        LocationRefreshPreset.normal => 'normal',
        LocationRefreshPreset.economy => 'economy',
      };

  String get label => switch (this) {
        LocationRefreshPreset.fast => 'Rápida',
        LocationRefreshPreset.normal => 'Normal',
        LocationRefreshPreset.economy => 'Ahorro',
      };

  int get seconds => switch (this) {
        LocationRefreshPreset.fast => 15,
        LocationRefreshPreset.normal => 45,
        LocationRefreshPreset.economy => 120,
      };

  int get distanceMeters => switch (this) {
        LocationRefreshPreset.fast => 50,
        LocationRefreshPreset.normal => 100,
        LocationRefreshPreset.economy => 250,
      };

  static LocationRefreshPreset fromStorage(String? value) {
    return switch (value) {
      'fast' => LocationRefreshPreset.fast,
      'economy' => LocationRefreshPreset.economy,
      'normal' => LocationRefreshPreset.normal,
      _ => LocationRefreshPreset.normal,
    };
  }
}

enum QuizFeedbackPreset { fast, normal, slow }

extension QuizFeedbackPresetX on QuizFeedbackPreset {
  String get storageValue => switch (this) {
        QuizFeedbackPreset.fast => 'fast',
        QuizFeedbackPreset.normal => 'normal',
        QuizFeedbackPreset.slow => 'slow',
      };

  String get label => switch (this) {
        QuizFeedbackPreset.fast => 'Rápido',
        QuizFeedbackPreset.normal => 'Normal',
        QuizFeedbackPreset.slow => 'Lento',
      };

  int get seconds => switch (this) {
        QuizFeedbackPreset.fast => 1,
        QuizFeedbackPreset.normal => 3,
        QuizFeedbackPreset.slow => 5,
      };

  static QuizFeedbackPreset fromStorage(String? value) {
    return switch (value) {
      'fast' => QuizFeedbackPreset.fast,
      'slow' => QuizFeedbackPreset.slow,
      'normal' => QuizFeedbackPreset.normal,
      _ => QuizFeedbackPreset.normal,
    };
  }
}

enum NearbyNotificationDistancePreset { close, near, far }

extension NearbyNotificationDistancePresetX on NearbyNotificationDistancePreset {
  String get storageValue => switch (this) {
        NearbyNotificationDistancePreset.close => 'close',
        NearbyNotificationDistancePreset.near => 'near',
        NearbyNotificationDistancePreset.far => 'far',
      };

  String get label => switch (this) {
        NearbyNotificationDistancePreset.close => 'Cerca',
        NearbyNotificationDistancePreset.near => 'Media',
        NearbyNotificationDistancePreset.far => 'Amplia',
      };

  int get meters => switch (this) {
        NearbyNotificationDistancePreset.close => 250,
        NearbyNotificationDistancePreset.near => 500,
        NearbyNotificationDistancePreset.far => 1000,
      };

  static NearbyNotificationDistancePreset fromStorage(String? value) {
    return switch (value) {
      'close' => NearbyNotificationDistancePreset.close,
      'far' => NearbyNotificationDistancePreset.far,
      'near' => NearbyNotificationDistancePreset.near,
      _ => NearbyNotificationDistancePreset.near,
    };
  }
}

class AppSettings {
  final QuizPostVisitMode quizPostVisitMode;
  final LocationAccuracyMode locationAccuracyMode;
  final LocationRefreshPreset locationRefreshPreset;
  final QuizFeedbackPreset quizFeedbackPreset;
  final bool nearbyNotificationsEnabled;
  final NearbyNotificationDistancePreset nearbyNotificationDistancePreset;

  const AppSettings({
    required this.quizPostVisitMode,
    required this.locationAccuracyMode,
    required this.locationRefreshPreset,
    required this.quizFeedbackPreset,
    required this.nearbyNotificationsEnabled,
    required this.nearbyNotificationDistancePreset,
  });

  const AppSettings.defaults()
      : quizPostVisitMode = QuizPostVisitMode.alwaysAsk,
        locationAccuracyMode = LocationAccuracyMode.high,
        locationRefreshPreset = LocationRefreshPreset.normal,
        quizFeedbackPreset = QuizFeedbackPreset.normal,
        nearbyNotificationsEnabled = false,
        nearbyNotificationDistancePreset = NearbyNotificationDistancePreset.near;
}

class AppSettingsService {
  static const String _quizPostVisitModeKey = 'pref_quizPostVisitMode';
  static const String _locationAccuracyModeKey = 'pref_locationAccuracyMode';
  static const String _locationRefreshPresetKey = 'pref_locationRefreshPreset';
  static const String _quizFeedbackPresetKey = 'pref_quizFeedbackPreset';
  static const String _nearbyNotificationsEnabledKey =
      'pref_nearbyNotificationsEnabled';
  static const String _nearbyNotificationDistanceKey =
      'pref_nearbyNotificationDistancePreset';

  static const String _legacyAskForQuizzesKey = 'pref_askForQuizzes';

  Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();

    final legacyAskForQuizzes = prefs.getBool(_legacyAskForQuizzesKey);
    final storedQuizMode = prefs.getString(_quizPostVisitModeKey);
    final quizMode = storedQuizMode != null
        ? QuizPostVisitModeX.fromStorage(storedQuizMode)
        : (legacyAskForQuizzes == null
              ? QuizPostVisitMode.alwaysAsk
              : (legacyAskForQuizzes
                    ? QuizPostVisitMode.alwaysAsk
                    : QuizPostVisitMode.neverShow));

    return AppSettings(
      quizPostVisitMode: quizMode,
      locationAccuracyMode: LocationAccuracyModeX.fromStorage(
        prefs.getString(_locationAccuracyModeKey),
      ),
      locationRefreshPreset: LocationRefreshPresetX.fromStorage(
        prefs.getString(_locationRefreshPresetKey),
      ),
      quizFeedbackPreset: QuizFeedbackPresetX.fromStorage(
        prefs.getString(_quizFeedbackPresetKey),
      ),
      nearbyNotificationsEnabled:
          prefs.getBool(_nearbyNotificationsEnabledKey) ?? false,
      nearbyNotificationDistancePreset:
          NearbyNotificationDistancePresetX.fromStorage(
        prefs.getString(_nearbyNotificationDistanceKey),
      ),
    );
  }

  Future<void> saveQuizPostVisitMode(QuizPostVisitMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_quizPostVisitModeKey, mode.storageValue);
    await prefs.setBool(
      _legacyAskForQuizzesKey,
      mode == QuizPostVisitMode.alwaysAsk,
    );
  }

  Future<void> saveLocationAccuracyMode(LocationAccuracyMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_locationAccuracyModeKey, mode.storageValue);
  }

  Future<void> saveLocationRefreshPreset(LocationRefreshPreset preset) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_locationRefreshPresetKey, preset.storageValue);
  }

  Future<void> saveQuizFeedbackPreset(QuizFeedbackPreset preset) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_quizFeedbackPresetKey, preset.storageValue);
  }

  Future<void> saveNearbyNotificationsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_nearbyNotificationsEnabledKey, enabled);
  }

  Future<void> saveNearbyNotificationDistancePreset(
    NearbyNotificationDistancePreset preset,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_nearbyNotificationDistanceKey, preset.storageValue);
  }

  Future<void> clearPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_quizPostVisitModeKey);
    await prefs.remove(_locationAccuracyModeKey);
    await prefs.remove(_locationRefreshPresetKey);
    await prefs.remove(_quizFeedbackPresetKey);
    await prefs.remove(_nearbyNotificationsEnabledKey);
    await prefs.remove(_nearbyNotificationDistanceKey);
    await prefs.remove(_legacyAskForQuizzesKey);
    await prefs.remove('pref_notifications');
    await prefs.remove('pref_location');
    await prefs.remove('pref_arEffects');
    await prefs.remove('pref_sound');
    await prefs.remove('pref_highQuality');
    await prefs.remove('pref_offlineMode');
    await prefs.remove('pref_dataUsage');
    await prefs.remove('pref_language');
    await prefs.remove('pref_theme');
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
    await prefs.remove('userId');
  }

  Future<void> clearAllLocalData() async {
    await clearPreferences();
    await clearSession();
  }
}