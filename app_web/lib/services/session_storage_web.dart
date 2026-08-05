// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

class SessionStorageHelper {
  static const _tokenKey = 'historiar_web_token';

  static String? getToken() {
    try {
      return html.window.sessionStorage[_tokenKey];
    } catch (_) {
      return null;
    }
  }

  static void saveToken(String token) {
    try {
      html.window.sessionStorage[_tokenKey] = token;
    } catch (_) {}
  }

  static void clearToken() {
    try {
      html.window.sessionStorage.remove(_tokenKey);
    } catch (_) {}
  }
}
