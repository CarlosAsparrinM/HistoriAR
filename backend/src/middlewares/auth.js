import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * ✅ Verifica el token JWT y adjunta los datos del usuario al request
 */
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token faltante' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
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
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
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
