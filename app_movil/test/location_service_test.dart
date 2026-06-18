import 'package:flutter_test/flutter_test.dart';

import 'package:app_movil/services/location_service.dart';

void main() {
  final now = DateTime.utc(2026, 6, 14, 12);

  test('accepts only recent, non-future GPS timestamps', () {
    expect(
      isRecentLocationTimestamp(
        now.subtract(const Duration(minutes: 10)),
        now: now,
      ),
      isTrue,
    );
    expect(
      isRecentLocationTimestamp(
        now.subtract(const Duration(minutes: 16)),
        now: now,
      ),
      isFalse,
    );
    expect(
      isRecentLocationTimestamp(now.add(const Duration(seconds: 1)), now: now),
      isFalse,
    );
    expect(isRecentLocationTimestamp(null, now: now), isFalse);
  });
}
