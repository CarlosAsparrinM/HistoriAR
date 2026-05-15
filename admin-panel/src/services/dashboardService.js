import api from './api.js';

/**
 * Servicio de Dashboard - Gestiona todas las llamadas a API para el dashboard
 * Obtiene métricas agregadas desde el backend
 */

/**
 * Obtiene las estadísticas principales del dashboard
 * @param {string|Object} dateRange - Preset (string) o rango personalizado (Object)
 */
export async function getDashboardStats(dateRange = 'week') {
  try {
    let params = {};
    
    if (typeof dateRange === 'string') {
      params.period = dateRange;
    } else if (dateRange.startDate && dateRange.endDate) {
      params.period = 'custom';
      // Formatear fechas para la API
      params.customStartDate = dateRange.startDate.toISOString();
      params.customEndDate = dateRange.endDate.toISOString();
    } else {
      params.period = 'week';
    }

    // Llamada al nuevo endpoint del backend
    const response = await api.get('/stats/dashboard', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Nota: Otras funciones como getComparisonMetrics, getMonthlyTrends, etc. 
 * deberán ser migradas al backend según sea necesario. 
 * Por ahora centralizamos las métricas principales solicitadas.
 */

export default {
  getDashboardStats
};
