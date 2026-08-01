import { randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const ADMIN_SESSION_COOKIE = 'historiar_admin_session';

const allowedSameSiteValues = new Set(['lax', 'strict', 'none']);

export function getAdminCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(process.env.ADMIN_COOKIE_SAME_SITE || 'lax').toLowerCase();
  const sameSite = allowedSameSiteValues.has(configuredSameSite) ? configuredSameSite : 'lax';

  return {
    httpOnly: true,
    secure: production || sameSite === 'none',
    sameSite,
    path: '/api',
  };
}

export function createAdminSessionToken(user) {
  const csrfToken = randomBytes(32).toString('base64url');
  const token = jwt.sign(
    {
      sub: user._id,
      tokenUse: 'admin-session',
      csrf: csrfToken,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_SESSION_EXPIRES_IN || '8h' },
  );

  return { token, csrfToken };
}

export function readCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== 'string') return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

export function csrfMatches(expected, received) {
  if (typeof expected !== 'string' || typeof received !== 'string') return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
}
