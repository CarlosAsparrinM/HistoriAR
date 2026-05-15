import api from './api';

const alertsService = {
  /**
   * Obtener alertas de integridad de datos (análisis en tiempo real de la BD)
   */
  async getDataIntegrityAlerts() {
    const response = await api.get('/alerts/integrity-check');
    return response.data;
  },

  /**
   * Obtener resumen de problemas de integridad
   */
  async getDataIntegritySummary() {
    const response = await api.get('/alerts/integrity-summary');
    return response.data;
  },

  /**
   * Obtener todas las alertas con filtros opcionales
   */
  async getAllAlerts(limit = 20, offset = 0, read = null, severity = null) {
    const params = { limit, offset };
    if (read !== null) params.read = read;
    if (severity) params.severity = severity;
    
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  /**
   * Obtener resumen de alertas (total, no leídas, críticas, etc)
   */
  async getAlertsSummary() {
    const response = await api.get('/alerts/summary');
    return response.data;
  },

  /**
   * Obtener alerta por ID
   */
  async getAlertById(id) {
    const response = await api.get(`/alerts/${id}`);
    return response.data;
  },

  /**
   * Crear nueva alerta
   */
  async createAlert(alertData) {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  /**
   * Marcar alerta como leída
   */
  async markAsRead(id) {
    const response = await api.patch(`/alerts/${id}/read`);
    return response.data;
  },

  /**
   * Marcar alerta como no leída
   */
  async markAsUnread(id) {
    const response = await api.patch(`/alerts/${id}/unread`);
    return response.data;
  },

  /**
   * Descartar alerta
   */
  async dismissAlert(id) {
    const response = await api.patch(`/alerts/${id}/dismiss`);
    return response.data;
  },

  /**
   * Marcar todas las alertas como leídas
   */
  async markAllAsRead() {
    const response = await api.patch('/alerts/mark-all-read');
    return response.data;
  },

  /**
   * Eliminar alerta
   */
  async deleteAlert(id) {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  }
};

export default alertsService;
