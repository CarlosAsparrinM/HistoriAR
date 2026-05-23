class AuthState {
  static const String tokenKey = 'authToken';
  static const String userIdKey = 'userId';

  String token = '';

  bool get isLoggedIn => token.isNotEmpty;
}

// Estado global simple para autenticación.
final AuthState authState = AuthState();