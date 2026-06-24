import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:app_movil/services/app_settings_service.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('uses the new quiz preference over the legacy value', () async {
    SharedPreferences.setMockInitialValues({
      'pref_quizPostVisitMode': 'neverShow',
      'pref_askForQuizzes': true,
    });

    final settings = await AppSettingsService().load();

    expect(settings.quizPostVisitMode, QuizPostVisitMode.neverShow);
  });

  test('persists auto-open quiz mode', () async {
    final service = AppSettingsService();

    await service.saveQuizPostVisitMode(QuizPostVisitMode.autoOpen);
    final settings = await service.load();

    expect(settings.quizPostVisitMode, QuizPostVisitMode.autoOpen);
  });

  test('loads all default values when nothing was saved', () async {
    final settings = await AppSettingsService().load();

    expect(settings.quizPostVisitMode, QuizPostVisitMode.alwaysAsk);
    expect(settings.locationAccuracyMode, LocationAccuracyMode.high);
    expect(settings.locationRefreshPreset, LocationRefreshPreset.normal);
    expect(settings.quizFeedbackPreset, QuizFeedbackPreset.normal);
    expect(settings.nearbyNotificationsEnabled, isFalse);
    expect(
      settings.nearbyNotificationDistancePreset,
      NearbyNotificationDistancePreset.near,
    );
  });

  test('maps the legacy quiz preference to the new modes', () async {
    SharedPreferences.setMockInitialValues({'pref_askForQuizzes': false});
    var settings = await AppSettingsService().load();
    expect(settings.quizPostVisitMode, QuizPostVisitMode.neverShow);

    SharedPreferences.setMockInitialValues({'pref_askForQuizzes': true});
    settings = await AppSettingsService().load();
    expect(settings.quizPostVisitMode, QuizPostVisitMode.alwaysAsk);
  });

  test('persists every configurable preference', () async {
    final service = AppSettingsService();

    await service.saveLocationAccuracyMode(LocationAccuracyMode.economy);
    await service.saveLocationRefreshPreset(LocationRefreshPreset.fast);
    await service.saveQuizFeedbackPreset(QuizFeedbackPreset.slow);
    await service.saveNearbyNotificationsEnabled(true);
    await service.saveNearbyNotificationDistancePreset(
      NearbyNotificationDistancePreset.far,
    );

    final settings = await service.load();
    expect(settings.locationAccuracyMode, LocationAccuracyMode.economy);
    expect(settings.locationRefreshPreset, LocationRefreshPreset.fast);
    expect(settings.quizFeedbackPreset, QuizFeedbackPreset.slow);
    expect(settings.nearbyNotificationsEnabled, isTrue);
    expect(
      settings.nearbyNotificationDistancePreset,
      NearbyNotificationDistancePreset.far,
    );
  });

  test('falls back safely when stored enum values are invalid', () async {
    SharedPreferences.setMockInitialValues({
      'pref_quizPostVisitMode': 'invalid',
      'pref_locationAccuracyMode': 'invalid',
      'pref_locationRefreshPreset': 'invalid',
      'pref_quizFeedbackPreset': 'invalid',
      'pref_nearbyNotificationDistancePreset': 'invalid',
    });

    final settings = await AppSettingsService().load();
    expect(settings.quizPostVisitMode, QuizPostVisitMode.alwaysAsk);
    expect(settings.locationAccuracyMode, LocationAccuracyMode.high);
    expect(settings.locationRefreshPreset, LocationRefreshPreset.normal);
    expect(settings.quizFeedbackPreset, QuizFeedbackPreset.normal);
    expect(
      settings.nearbyNotificationDistancePreset,
      NearbyNotificationDistancePreset.near,
    );
  });

  test('clearPreferences restores defaults without deleting session data', () async {
    SharedPreferences.setMockInitialValues({
      'pref_quizPostVisitMode': 'autoOpen',
      'pref_locationAccuracyMode': 'economy',
      'pref_nearbyNotificationsEnabled': true,
      'unrelated_session_value': 'keep-me',
    });

    final service = AppSettingsService();
    await service.clearPreferences();

    final settings = await service.load();
    final prefs = await SharedPreferences.getInstance();
    expect(settings.quizPostVisitMode, QuizPostVisitMode.alwaysAsk);
    expect(settings.locationAccuracyMode, LocationAccuracyMode.high);
    expect(settings.nearbyNotificationsEnabled, isFalse);
    expect(prefs.getString('unrelated_session_value'), 'keep-me');
  });

  test('preset values expose the expected runtime behavior', () {
    expect(LocationRefreshPreset.fast.seconds, 15);
    expect(LocationRefreshPreset.normal.distanceMeters, 100);
    expect(LocationRefreshPreset.economy.seconds, 120);
    expect(QuizFeedbackPreset.fast.seconds, 1);
    expect(QuizFeedbackPreset.slow.seconds, 5);
    expect(NearbyNotificationDistancePreset.close.meters, 250);
    expect(NearbyNotificationDistancePreset.far.meters, 1000);
    expect(
      LocationAccuracyMode.economy.locationSettings.distanceFilter,
      50,
    );
  });
}
