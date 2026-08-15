import { registerUser, loginUser, loginWithGoogle } from '../services/authService.js';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminCookieOptions,
} from '../utils/adminSession.js';

function publicUser(user) {
  return { id: user._id ?? user.id, name: user.name, email: user.email, role: user.role };
}

function sendAuthError(res, error, fallbackMessage) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 400;
  const code = error?.code || 'AUTH_ERROR';
  const message = error?.statusCode ? error.message : fallbackMessage;
  return res.status(statusCode).json({ code, message });
}

export async function register(req, res) {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    sendAuthError(res, err, 'No se pudo crear la cuenta');
  }
}

export async function login(req, res) {
  try {
    const { token, user } = await loginUser(req.body.email, req.body.password);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    sendAuthError(res, err, 'No se pudo iniciar sesión');
  }
}

export async function adminLogin(req, res) {
  try {
    const { user } = await loginUser(req.body.email, req.body.password);
    if (user.role !== 'admin') {
      return res.status(403).json({ code: 'ADMIN_REQUIRED', message: 'Acceso administrativo requerido' });
    }

    const { token, csrfToken } = createAdminSessionToken(user);
    res.cookie(ADMIN_SESSION_COOKIE, token, getAdminCookieOptions());
    return res.json({ user: publicUser(user), csrfToken });
  } catch (err) {
    return sendAuthError(res, err, 'No se pudo iniciar sesión');
  }
}

export function adminSession(req, res) {
  return res.json({ user: publicUser(req.user), csrfToken: req.authPayload.csrf });
}

export function adminLogout(_req, res) {
  res.clearCookie(ADMIN_SESSION_COOKIE, getAdminCookieOptions());
  return res.status(204).send();
}

export async function googleLogin(req, res) {
  try {
    const { idToken, intent, termsAccepted } = req.body;
    const { token, user } = await loginWithGoogle({ idToken, intent, termsAccepted });
    res.json({
      token,
      user: publicUser(user),
    });
  } catch (err) {
    sendAuthError(res, err, 'Error en la autenticación con Google');
  }
}

export async function validateToken(req, res) {
  try {
    // El middleware verifyToken ya validó el token y agregó req.user
    // Solo devolvemos los datos del usuario si el token es válido
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    });
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
}
