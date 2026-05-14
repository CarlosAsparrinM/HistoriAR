import Alert from '../models/Alert.js';

/**
 * Servicio para generar alertas inteligentes basadas en métricas y eventos
 */
const alertsGenerator = {
  /**
   * Generar alertas de rendimiento
   * Detecta anomalías en visitas (spikes o caídas)
   */
  async generatePerformanceAlerts(currentStats, previousStats) {
    try {
      const alerts = [];

      if (!currentStats || !previousStats) return alerts;

      const visitDelta = currentStats.totalVisits - previousStats.totalVisits;
      const visitPercentChange = ((visitDelta / previousStats.totalVisits) * 100).toFixed(1);
      
      // Alerta por spike de visitas (aumento > 30%)
      if (visitPercentChange > 30) {
        alerts.push({
          type: 'performance',
          severity: 'info',
          title: '📈 Spike de Visitas Detectado',
          message: `Las visitas aumentaron ${visitPercentChange}% respecto al período anterior. Total actual: ${currentStats.totalVisits}`,
          data: {
            currentVisits: currentStats.totalVisits,
            previousVisits: previousStats.totalVisits,
            percentChange: visitPercentChange
          },
          action: 'view_analytics',
          actionUrl: '/dashboard'
        });
      }

      // Alerta por caída de visitas (disminución > 20%)
      if (visitPercentChange < -20) {
        alerts.push({
          type: 'anomaly',
          severity: 'warning',
          title: '📉 Caída de Visitas Reportada',
          message: `Las visitas disminuyeron ${Math.abs(visitPercentChange)}% respecto al período anterior. Total actual: ${currentStats.totalVisits}`,
          data: {
            currentVisits: currentStats.totalVisits,
            previousVisits: previousStats.totalVisits,
            percentChange: visitPercentChange
          },
          action: 'review_data',
          actionUrl: '/dashboard'
        });
      }

      // Alerta de retención baja
      if (currentStats.retentionRate && currentStats.retentionRate < 30) {
        alerts.push({
          type: 'anomaly',
          severity: 'warning',
          title: '⚠️ Retención Baja',
          message: `Tasa de retención en ${currentStats.retentionRate}% - Por debajo de lo esperado (objetivo: 40%)`,
          data: {
            retentionRate: currentStats.retentionRate,
            target: 40
          },
          action: 'review_data',
          actionUrl: '/dashboard'
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating performance alerts:', error);
      return [];
    }
  },

  /**
   * Generar alertas de hitos (milestones)
   */
  async generateMilestoneAlerts(stats) {
    try {
      const alerts = [];

      if (!stats) return alerts;

      // Alerta: 1000 usuarios alcanzados
      if (stats.totalUsers === 1000) {
        alerts.push({
          type: 'milestone',
          severity: 'info',
          title: '🎉 ¡Milestone Alcanzado!',
          message: '¡Se han registrado 1,000 usuarios en HistoriAR!',
          data: { milestone: '1000_users', totalUsers: stats.totalUsers },
          action: 'view_analytics'
        });
      }

      // Alerta: 10,000 visitas totales
      if (stats.totalVisits === 10000) {
        alerts.push({
          type: 'milestone',
          severity: 'info',
          title: '🚀 ¡Milestone Importante!',
          message: '¡Se han completado 10,000 visitas de AR en HistoriAR!',
          data: { milestone: '10000_visits', totalVisits: stats.totalVisits },
          action: 'view_analytics'
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating milestone alerts:', error);
      return [];
    }
  },

  /**
   * Generar alertas de sistema
   */
  async generateSystemAlerts(systemHealth) {
    try {
      const alerts = [];

      if (!systemHealth) return alerts;

      // Alerta: Espacio en S3 bajo
      if (systemHealth.s3PercentageUsed > 80) {
        alerts.push({
          type: 'system',
          severity: 'warning',
          title: '💾 Almacenamiento S3 Bajo',
          message: `${systemHealth.s3PercentageUsed}% del almacenamiento S3 está en uso`,
          data: { percentageUsed: systemHealth.s3PercentageUsed },
          action: 'check_system',
          actionUrl: '/settings'
        });
      }

      // Alerta: Base de datos lenta
      if (systemHealth.dbResponseTime > 1000) {
        alerts.push({
          type: 'system',
          severity: 'warning',
          title: '⏱️ Base de Datos Lenta',
          message: `Tiempo de respuesta de BD: ${systemHealth.dbResponseTime}ms (normal: <200ms)`,
          data: { responseTime: systemHealth.dbResponseTime },
          action: 'check_system',
          actionUrl: '/settings'
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating system alerts:', error);
      return [];
    }
  },

  /**
   * Guardar alertas en base de datos (evitando duplicados)
   */
  async saveAlerts(alertsData) {
    try {
      const savedAlerts = [];

      for (const alertData of alertsData) {
        // Evitar alertas duplicadas en las últimas 24 horas
        const existingAlert = await Alert.findOne({
          type: alertData.type,
          title: alertData.title,
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        });

        if (!existingAlert) {
          const alert = new Alert(alertData);
          const saved = await alert.save();
          savedAlerts.push(saved);
        }
      }

      return savedAlerts;
    } catch (error) {
      console.error('Error saving alerts:', error);
      return [];
    }
  },

  /**
   * Ejecutar generación completa de alertas
   */
  async generateAndSaveAlerts(currentStats, previousStats, systemHealth) {
    try {
      const allAlerts = [];

      // Generar diferentes tipos de alertas
      const performanceAlerts = await this.generatePerformanceAlerts(currentStats, previousStats);
      const milestoneAlerts = await this.generateMilestoneAlerts(currentStats);
      const systemAlerts = await this.generateSystemAlerts(systemHealth);

      allAlerts.push(...performanceAlerts, ...milestoneAlerts, ...systemAlerts);

      // Guardar en base de datos
      if (allAlerts.length > 0) {
        const savedAlerts = await this.saveAlerts(allAlerts);
        console.log(`✅ ${savedAlerts.length} alertas generadas y guardadas`);
        return savedAlerts;
      }

      return [];
    } catch (error) {
      console.error('Error in generateAndSaveAlerts:', error);
      return [];
    }
  }
};

export default alertsGenerator;
