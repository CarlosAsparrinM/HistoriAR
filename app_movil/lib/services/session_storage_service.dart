import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../contexts/auth_state.dart';

abstract class SecureKeyValueStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class FlutterSecureKeyValueStore implements SecureKeyValueStore {
  FlutterSecureKeyValueStore([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
          );

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) {
    return _storage.write(key: key, value: value);
  }

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class SessionStorageService {
  SessionStorageService({SecureKeyValueStore? secureStore})
    : _secureStore = secureStore ?? FlutterSecureKeyValueStore();

  static const String activeTourSessionIdKey = 'active_tour_session_id';
  static const String activeTourIdKey = 'active_tour_session_tour_id';
  static const String activeTourOwnerIdKey = 'active_tour_session_owner_id';
  static const String lastTourContextKey = 'last_tour_context';
  static const String pendingVisitsKey = 'pending_visits';

  final SecureKeyValueStore _secureStore;

  Future<String?> readToken() => _readAndMigrate(AuthState.tokenKey);

  Future<String?> readUserId() => _readAndMigrate(AuthState.userIdKey);

  Future<void> saveToken(String token) async {
    await _secureStore.write(AuthState.tokenKey, token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AuthState.tokenKey);
    authState.token = token;
  }

  Future<void> saveUserId(String userId) async {
    await _secureStore.write(AuthState.userIdKey, userId);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AuthState.userIdKey);
  }

  Future<void> saveSession({
    required String token,
    required String userId,
  }) async {
    await saveToken(token);
    await saveUserId(userId);
  }

  Future<void> clearSession() async {
    await _secureStore.delete(AuthState.tokenKey);
    await _secureStore.delete(AuthState.userIdKey);

    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(AuthState.tokenKey),
      prefs.remove(AuthState.userIdKey),
      prefs.remove(activeTourSessionIdKey),
      prefs.remove(activeTourIdKey),
      prefs.remove(activeTourOwnerIdKey),
      prefs.remove(lastTourContextKey),
      prefs.remove(pendingVisitsKey),
    ]);

    authState.token = '';
  }

  Future<String?> _readAndMigrate(String key) async {
    final secureValue = await _secureStore.read(key);
    if (secureValue != null && secureValue.isNotEmpty) {
      return secureValue;
    }

    final prefs = await SharedPreferences.getInstance();
    final legacyValue = prefs.getString(key);
    if (legacyValue == null || legacyValue.isEmpty) {
      return null;
    }

    await _secureStore.write(key, legacyValue);
    await prefs.remove(key);
    return legacyValue;
  }
}

bool isPersistedTourSessionOwnedBy({
  required String? savedOwnerId,
  required String? currentUserId,
}) {
  return savedOwnerId != null &&
      currentUserId != null &&
      savedOwnerId == currentUserId;
}
