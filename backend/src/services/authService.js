import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Será inicializado después de que dotenv cargue las variables
let client;

export const TERMS_VERSION = '2026-08-12';
export const PRIVACY_VERSION = '2026-08-12';

function googleAudiences() {
  // GOOGLE_CLIENT_ID is retained temporarily for existing installations.
  // New deployments must configure one client per platform.
  return [
    process.env.GOOGLE_MOBILE_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((value, index, values) => value && values.indexOf(value) === index);
}

export class AuthError extends Error {
  constructor(message, statusCode = 400, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validatePasswordStrength(password) {
  if (typeof password != 'string' || password.length == 0) {
    throw new Error('La contraseña es obligatoria');
  }

  if (password.length < 9) {
    throw new Error('La contraseña debe tener al menos 9 caracteres');
  }

  if (!/^[A-Za-z0-9]+$/.test(password)) {
    throw new Error('La contraseña solo puede contener letras y números');
  }
}

export function initializeGoogleAuth() {
  const audiences = googleAudiences();
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('❌ JWT_SECRET no configurado en .env');
  }

  if (audiences.length === 0) {
    console.warn('⚠️ GOOGLE_MOBILE_CLIENT_ID/GOOGLE_WEB_CLIENT_ID no configurados - Google login no funcionará');
  }

  client = new OAuth2Client();
}

export async function registerUser(data) {
  const { name, password, district, termsAccepted } = data;
  if (termsAccepted !== true) {
    throw new AuthError(
      'Debes aceptar los Términos y Condiciones y la Política de Privacidad',
      400,
      'TERMS_ACCEPTANCE_REQUIRED',
    );
  }
  const email = normalizeEmail(data.email);
  const exists = await User.findOne({ email });
  if (exists) {
    throw new AuthError('El correo ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
  }
  try {
    validatePasswordStrength(password);
  } catch (error) {
    throw new AuthError(error.message, 400, 'WEAK_PASSWORD');
  }
  const hash = password ? await bcrypt.hash(password, 10) : undefined;

  try {
    return await User.create({
      name: String(name).trim(),
      email,
      password: hash,
      district,
      role: 'user',
      status: 'Activo',
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AuthError('El correo ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }
}

export { validatePasswordStrength };

export async function loginUser(email, password) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
  if (!user || !user.password) {
    throw new AuthError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  // Validar estado
  if (user.status === 'Eliminado') {
    throw new AuthError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }
  if (user.status === 'Suspendido') {
    throw new AuthError('Esta cuenta está suspendida.', 403, 'ACCOUNT_SUSPENDED');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new AuthError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { sub: user._id, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
  return { token, user };
}

export async function loginWithGoogle({ idToken, intent, termsAccepted }) {
  if (!['login', 'register'].includes(intent)) {
    throw new AuthError('intent debe ser login o register', 400, 'INVALID_GOOGLE_INTENT');
  }

  // Validar que el cliente esté inicializado
  if (!client) {
    throw new AuthError('Google Auth no está inicializado.', 500, 'GOOGLE_NOT_CONFIGURED');
  }

  // Validar que el idToken no esté vacío
  if (!idToken || typeof idToken !== 'string') {
    throw new AuthError('Token inválido: idToken requerido', 400, 'INVALID_GOOGLE_TOKEN');
  }

  let ticket;
  try {
    const audiences = googleAudiences();
    if (audiences.length === 0) {
      throw new AuthError('Google Sign-In no está configurado en el servidor.', 500, 'GOOGLE_NOT_CONFIGURED');
    }
    // Verificar el idToken con Google
    ticket = await client.verifyIdToken({
      idToken,
      audience: audiences,
    });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    // Manejo específico de errores de verificación
    if (err.message?.includes('audience')) {
      throw new AuthError('Token de Google inválido o no coincide con la configuración', 401, 'INVALID_GOOGLE_TOKEN');
    }
    if (err.message?.includes('Token used too late')) {
      throw new AuthError('Token de Google expirado', 401, 'INVALID_GOOGLE_TOKEN');
    }
    if (err.message?.includes('No ID token')) {
      throw new AuthError('Token de Google no contiene información de usuario', 401, 'INVALID_GOOGLE_TOKEN');
    }
    throw new AuthError('No se pudo verificar el token de Google', 401, 'INVALID_GOOGLE_TOKEN');
  }

  const payload = ticket.getPayload();

  // Validar que el payload contenga los datos esperados
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new AuthError('La cuenta de Google no tiene un correo verificado', 401, 'INVALID_GOOGLE_TOKEN');
  }

  const { sub: googleSubject, email, name, picture } = payload;
  const normalizedEmail = normalizeEmail(email);

  if (intent === 'register' && termsAccepted !== true) {
    throw new AuthError('Debes aceptar los Términos y Condiciones y la Política de Privacidad', 400, 'TERMS_ACCEPTANCE_REQUIRED');
  }

  let user = await User.findOne({ googleSubject }).select('+password');

  if (intent === 'register') {
    if (user || await User.findOne({ email: normalizedEmail })) {
      throw new AuthError('El correo ya está registrado. Inicia sesión o vincula Google desde tu perfil.', 409, 'EMAIL_ALREADY_EXISTS');
    }
    try {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleSubject,
        role: 'user',
        avatarUrl: picture,
        status: 'Activo',
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      });
    } catch (err) {
      if (err?.code === 11000) {
        throw new AuthError('El correo ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
      }
      throw err;
    }
  } else if (!user) {
    throw new AuthError('No existe una cuenta registrada con este Google. Regístrate primero.', 404, 'GOOGLE_ACCOUNT_NOT_FOUND');
  }

  if (user.status === 'Eliminado') {
    throw new AuthError('Esta cuenta ha sido eliminada.', 401, 'INVALID_CREDENTIALS');
  }
  if (user.status === 'Suspendido') {
    throw new AuthError('Esta cuenta está suspendida.', 403, 'ACCOUNT_SUSPENDED');
  }

  // Generar JWT
  const token = jwt.sign(
    { sub: user._id, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  return { token, user };
}
