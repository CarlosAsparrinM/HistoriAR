import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'screens/auth_gate.dart';
import 'services/local_notification_service.dart';
import 'styles/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await LocalNotificationService.instance.initialize();
  runApp(const HistoriARApp());
}

class HistoriARApp extends StatelessWidget {
  const HistoriARApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HistoriAR',
      theme: AppTheme.light,
      home: const AuthGate(),
    );
  }
}
