import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'config/environment.dart';
import 'screens/auth_gate.dart';
import 'services/local_notification_service.dart';
import 'services/session_storage_service.dart';
import 'styles/app_theme.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  Environment.validateConfiguration();
  await LocalNotificationService.instance.initialize();
  runApp(const HistoriARApp());
}

class HistoriARApp extends StatelessWidget {
  final SessionStorageService? sessionStorage;

  const HistoriARApp({super.key, this.sessionStorage});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HistoriAR',
      theme: AppTheme.light,
      navigatorKey: navigatorKey,
      home: AuthGate(sessionStorage: sessionStorage),
    );
  }
}
