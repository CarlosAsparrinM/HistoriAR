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
}
