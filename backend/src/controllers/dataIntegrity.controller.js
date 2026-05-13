import dataIntegrityAnalyzer from '../services/dataIntegrityAnalyzer.js';

// Cache reducida para mayor reactividad
let integrityCache = {
  data: null,
  timestamp: null,
  TTL: 30 * 1000 // 30 segundos (antes 10 min)
};

/**
 * Obtener alertas de integridad de datos basadas en el análisis de la BD
 * GET /api/alerts/integrity-check
 */
export const getDataIntegrityAlerts = async (req, res) => {
  try {
    const now = Date.now();
    
    // Verificar si hay datos en caché y si no han expirado
    if (integrityCache.data && integrityCache.timestamp && (now - integrityCache.timestamp) < integrityCache.TTL) {
      console.log('✅ Alertas de integridad desde caché (hace ' + Math.round((now - integrityCache.timestamp) / 1000) + 's)');
      return res.json({
        data: integrityCache.data,
        total: integrityCache.data.length,
        timestamp: new Date(),
        cached: true,
        message: `Se encontraron ${integrityCache.data.length} problemas en los datos (datos en caché)`
      });
    }
    
    console.log('🔍 Analizando integridad de datos (no hay caché)...');
    
    const alerts = await dataIntegrityAnalyzer.analyzeAllData();
    
    // Guardar en caché
    integrityCache.data = alerts;
    integrityCache.timestamp = now;
    
    console.log(`✅ Análisis completado: ${alerts.length} problemas encontrados`);
    
    res.json({
      data: alerts,
      total: alerts.length,
      timestamp: new Date(),
      cached: false,
      message: `Se encontraron ${alerts.length} problemas en los datos`
    });
  } catch (error) {
    console.error('Error in getDataIntegrityAlerts:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Limpiar caché manualmente (útil para debug)
 * POST /api/alerts/integrity-cache-clear
 */
export const clearIntegrityCache = async (req, res) => {
  integrityCache = {
    data: null,
    timestamp: null,
    TTL: 10 * 60 * 1000
  };
  res.json({ message: 'Caché de integridad limpiado' });
};

/**
 * Obtener resumen de problemas por categoría
 * GET /api/alerts/integrity-summary
 */
export const getDataIntegritySummary = async (req, res) => {
  try {
    const alerts = await dataIntegrityAnalyzer.analyzeAllData();
    
    // Contar por severidad
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      byType: {}
    };

    // Contar por tipo
    alerts.forEach(alert => {
      if (!summary.byType[alert.type]) {
        summary.byType[alert.type] = 0;
      }
      summary.byType[alert.type]++;
    });

    res.json(summary);
  } catch (error) {
    console.error('Error in getDataIntegritySummary:', error);
    res.status(500).json({ error: error.message });
  }
};
