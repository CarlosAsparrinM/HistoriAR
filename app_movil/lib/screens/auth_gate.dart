import 'package:flutter/material.dart';

import '../contexts/auth_state.dart';
import '../services/api_exceptions.dart';
import '../services/auth_service.dart';
import '../services/session_storage_service.dart';
import '../services/user_service.dart';
import '../styles/app_colors.dart';
import 'login_screen.dart';
import 'main_scaffold.dart';

class AuthGate extends StatefulWidget {
  final Future<void> Function(String token)? validateSession;
  final Future<String> Function(String token)? loadUserId;
  final SessionStorageService? sessionStorage;

  const AuthGate({
    super.key,
    this.validateSession,
    this.loadUserId,
    this.sessionStorage,
  });

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  AuthService? _authService;
  UserService? _userService;
  late final SessionStorageService _sessionStorage =
      widget.sessionStorage ?? SessionStorageService();

  Future<Widget>? _bootstrapFuture;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _bootstrap();
  }

  Future<Widget> _bootstrap() async {
    final token = await _sessionStorage.readToken();

    if (token == null || token.isEmpty) {
      authState.token = '';
      return const LoginScreen();
    }

    authState.token = token;

    try {
      await _validateSession(token);
      final userId = await _loadUserId(token);

      await _sessionStorage.saveUserId(userId);

      return MainScaffold(token: token);
    } on SessionExpiredException {
      await _sessionStorage.clearSession();
      return const LoginScreen();
    } catch (_) {
      rethrow;
    }
  }

  Future<void> _validateSession(String token) async {
    final validator = widget.validateSession;
    if (validator != null) {
      await validator(token);
      return;
    }

    _authService ??= AuthService();
    await _authService!.validateToken(token);
  }

  Future<String> _loadUserId(String token) async {
    final loader = widget.loadUserId;
    if (loader != null) {
      return loader(token);
    }

    _userService ??= UserService();
    final user = await _userService!.getMyProfile(token);
    return user.id;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Widget>(
      future: _bootstrapFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'No se pudo conectar con el servidor. Tu sesión sigue guardada.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _bootstrapFuture = _bootstrap();
                      });
                    },
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }

        return snapshot.data ?? const LoginScreen();
      },
    );
  }
}
