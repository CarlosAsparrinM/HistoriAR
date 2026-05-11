import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../contexts/auth_state.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import 'login_screen.dart';
import 'main_scaffold.dart';
import '../styles/app_colors.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final AuthService _authService = AuthService();
  final UserService _userService = UserService();

  Future<Widget>? _bootstrapFuture;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _bootstrap();
  }

  Future<Widget> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');

    if (token == null || token.isEmpty) {
      authState.token = '';
      return const LoginScreen();
    }

    try {
      await _authService.validateToken(token);
      final me = await _userService.getMyProfile(token);

      authState.token = token;
      await prefs.setString('userId', me.id);

      return MainScaffold(token: token);
    } catch (_) {
      authState.token = '';
      await prefs.remove('authToken');
      await prefs.remove('userId');
      return const LoginScreen();
    }
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
                  Text('No se pudo validar la sesión: ${snapshot.error}'),
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
