import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Será inicializado después de que dotenv cargue las variables
let client;

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
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('❌ JWT_SECRET no configurado en .env');
  }

  if (!googleClientId) {
    console.warn('⚠️ GOOGLE_CLIENT_ID no configurado en .env - Google login no funcionará');
  }

  client = new OAuth2Client(googleClientId);
}

export async function registerUser(data) {
  const { name, password, district } = data;
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

export async function loginWithGoogle(idToken, isRegister = false) {
  // Validar que el cliente esté inicializado
  if (!client) {
    throw new Error('Google Auth no está inicializado. Verifica GOOGLE_CLIENT_ID en .env');
  }

  // Validar que el idToken no esté vacío
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Token inválido: idToken requerido');
  }

  let ticket;
  try {
    // Verificar el idToken con Google
    ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    // Manejo específico de errores de verificación
    if (err.message?.includes('audience')) {
      throw new Error('Token de Google inválido o no coincide con la configuración');
    }
    if (err.message?.includes('Token used too late')) {
      throw new Error('Token de Google expirado');
    }
    if (err.message?.includes('No ID token')) {
      throw new Error('Token de Google no contiene información de usuario');
    }
    throw new Error(`Error al verificar token de Google: ${err.message}`);
  }

  const payload = ticket.getPayload();

  // Validar que el payload contenga los datos esperados
  if (!payload?.email) {
    throw new Error('Token de Google no contiene email');
  }

  const { email, name, picture } = payload;

  // Se solicita el hash solo para conservar el comportamiento que distingue
  // cuentas locales de cuentas creadas exclusivamente con Google.
  let user = await User.findOne({ email }).select('+password');

  if (isRegister && user) {
    throw new Error('El correo ya está registrado');
  }

  if (!user) {
    // Si no existe, lo creamos con datos de Google
    try {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        role: 'user',
        avatarUrl: picture,
        status: 'Activo',
      });
    } catch (err) {
      // Si falla la creación, probablemente sea un error de base de datos
      throw new Error(`No se pudo crear el usuario: ${err.message}`);
    }
  } else {
    // Validar estado
    if (user.status === 'Eliminado') {
      throw new Error('Esta cuenta ha sido eliminada.');
    }
    if (user.status === 'Suspendido') {
      throw new Error('Esta cuenta está suspendida.');
    }

    // Usuario existe y está activo
    if (!user.password && picture && !user.avatarUrl) {
      user.avatarUrl = picture;
      await user.save();
    }
  }

  // Generar JWT
  const token = jwt.sign(
    { sub: user._id, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  return { token, user };
}
