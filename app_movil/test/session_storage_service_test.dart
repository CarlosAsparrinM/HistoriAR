import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:app_movil/contexts/auth_state.dart';
import 'package:app_movil/services/session_storage_service.dart';

import 'test_support/memory_secure_store.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    authState.token = '';
  });

  test('migrates legacy credentials to secure storage', () async {
    SharedPreferences.setMockInitialValues({
      AuthState.tokenKey: 'legacy-token',
      AuthState.userIdKey: 'legacy-user',
    });
    final secureStore = MemorySecureKeyValueStore();
    final service = SessionStorageService(secureStore: secureStore);

    expect(await service.readToken(), 'legacy-token');
    expect(await service.readUserId(), 'legacy-user');

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString(AuthState.tokenKey), isNull);
    expect(prefs.getString(AuthState.userIdKey), isNull);
    expect(secureStore.values[AuthState.tokenKey], 'legacy-token');
    expect(secureStore.values[AuthState.userIdKey], 'legacy-user');
  });

  test('clears account-scoped local state on logout', () async {
    SharedPreferences.setMockInitialValues({
      SessionStorageService.activeTourSessionIdKey: 'session-1',
      SessionStorageService.activeTourIdKey: 'tour-1',
      SessionStorageService.activeTourOwnerIdKey: 'user-1',
      SessionStorageService.lastTourContextKey: '{"district":"Lima"}',
      SessionStorageService.pendingVisitsKey: '[{"clientVisitId":"visit-1"}]',
    });
    final secureStore = MemorySecureKeyValueStore({
      AuthState.tokenKey: 'token-1',
      AuthState.userIdKey: 'user-1',
    });
    final service = SessionStorageService(secureStore: secureStore);
    authState.token = 'token-1';

    await service.clearSession();

    final prefs = await SharedPreferences.getInstance();
    expect(secureStore.values, isEmpty);
    expect(prefs.getKeys(), isEmpty);
    expect(authState.token, isEmpty);
  });

  test('restores a persisted tour only for its owner', () {
    expect(
      isPersistedTourSessionOwnedBy(
        savedOwnerId: 'user-1',
        currentUserId: 'user-1',
      ),
      isTrue,
    );
    expect(
      isPersistedTourSessionOwnedBy(
        savedOwnerId: 'user-1',
        currentUserId: 'user-2',
      ),
      isFalse,
    );
    expect(
      isPersistedTourSessionOwnedBy(
        savedOwnerId: null,
        currentUserId: 'user-1',
      ),
      isFalse,
    );
  });
}
