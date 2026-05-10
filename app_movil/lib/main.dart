import 'package:flutter/material.dart';

import 'screens/auth_gate.dart';

void main() {
  runApp(const HistoriARApp());
}

class HistoriARApp extends StatelessWidget {
  const HistoriARApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HistoriAR',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.brown),
        useMaterial3: true,
      ),
      home: const AuthGate(),
    );
  }
}
