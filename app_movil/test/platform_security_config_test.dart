import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('mobile platform security configuration', () {
    test('Android release bloquea cleartext y debug lo habilita explícitamente', () {
      final mainManifest = File('android/app/src/main/AndroidManifest.xml').readAsStringSync();
      final debugManifest = File('android/app/src/debug/AndroidManifest.xml').readAsStringSync();
      final profileManifest = File('android/app/src/profile/AndroidManifest.xml').readAsStringSync();

      expect(mainManifest, contains('android:usesCleartextTraffic="false"'));
      expect(profileManifest, contains('android:usesCleartextTraffic="false"'));
      expect(debugManifest, contains('android:usesCleartextTraffic="true"'));
    });

    test('iOS declara cámara, bloquea cargas arbitrarias y no contiene placeholders', () {
      final infoPlist = File('ios/Runner/Info.plist').readAsStringSync();

      expect(infoPlist, contains('<key>NSCameraUsageDescription</key>'));
      expect(
        infoPlist,
        contains(RegExp(r'<key>NSAllowsArbitraryLoads</key>\s*<false/>')),
      );
      expect(infoPlist, isNot(contains('REPLACE_WITH_IOS_CLIENT_SUFFIX')));
      expect(infoPlist, contains(r'$(GOOGLE_REVERSED_CLIENT_ID)'));
      expect(infoPlist, contains(r'$(GOOGLE_IOS_CLIENT_ID)'));
    });
  });
}
