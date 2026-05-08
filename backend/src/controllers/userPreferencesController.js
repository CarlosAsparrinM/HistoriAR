import userPreferencesService from '../services/userPreferencesService.js';

/**
 * Obtener preferencias de usuario
 */
export async function getUserPreferencesController(req, res) {
  try {
    const userId = req.params.id;

    // Verificar que el usuario solo acceda a sus propias preferencias (o sea admin)
    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const preferences = await userPreferencesService.getUserPreferences(userId);
    res.json(preferences);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Actualizar preferencias de usuario
 */
export async function updateUserPreferencesController(req, res) {
  try {
    const userId = req.params.id;

    // Verificar que el usuario solo actualice sus propias preferencias (o sea admin)
    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const preferences = await userPreferencesService.updateUserPreferences(userId, req.body);
    res.json(preferences);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
