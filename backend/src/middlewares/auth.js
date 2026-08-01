import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ADMIN_SESSION_COOKIE, csrfMatches, readCookie } from '../utils/adminSession.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * ✅ Verifica el token JWT y adjunta los datos del usuario al request
 */
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = bearerToken ? null : readCookie(req, ADMIN_SESSION_COOKIE);
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Token faltante' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (cookieToken && payload.tokenUse !== 'admin-session') {
      return res.status(401).json({ message: 'Sesión administrativa inválida' });
    }
    if (bearerToken && payload.tokenUse === 'admin-session') {
      return res.status(401).json({ message: 'Token inválido para este canal' });
    }
    if (cookieToken && !safeMethods.has(req.method)
        && !csrfMatches(payload.csrf, req.get('X-CSRF-Token'))) {
      return res.status(403).json({ code: 'CSRF_INVALID', message: 'Protección CSRF inválida' });
    }
    
    // Verificar el estado del usuario en la base de datos
    const user = await User.findById(payload.sub).select('name email role status');
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    if (user.status === 'Suspendido') {
      return res.status(403).json({ message: 'ACCOUNT_SUSPENDED' });
    }
    if (user.status === 'Eliminado') {
      return res.status(401).json({ message: 'Esta cuenta ha sido eliminada' });
    }

    // Normalizamos para que todos los controladores usen req.user.id
    req.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      email: user.email,
    };
    req.authSource = cookieToken ? 'admin-cookie' : 'bearer';
    req.authPayload = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function requireAdminSession(req, res, next) {
  if (req.authSource !== 'admin-cookie') {
    return res.status(401).json({ message: 'Sesión administrativa requerida' });
  }
  next();
}

/**
 * ✅ Verifica que el usuario tenga uno de los roles permitidos
 * @param  {...string} roles - roles válidos (ej. 'admin', 'editor')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
}
