import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  const { email, name, picture } = payload;

  let user = await User.findOne({ email });

  if (!user) {
    // Si no existe, lo creamos
    user = await User.create({
      name,
      email,
      role: 'user',
      avatarUrl: picture,
      status: 'Activo'
    });
  }

  const token = jwt.sign(
    { sub: user._id, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { token, user };
}
