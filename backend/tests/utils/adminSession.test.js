import { afterEach, describe, expect, it } from 'vitest';
import { csrfMatches, getAdminCookieOptions, readCookie } from '../../src/utils/adminSession.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('admin session utilities', () => {
  it('emite cookies HttpOnly y Secure en produccion', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_COOKIE_SAME_SITE = 'lax';

    expect(getAdminCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api',
    });
  });

  it('fuerza Secure cuando SameSite es none', () => {
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_COOKIE_SAME_SITE = 'none';

    expect(getAdminCookieOptions()).toMatchObject({ secure: true, sameSite: 'none' });
  });

  it('lee cookies codificadas y compara CSRF de forma segura', () => {
    const req = { headers: { cookie: 'other=1; target=value%20encoded' } };

    expect(readCookie(req, 'target')).toBe('value encoded');
    expect(csrfMatches('same-value', 'same-value')).toBe(true);
    expect(csrfMatches('same-value', 'different')).toBe(false);
  });
});
