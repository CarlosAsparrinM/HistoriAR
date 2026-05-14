/**
 * Script para generar alertas de ejemplo
 * 
 * Uso: node scripts/seedAlerts.js
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import Alert from '../src/models/Alert.js';

config();

const alerts = [
  {
    type: 'performance',
    severity: 'info',
    title: '📈 Spike de Visitas Detectado',
    message: 'Las visitas aumentaron 45% respecto a la semana anterior. Total de la semana: 1,234',
    data: {
      weeklyVisits: 1234,
      previousWeeklyVisits: 850,
      percentChange: 45
    },
    read: false,
    action: 'view_analytics',
    actionUrl: '/dashboard'
  },
  {
    type: 'anomaly',
    severity: 'warning',
    title: '⚠️ Retención Baja Detectada',
    message: 'Tasa de retención en 28% - Por debajo de lo esperado (objetivo: 40%)',
    data: {
      retentionRate: 28,
      target: 40,
      lastUpdate: new Date()
    },
    read: false,
    action: 'review_data',
    actionUrl: '/dashboard'
  },
  {
    type: 'system',
    severity: 'warning',
    title: '💾 Almacenamiento S3 Bajo',
    message: '82% del almacenamiento S3 está en uso. Se recomienda hacer una limpieza',
    data: {
      percentageUsed: 82,
      totalCapacity: '100 GB'
    },
    read: false,
    action: 'check_system',
    actionUrl: '/settings'
  },
  {
    type: 'milestone',
    severity: 'info',
    title: '🎉 ¡Milestone Alcanzado!',
    message: '¡Se han registrado 5,000 usuarios en HistoriAR!',
    data: {
      milestone: '5000_users',
      totalUsers: 5000
    },
    read: true,
    readAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // Hace 2 horas
  },
  {
    type: 'error',
    severity: 'critical',
    title: '🚨 Error de API Reportado',
    message: 'Endpoint /api/visits retornó 500 errors en los últimos 5 minutos',
    data: {
      endpoint: '/api/visits',
      errorCount: 23,
      errorRate: 0.18
    },
    read: false,
    action: 'check_system',
    actionUrl: '/settings',
    dismissible: false
  },
  {
    type: 'performance',
    severity: 'info',
    title: '🚀 Rendimiento Óptimo',
    message: 'Todos los KPIs están dentro de los parámetros normales',
    data: {
      uptime: '99.99%',
      avgResponseTime: '125ms',
      errorRate: '0.01%'
    },
    read: true,
    readAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Hace 1 hora
    action: 'view_analytics'
  },
  {
    type: 'anomaly',
    severity: 'critical',
    title: '📉 Caída Crítica de Visitas',
    message: 'Las visitas cayeron 65% en la última hora - Posible incidente de sistema',
    data: {
      currentHourVisits: 23,
      previousHourVisits: 65,
      percentChange: -65
    },
    read: false,
    action: 'check_system',
    actionUrl: '/dashboard',
    dismissible: true
  }
];

async function seedAlerts() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/histor-iar';
    
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Limpiar alertas existentes
    console.log('🗑️  Limpiando alertas existentes...');
    await Alert.deleteMany({});

    // Insertar nuevas alertas
    console.log('📝 Creando alertas de ejemplo...');
    const createdAlerts = await Alert.insertMany(alerts);
    console.log(`✅ ${createdAlerts.length} alertas creadas exitosamente`);

    // Mostrar resumen
    const summary = {
      total: await Alert.countDocuments(),
      unread: await Alert.countDocuments({ read: false }),
      critical: await Alert.countDocuments({ severity: 'critical' }),
      warnings: await Alert.countDocuments({ severity: 'warning' })
    };

    console.log('\n📊 Resumen de Alertas:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   No leídas: ${summary.unread}`);
    console.log(`   Críticas: ${summary.critical}`);
    console.log(`   Advertencias: ${summary.warnings}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedAlerts();
