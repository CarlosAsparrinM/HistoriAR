// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:app_movil/main.dart';
import 'package:app_movil/screens/login_screen.dart';

void main() {
  testWidgets('HistoriARApp renders login screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const HistoriARApp());

    // Verificamos que la pantalla de login se muestra
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
