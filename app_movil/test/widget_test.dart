import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:app_movil/contexts/auth_state.dart';
import 'package:app_movil/main.dart';
import 'package:app_movil/screens/auth_gate.dart';
import 'package:app_movil/screens/login_screen.dart';
import 'package:app_movil/services/api_exceptions.dart';
import 'package:app_movil/services/session_storage_service.dart';

import 'test_support/memory_secure_store.dart';

void main() {
  setUp(() {
    dotenv.loadFromString(envString: 'API_BASE_URL=http://localhost:3000\n');
    SharedPreferences.setMockInitialValues({});
    authState.token = '';
  });

  testWidgets('HistoriARApp renders login screen', (tester) async {
    final sessionStorage = SessionStorageService(
      secureStore: MemorySecureKeyValueStore(),
    );

    await tester.pumpWidget(HistoriARApp(sessionStorage: sessionStorage));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('AuthGate preserves the session after a connection failure', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      AuthState.tokenKey: 'saved-token',
      AuthState.userIdKey: 'saved-user',
    });
    final secureStore = MemorySecureKeyValueStore();
    final sessionStorage = SessionStorageService(secureStore: secureStore);

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          validateSession: (_) async => throw Exception('offline'),
          loadUserId: (_) async => 'saved-user',
          sessionStorage: sessionStorage,
        ),
      ),
    );
    await tester.pumpAndSettle();

    final prefs = await SharedPreferences.getInstance();
    expect(find.textContaining('sigue guardada'), findsOneWidget);
    expect(prefs.getString(AuthState.tokenKey), isNull);
    expect(prefs.getString(AuthState.userIdKey), isNull);
    expect(secureStore.values[AuthState.tokenKey], 'saved-token');
    expect(authState.token, 'saved-token');
  });

  testWidgets('AuthGate clears an expired session', (tester) async {
    SharedPreferences.setMockInitialValues({
      AuthState.tokenKey: 'expired-token',
      AuthState.userIdKey: 'saved-user',
    });
    final secureStore = MemorySecureKeyValueStore();
    final sessionStorage = SessionStorageService(secureStore: secureStore);

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          validateSession: (_) async => throw const SessionExpiredException(),
          loadUserId: (_) async => 'saved-user',
          sessionStorage: sessionStorage,
        ),
      ),
    );
    await tester.pumpAndSettle();

    final prefs = await SharedPreferences.getInstance();
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(prefs.getString(AuthState.tokenKey), isNull);
    expect(prefs.getString(AuthState.userIdKey), isNull);
    expect(secureStore.values, isEmpty);
    expect(authState.token, isEmpty);
  });
}
