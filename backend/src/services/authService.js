import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

// Será inicializado después de que dotenv cargue las variables
let client;

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
  const { name, email, password, role, district, status } = data;
  const exists = await User.findOne({ email });
  if (exists) throw new Error('El correo ya está registrado');
  const hash = password ? await bcrypt.hash(password, 10) : undefined;
  return await User.create({ name, email, password: hash, role, district, status });
}

export async function loginUser(email, password) {
  const user = await User.findOne({ email });
  if (!user || !user.password) throw new Error('Credenciales inválidas');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('Credenciales inválidas');

  const token = jwt.sign(
    { sub: user._id, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { token, user };
}

export async function loginWithGoogle(idToken) {
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

  let user = await User.findOne({ email });

  if (!user) {
    // Si no existe, lo creamos con datos de Google
    try {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        role: 'user',
        avatarUrl: picture,
        status: 'Activo'
      });
    } catch (err) {
      // Si falla la creación, probablemente sea un error de base de datos
      throw new Error(`No se pudo crear el usuario: ${err.message}`);
    }
  } else if (!user.password) {
    // Usuario existe pero se registró con Google previamente
    // Actualizar avatar si es necesario
    if (picture && !user.avatarUrl) {
      user.avatarUrl = picture;
      await user.save();
    }
  }

  // Generar JWT
  const token = jwt.sign(
    { sub: user._id, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { token, user };
}
