import 'package:flutter_test/flutter_test.dart';

import 'package:app_movil/controllers/ar_camera_ar_controller.dart';
import 'package:app_movil/utils/model_cache_manager.dart';

void main() {
  test('AR retry limiter stops after its configured limit', () {
    final limiter = ArRetryLimiter(maxRetries: 3);

    expect(limiter.registerFailure(), isTrue);
    expect(limiter.registerFailure(), isTrue);
    expect(limiter.registerFailure(), isTrue);
    expect(limiter.registerFailure(), isFalse);
    expect(limiter.attempts, 3);

    limiter.reset();
    expect(limiter.attempts, 0);
    expect(limiter.registerFailure(), isTrue);
  });

  test('model cache accepts only the GLB magic header', () {
    expect(ModelCacheManager.hasGlbHeader([0x67, 0x6C, 0x54, 0x46]), isTrue);
    expect(ModelCacheManager.hasGlbHeader([0x50, 0x4B, 0x03, 0x04]), isFalse);
    expect(ModelCacheManager.hasGlbHeader([0x67, 0x6C]), isFalse);
  });

  test('model cache handles invalid URLs as a cache miss', () async {
    final result = await ModelCacheManager.getCachedModel(
      'http://[invalid-url',
      'monument-1',
    );

    expect(result, isNull);
  });
}
