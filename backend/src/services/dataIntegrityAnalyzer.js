import Monument from '../models/Monument.js';
import Institution from '../models/Institution.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import HistoricalData from '../models/HistoricalData.js';
import Quiz from '../models/Quiz.js';
import Tour from '../models/Tour.js';

/**
 * Servicio de análisis de integridad de datos - VERSIÓN 2.0
 * 
 * ESTRATEGIA DE ALERTAS INTELIGENTES:
 * - Solo alerta sobre campos REQUERIDOS según esquemas MongoDB
 * - Campos opcionales NO generan alertas individuales
 * - Alerta sobre ANOMALÍAS (ej: 80%+ inactivos, 90%+ sin campos)
 * 
 * REQUERIDOS por esquema:
 * - Monument: name, categoryId, location (lat/lng para AR)
 * - Institution: name
 * 
 * OPCIONALES (no generan alertas):
 * - imageUrl, model3DUrl, description, culture, contactEmail, phone, etc.
 */
const dataIntegrityAnalyzer = {
  /**
   * Analizar monumentos sin ubicación (CRÍTICO para AR)
   * La ubicación es esencial para la experiencia AR en HistoriAR
   */
  async checkMissingLocations() {
    try {
      const count = await Monument.countDocuments({
        status: { $ne: 'Borrado' },
        $or: [
          { 'location.lat': { $exists: false } },
          { 'location.lat': null },
          { 'location.lng': { $exists: false } },
          { 'location.lng': null }
        ]
      });

      if (count > 0) {
        const monuments = await Monument.find({
          status: { $ne: 'Borrado' },
          $or: [
            { 'location.lat': { $exists: false } },
            { 'location.lat': null },
            { 'location.lng': { $exists: false } },
            { 'location.lng': null }
          ]
        }).select('_id name').limit(5);

        return {
          type: 'data_quality',
          severity: 'critical',
          title: '📍 Monumentos sin Ubicación (CRÍTICO)',
          message: `${count} monumentos no tienen coordenadas GPS. Esto es esencial para las experiencias AR.`,
          data: {
            count,
            affectedIds: monuments.map(m => m._id)
          },
          action: 'review_data',
          actionUrl: '/monuments'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking monument locations:', error);
      return null;
    }
  },

  /**
   * Analizar monumentos sin categoría (REQUERIDO en esquema)
   */
  async checkMissingCategories() {
    try {
      const count = await Monument.countDocuments({
        status: { $ne: 'Borrado' },
        $or: [
          { categoryId: { $exists: false } },
          { categoryId: null }
        ]
      });

      if (count > 0) {
        const monuments = await Monument.find({
          status: { $ne: 'Borrado' },
          $or: [
            { categoryId: { $exists: false } },
            { categoryId: null }
          ]
        }).select('_id name').limit(5);

        return {
          type: 'data_quality',
          severity: 'critical',
          title: '🏷️ Monumentos sin Categoría (REQUERIDO)',
          message: `${count} monumentos no tienen categoría asignada. Esto es un campo requerido.`,
          data: {
            count,
            affectedIds: monuments.map(m => m._id)
          },
          action: 'review_data',
          actionUrl: '/monuments'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking categories:', error);
      return null;
    }
  },

  /**
   * Analizar monumentos sin imagen (RECOMENDADO)
   */
  async checkMissingMonumentImages() {
    try {
      const count = await Monument.countDocuments({
        status: { $ne: 'Borrado' },
        $or: [
          { imageUrl: { $exists: false } },
          { imageUrl: null },
          { imageUrl: '' }
        ]
      });

      if (count > 0) {
      return {
        type: 'data_quality',
        severity: 'critical',
        title: '🖼️ Monumentos sin Imagen',
        message: `Hay ${count} monumentos que no tienen imagen cargada.`,
        data: { count },
        action: 'Subir imágenes',
        actionUrl: '/monuments'
      };
    }
      return null;
    } catch (error) {
      console.error('Error checking monument images:', error);
      return null;
    }
  },

  /**
   * Analizar monumentos sin modelo 3D (RECOMENDADO para AR)
   */
  async checkMissing3DModels() {
    try {
      const count = await Monument.countDocuments({
        status: { $ne: 'Borrado' },
        $or: [
          { model3DUrl: { $exists: false } },
          { model3DUrl: null },
          { model3DUrl: '' }
        ]
      });

      if (count > 0) {
      return {
        type: 'data_quality',
        severity: 'critical',
        title: '🎯 Monumentos sin Modelo 3D',
        message: `Hay ${count} monumentos sin modelo 3D. Esto limita la experiencia de realidad aumentada.`,
        data: { count },
        action: 'Subir modelos',
        actionUrl: '/monuments'
      };
    }
      return null;
    } catch (error) {
      console.error('Error checking 3D models:', error);
      return null;
    }
  },

  /**
   * Analizar instituciones sin imagen
   */
  async checkMissingInstitutionImages() {
    try {
      const count = await Institution.countDocuments({
        status: { $ne: 'Borrado' },
        $or: [
          { imageUrl: { $exists: false } },
          { imageUrl: null },
          { imageUrl: '' }
        ]
      });

      if (count > 0) {
        return {
          type: 'data_quality',
          severity: 'critical',
          title: '🏛️ Instituciones sin Imagen',
          message: `Hay ${count} instituciones que no tienen imagen cargada.`,
          data: { count },
          action: 'Subir imágenes',
          actionUrl: '/institutions'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking institution images:', error);
      return null;
    }
  },

  /**
   * Analizar monumentos sin ficha histórica
   */
  async checkMissingHistoricalData() {
    try {
      const allMonuments = await Monument.find({ status: { $ne: 'Borrado' } }).select('_id');
      const monumentIds = allMonuments.map(m => m._id);
      
      const monumentsWithData = await HistoricalData.distinct('monumentId', {
        monumentId: { $in: monumentIds }
      });

      const count = monumentIds.length - monumentsWithData.length;

      if (count > 0) {
        return {
          type: 'data_quality',
          severity: 'warning',
          title: '📖 Monumentos sin Ficha Histórica',
          message: `Hay ${count} monumentos disponibles que no tienen una ficha histórica detallada.`,
          data: { count },
          action: 'Agregar fichas',
          actionUrl: '/historical-data'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking historical data:', error);
      return null;
    }
  },

  /**
   * Analizar monumentos sin Quizzes
   */
  async checkMissingQuizzes() {
    try {
      const allMonuments = await Monument.find({ status: { $ne: 'Borrado' } }).select('_id');
      const monumentIds = allMonuments.map(m => m._id);
      
      const monumentsWithQuizzes = await Quiz.distinct('monumentId', {
        monumentId: { $in: monumentIds },
        isActive: true
      });

      const count = monumentIds.length - monumentsWithQuizzes.length;

      if (count > 0) {
        return {
          type: 'data_quality',
          severity: 'info',
          title: '🎮 Monumentos sin Quizzes',
          message: `Hay ${count} monumentos sin trivias activas. Los quizzes aumentan el engagement.`,
          data: { count },
          action: 'Crear quizzes',
          actionUrl: '/quizzes'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking quizzes:', error);
      return null;
    }
  },

  /**
   * Analizar instituciones sin Tours
   */
  async checkMissingTours() {
    try {
      const allInstitutions = await Institution.find({ status: { $ne: 'Borrado' } }).select('_id');
      const institutionIds = allInstitutions.map(i => i._id);
      
      const institutionsWithTours = await Tour.distinct('institutionId', {
        institutionId: { $in: institutionIds }
      });

      const count = institutionIds.length - institutionsWithTours.length;

      if (count > 0) {
        return {
          type: 'data_quality',
          severity: 'info',
          title: '🗺️ Instituciones sin Tours',
          message: `Hay ${count} instituciones que no han organizado sus monumentos en recorridos (Tours).`,
          data: { count },
          action: 'Organizar tours',
          actionUrl: '/tours'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking tours:', error);
      return null;
    }
  },

  /**
   * Analizar usuarios inactivos (solo anomalía)
   */
  async checkInactiveUsers() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const count = await User.countDocuments({
        role: 'user',
        status: { $ne: 'Eliminado' },
        $or: [
          { lastLogin: { $lt: thirtyDaysAgo } },
          { lastLogin: { $exists: false } }
        ]
      });

      const total = await User.countDocuments({ 
        role: 'user',
        status: { $ne: 'Eliminado' } 
      });
      if (total === 0) return null;

      const percentageInactive = (count / total) * 100;

      // Solo alerta si hay anomalía: 80%+ inactivos
      if (percentageInactive > 80) {
        return {
          type: 'performance',
          severity: 'warning',
          title: '⚠️ Anomalía: Muchos Usuarios Inactivos',
          message: `${percentageInactive.toFixed(0)}% de usuarios (${count}/${total}) no acceden hace >30 días.`,
          data: {
            count,
            total,
            percentage: Math.round(percentageInactive)
          },
          action: 'review_data',
          actionUrl: '/users'
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking inactive users:', error);
      return null;
    }
  },

  /**
   * Ejecutar análisis completo de integridad de datos
   * Solo verifica campos requeridos y anomalías críticas
   */
  async analyzeAllData() {
    try {
      const alerts = [];

      // Ejecutar análisis en paralelo (solo los relevantes)
      const results = await Promise.all([
        this.checkMissingLocations(),        // CRÍTICO: necesario para AR
        this.checkMissingCategories(),       // CRÍTICO: campo requerido
        this.checkMissingMonumentImages(),   // CRÍTICO: sin imagen
        this.checkMissing3DModels(),         // CRÍTICO: sin modelo 3D
        this.checkMissingInstitutionImages(), // CRÍTICO: sin imagen
        this.checkMissingHistoricalData(),   // WARNING: sin ficha
        this.checkMissingQuizzes(),          // INFO: sin quizzes
        this.checkMissingTours(),            // INFO: sin tours
        this.checkInactiveUsers()            // WARNING: anomalía de inactividad
      ]);

      // Filtrar alertas nulas y agregar metadata
      results.forEach(alert => {
        if (alert) {
          alerts.push({
            ...alert,
            read: false,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            dismissible: true
          });
        }
      });

      console.log(`[Integrity Analyzer] Generadas ${alerts.length} alertas de calidad`);
      return alerts;
    } catch (error) {
      console.error('Error in analyzeAllData:', error);
      return [];
    }
  }
};

export default dataIntegrityAnalyzer;
