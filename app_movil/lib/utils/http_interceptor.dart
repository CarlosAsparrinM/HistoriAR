export 'package:http/http.dart' hide get, post, put, delete;

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as original_http;
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../screens/login_screen.dart';
import '../contexts/auth_state.dart';

Future<original_http.Response> get(Uri url, {Map<String, String>? headers}) async {
  final res = await original_http.get(url, headers: headers);
  await _checkSuspended(res);
  return res;
}

Future<original_http.Response> post(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) async {
  final res = await original_http.post(url, headers: headers, body: body, encoding: encoding);
  await _checkSuspended(res);
  return res;
}

Future<original_http.Response> put(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) async {
  final res = await original_http.put(url, headers: headers, body: body, encoding: encoding);
  await _checkSuspended(res);
  return res;
}

Future<original_http.Response> delete(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) async {
  final res = await original_http.delete(url, headers: headers, body: body, encoding: encoding);
  await _checkSuspended(res);
  return res;
}

Future<void> _checkSuspended(original_http.Response response) async {
  if (response.statusCode == 403) {
    try {
      final data = jsonDecode(response.body);
      if (data['message'] == 'ACCOUNT_SUSPENDED') {
        final context = navigatorKey.currentContext;
        
        if (context != null) {
          // Mostrar el diálogo (await para bloquear hasta que el usuario lo cierre)
          await showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              title: const Text('Cuenta Suspendida'),
              content: const Text(
                'Tu cuenta ha sido suspendida.\n\n'
                'Si no estás conforme con esta decisión comunícate al siguiente correo:\n'
                'carlos.asparrin@tecsup.edu.pe o hector.perez@tecsup.edu.pe'
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Entendido'),
                ),
              ],
            ),
          );
        }

        // Limpiar sesión
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(AuthState.tokenKey);
        await prefs.remove(AuthState.userIdKey);
        authState.token = '';
        
        // Redirigir a LoginScreen
        if (context != null && context.mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (route) => false,
          );
        }
        
        // Lanzamos la excepción para que el servicio actual no siga procesando la respuesta
        throw Exception('ACCOUNT_SUSPENDED');
      }
    } catch (e) {
      if (e.toString() == 'Exception: ACCOUNT_SUSPENDED') {
        rethrow;
      }
    }
  }
}
