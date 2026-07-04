import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:app_movil/screens/configuration_screen.dart';
import 'package:app_movil/services/app_settings_service.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('loads defaults and persists a location accuracy change', (
    tester,
  ) async {
    var changeNotifications = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: ConfigurationScreen(
          onSettingsChanged: () => changeNotifications++,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Alta'), findsOneWidget);

    await tester.tap(find.text('Precisión de ubicación'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ahorro'));
    await tester.pumpAndSettle();

    final settings = await AppSettingsService().load();
    expect(settings.locationAccuracyMode, LocationAccuracyMode.economy);
    expect(changeNotifications, 1);
  });

  testWidgets('does not enable notifications when permission is denied', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ConfigurationScreen(
          requestNotificationPermissions: () async => false,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.pumpAndSettle();

    await tester.drag(find.byType(ListView), const Offset(0, -1000));
    await tester.pumpAndSettle();

    final switchFinder = find.byType(Switch);
    await tester.tap(switchFinder);
    await tester.pumpAndSettle();

    final settings = await AppSettingsService().load();
    expect(settings.nearbyNotificationsEnabled, isFalse);
    expect(find.textContaining('no concedió permiso'), findsOneWidget);
  });

  testWidgets('enables notifications only after permission is granted', (
    tester,
  ) async {
    var changeNotifications = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: ConfigurationScreen(
          requestNotificationPermissions: () async => true,
          onSettingsChanged: () => changeNotifications++,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.pumpAndSettle();

    await tester.drag(find.byType(ListView), const Offset(0, -1000));
    await tester.pumpAndSettle();

    final switchFinder = find.byType(Switch);
    await tester.tap(switchFinder);
    await tester.pumpAndSettle();

    final settings = await AppSettingsService().load();
    expect(settings.nearbyNotificationsEnabled, isTrue);
    expect(changeNotifications, 1);
  });
}
