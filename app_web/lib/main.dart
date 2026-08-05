import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/explore/explore_page.dart';
import 'services/auth_service.dart';
import 'services/public_api.dart';

void main() {
  usePathUrlStrategy();
  runApp(const HistoriarApp());
}

class HistoriarApp extends StatefulWidget {
  const HistoriarApp({super.key});

  @override
  State<HistoriarApp> createState() => _HistoriarAppState();
}

class _HistoriarAppState extends State<HistoriarApp> {
  late final AuthService _authService;
  late final PublicApi _api;

  bool _isCheckingSession = true;
  bool _isRegisterView = false;

  @override
  void initState() {
    super.initState();
    _authService = AuthService();
    _api = PublicApi(authService: _authService);
    _initSession();
  }

  Future<void> _initSession() async {
    await _authService.initSession();
    if (mounted) {
      setState(() {
        _isCheckingSession = false;
      });
    }
  }

  void _onLoginSuccess() {
    setState(() {
      _isRegisterView = false;
    });
  }

  void _onLogout() {
    _authService.logout();
    setState(() {
      _isRegisterView = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HistoriAR Web',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff8c3b1f),
          primary: const Color(0xff8c3b1f),
        ),
        useMaterial3: true,
      ),
      home: _isCheckingSession
          ? const Scaffold(
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Color(0xff8c3b1f)),
                    SizedBox(height: 16),
                    Text('Validando sesión...'),
                  ],
                ),
              ),
            )
          : _authService.isAuthenticated
              ? ExplorePage(
                  api: _api,
                  userName: _authService.currentUser?['name'] as String?,
                  onLogout: _onLogout,
                )
              : _isRegisterView
                  ? RegisterScreen(
                      authService: _authService,
                      onRegisterSuccess: () {
                        setState(() {
                          _isRegisterView = false;
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Cuenta creada exitosamente. Inicia sesión con tus credenciales.',
                            ),
                          ),
                        );
                      },
                      onNavigateToLogin: () {
                        setState(() {
                          _isRegisterView = false;
                        });
                      },
                    )
                  : LoginScreen(
                      authService: _authService,
                      onLoginSuccess: _onLoginSuccess,
                      onNavigateToRegister: () {
                        setState(() {
                          _isRegisterView = true;
                        });
                      },
                    ),
    );
  }
}
