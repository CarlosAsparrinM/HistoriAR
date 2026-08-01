import { describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from '../../src/middlewares/rateLimit.js';

function createResponse() {
  const headers = {};
  const json = vi.fn();
  const response = {
    setHeader: vi.fn((name, value) => {
      headers[name] = value;
    }),
    status: vi.fn(() => ({ json })),
  };
  return { response, headers, json };
}

describe('createRateLimiter', () => {
  it('bloquea solicitudes posteriores al límite y expone Retry-After', () => {
    let currentTime = 1_000;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      now: () => currentTime,
    });
    const req = { ip: '127.0.0.1' };
    const next = vi.fn();

    limiter(req, createResponse().response, next);
    limiter(req, createResponse().response, next);
    const blocked = createResponse();
    limiter(req, blocked.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.response.status).toHaveBeenCalledWith(429);
    expect(blocked.headers['Retry-After']).toBe('60');
    expect(blocked.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RATE_LIMIT_EXCEEDED',
    }));

    currentTime += 60_001;
    limiter(req, createResponse().response, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
