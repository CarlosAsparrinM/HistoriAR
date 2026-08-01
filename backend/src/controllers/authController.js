import { registerUser, loginUser, loginWithGoogle } from '../services/authService.js';

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
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    sendAuthError(res, err, 'No se pudo iniciar sesión');
  }
}

export async function googleLogin(req, res) {
  try {
    const { idToken, isRegister } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'idToken requerido' });
    }

    const { token, user } = await loginWithGoogle(idToken, isRegister);
    res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    console.error('Error en login de Google:', err.message);
    
    // Mensajes de error específicos según el tipo de error
    const errorMessage = err.message || 'Error en la autenticación con Google';
    const statusCode = errorMessage.includes('Configuración') ? 500 : 400;
    
    res.status(statusCode).json({ message: errorMessage });
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
