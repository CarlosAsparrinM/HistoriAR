export 'package:http/http.dart' hide delete, get, post, put;

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as original_http;

import '../main.dart';
import '../screens/login_screen.dart';
import '../services/api_exceptions.dart';
import '../services/session_storage_service.dart';

bool _isHandlingSessionEnd = false;

Future<original_http.Response> get(
  Uri url, {
  Map<String, String>? headers,
}) async {
  final response = await original_http.get(url, headers: headers);
  await inspectResponse(response, headers: headers);
  return response;
}

Future<original_http.Response> post(
  Uri url, {
  Map<String, String>? headers,
  Object? body,
  Encoding? encoding,
}) async {
  final response = await original_http.post(
    url,
    headers: headers,
    body: body,
    encoding: encoding,
  );
  await inspectResponse(response, headers: headers);
  return response;
}

Future<original_http.Response> put(
  Uri url, {
  Map<String, String>? headers,
  Object? body,
  Encoding? encoding,
}) async {
  final response = await original_http.put(
    url,
    headers: headers,
    body: body,
    encoding: encoding,
  );
  await inspectResponse(response, headers: headers);
  return response;
}

Future<original_http.Response> delete(
  Uri url, {
  Map<String, String>? headers,
  Object? body,
  Encoding? encoding,
}) async {
  final response = await original_http.delete(
    url,
    headers: headers,
    body: body,
    encoding: encoding,
  );
  await inspectResponse(response, headers: headers);
  return response;
}

Future<void> inspectResponse(
  original_http.Response response, {
  Map<String, String>? headers,
}) async {
  final hasBearerToken =
      headers?['Authorization']?.startsWith('Bearer ') == true;
  if (!hasBearerToken) return;

  if (response.statusCode == 401) {
    await _endSession(
      'La sesión expiró. Vuelve a iniciar sesión.',
      showSuspendedDialog: false,
    );
  }

  if (response.statusCode != 403) return;

  try {
    final data = jsonDecode(response.body);
    if (data is Map && data['message'] == 'ACCOUNT_SUSPENDED') {
      await _endSession(
        'La cuenta está suspendida.',
        showSuspendedDialog: true,
      );
    }
  } on FormatException {
    return;
  }
}

Future<Never> _endSession(
  String message, {
  required bool showSuspendedDialog,
}) async {
  if (_isHandlingSessionEnd) {
    throw SessionExpiredException(message);
  }
  _isHandlingSessionEnd = true;

  try {
    final context = navigatorKey.currentContext;
    if (showSuspendedDialog && context != null && context.mounted) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Cuenta suspendida'),
          content: const Text(
            'Tu cuenta ha sido suspendida.\n\n'
            'Si no estás conforme, comunícate con el equipo de HistoriAR.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Entendido'),
            ),
          ],
        ),
      );
    }

    await SessionStorageService().clearSession();
    final navigator = navigatorKey.currentState;
    if (navigator != null) {
      navigator.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    }
  } finally {
    _isHandlingSessionEnd = false;
  }

  throw SessionExpiredException(message);
}
