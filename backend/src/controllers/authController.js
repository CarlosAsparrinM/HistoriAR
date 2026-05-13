import { registerUser, loginUser, loginWithGoogle } from '../services/authService.js';

export async function register(req, res) {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    const { token, user } = await loginUser(req.body.email, req.body.password);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    const { token, user } = await loginWithGoogle(idToken);
    res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    console.error('Error en login de Google:', err);
    res.status(400).json({ message: 'Error en la autenticación con Google' });
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
