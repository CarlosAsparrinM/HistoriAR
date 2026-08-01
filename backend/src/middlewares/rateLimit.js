const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_KEYS = 10_000;

function defaultKeyGenerator(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Limitador en memoria apropiado para el contenedor Docker actual de una sola
 * instancia. Si el backend se escala horizontalmente, debe reemplazarse por un
 * almacén compartido (por ejemplo Redis) sin cambiar las rutas consumidoras.
 */
export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = 10,
  maxKeys = DEFAULT_MAX_KEYS,
  keyGenerator = defaultKeyGenerator,
  code = 'RATE_LIMIT_EXCEEDED',
  message = 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
  now = () => Date.now(),
} = {}) {
  const attempts = new Map();

  function removeExpiredEntries(currentTime) {
    if (attempts.size < maxKeys) return;

    for (const [key, entry] of attempts.entries()) {
      if (entry.resetAt <= currentTime) attempts.delete(key);
    }

    // Protección de memoria ante ataques con una gran cantidad de claves.
    while (attempts.size >= maxKeys) {
      attempts.delete(attempts.keys().next().value);
    }
  }

  return function rateLimit(req, res, next) {
    const currentTime = now();
    removeExpiredEntries(currentTime);

    const key = String(keyGenerator(req) || 'unknown');
    let entry = attempts.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      entry = { count: 0, resetAt: currentTime + windowMs };
    }

    entry.count += 1;
    attempts.set(key, entry);

    const remaining = Math.max(max - entry.count, 0);
    const retryAfterSeconds = Math.max(
      Math.ceil((entry.resetAt - currentTime) / 1000),
      1,
    );

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ code, message, retryAfterSeconds });
    }

    return next();
  };
}

export default createRateLimiter;
