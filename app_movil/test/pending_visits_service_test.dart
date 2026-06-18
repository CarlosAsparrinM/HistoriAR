import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:app_movil/contexts/auth_state.dart';
import 'package:app_movil/services/pending_visits_service.dart';
import 'package:app_movil/services/session_storage_service.dart';
import 'package:app_movil/services/visits_service.dart';

import 'test_support/memory_secure_store.dart';

class RecordingVisitsService extends VisitsService {
  final List<String> clientVisitIds = [];

  @override
  Future<String> registerVisit({
    required String userId,
    required String monumentId,
    required String token,
    String? tourId,
    int? durationMinutes,
    String? device,
    String? clientVisitId,
  }) async {
    clientVisitIds.add(clientVisitId!);
    return 'server-visit-id';
  }
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    authState.token = '';
  });

  test('queues a visit without storing the JWT and syncs it once', () async {
    final secureStore = MemorySecureKeyValueStore({
      AuthState.tokenKey: 'secret-token',
      AuthState.userIdKey: 'user-1',
    });
    final visitsService = RecordingVisitsService();
    final service = PendingVisitsService(
      visitsService: visitsService,
      sessionStorage: SessionStorageService(secureStore: secureStore),
    );
    const visit = PendingVisit(
      clientVisitId: 'client-visit-1',
      userId: 'user-1',
      monumentId: 'monument-1',
      tourId: 'tour-1',
      durationMinutes: 2,
    );

    await service.enqueue(visit);
    await service.enqueue(visit);

    final prefs = await SharedPreferences.getInstance();
    final persisted = prefs.getString(SessionStorageService.pendingVisitsKey);
    expect(persisted, isNotNull);
    expect(persisted, isNot(contains('secret-token')));
    expect('client-visit-1'.allMatches(persisted!).length, 1);

    await service.sync();
    await service.sync();

    expect(visitsService.clientVisitIds, ['client-visit-1']);
    expect(prefs.getString(SessionStorageService.pendingVisitsKey), isNull);
  });

  test('does not send pending visits from another account', () async {
    final secureStore = MemorySecureKeyValueStore({
      AuthState.tokenKey: 'token-2',
      AuthState.userIdKey: 'user-2',
    });
    final visitsService = RecordingVisitsService();
    final service = PendingVisitsService(
      visitsService: visitsService,
      sessionStorage: SessionStorageService(secureStore: secureStore),
    );

    await service.enqueue(
      const PendingVisit(
        clientVisitId: 'old-account-visit',
        userId: 'user-1',
        monumentId: 'monument-1',
        durationMinutes: 1,
      ),
    );
    await service.sync();

    final prefs = await SharedPreferences.getInstance();
    expect(visitsService.clientVisitIds, isEmpty);
    expect(prefs.getString(SessionStorageService.pendingVisitsKey), isNull);
  });
}
