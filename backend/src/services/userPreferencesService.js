import UserPreferences from '../models/UserPreferences.js';

class UserPreferencesService {
  /**
   * Obtener preferencias de usuario (crea por defecto si no existen)
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Preferencias del usuario
   */
  async getUserPreferences(userId) {
    try {
      let preferences = await UserPreferences.findOne({ userId });
      
      // Si no existen, crear preferencias por defecto
      if (!preferences) {
        preferences = new UserPreferences({
          userId,
          askForQuizzes: true
        });
        await preferences.save();
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }
  }

  /**
   * Actualizar preferencias de usuario
   * @param {string} userId - ID del usuario
   * @param {Object} preferences - Preferencias a actualizar
   * @returns {Promise<Object>} Preferencias actualizadas
   */
  async updateUserPreferences(userId, preferences) {
    try {
      // Validar campos permitidos
      const allowedFields = ['askForQuizzes'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (preferences[field] !== undefined) {
          updateData[field] = preferences[field];
        }
      }
      
      // Actualizar o crear si no existe
      const updatedPreferences = await UserPreferences.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      
      return updatedPreferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  /**
   * Verificar si usuario quiere recibir quizzes
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} True si quiere recibir quizzes
   */
  async shouldAskForQuizzes(userId) {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.askForQuizzes;
    } catch (error) {
      console.error('Error checking quiz preferences:', error);
      // Por defecto, retornar true si hay error
      return true;
    }
  }
}

export default new UserPreferencesService();
