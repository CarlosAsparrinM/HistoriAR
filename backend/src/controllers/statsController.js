import User from '../models/User.js';
import Visit from '../models/Visit.js';
import moment from 'moment';

/**
 * Obtiene las estadísticas para el dashboard con filtros de tiempo
 */
export async function getDashboardStats(req, res) {
  try {
    const { period, customStartDate, customEndDate } = req.query;
    
    // El dashboard nunca muestra el día actual
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'days').endOf('day');
    
    let startDate, endDate;
    endDate = yesterday.toDate();

    switch (period) {
      case 'yesterday':
        startDate = moment().subtract(1, 'days').startOf('day').toDate();
        break;
      case 'week':
        startDate = moment().subtract(1, 'weeks').startOf('day').toDate();
        break;
      case 'month':
        startDate = moment().subtract(1, 'months').startOf('day').toDate();
        break;
      case '3months':
        startDate = moment().subtract(3, 'months').startOf('day').toDate();
        break;
      case 'year':
        startDate = moment().subtract(1, 'years').startOf('day').toDate();
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = moment(customStartDate).startOf('day').toDate();
          // Asegurar que el fin no sea después de ayer
          const requestedEndDate = moment(customEndDate).endOf('day');
          endDate = requestedEndDate.isAfter(yesterday) ? yesterday.toDate() : requestedEndDate.toDate();
        } else {
          startDate = moment().subtract(1, 'weeks').startOf('day').toDate();
        }
        break;
      default:
        startDate = moment().subtract(1, 'weeks').startOf('day').toDate();
    }

    // 1. Usuarios totales (Solo usuarios de la app, excluye administradores y eliminados)
    const totalUsers = await User.countDocuments({ 
      role: 'user',
      status: { $ne: 'Eliminado' },
      createdAt: { $lte: endDate } 
    });

    // 2. Visitas totales en el rango
    const totalVisits = await Visit.countDocuments({
      date: { $gte: startDate, $lte: endDate }
    });

    // 3. Sesiones AR en el rango
    const arSessions = await Visit.countDocuments({
      date: { $gte: startDate, $lte: endDate },
      isAR: true
    });

    // 4. Tiempo promedio de sesión (en minutos)
    const avgDurationResult = await Visit.aggregate([
      { 
        $match: { 
          date: { $gte: startDate, $lte: endDate },
          duration: { $exists: true, $ne: null }
        } 
      },
      { 
        $group: { 
          _id: null, 
          avgDuration: { $avg: "$duration" } 
        } 
      }
    ]);

    const avgSessionTime = avgDurationResult.length > 0 
      ? Math.round(avgDurationResult[0].avgDuration * 10) / 10 
      : 0;

    res.json({
      range: {
        start: startDate,
        end: endDate
      },
      metrics: {
        totalUsers,
        totalVisits,
        arSessions,
        avgSessionTime
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard' });
  }
}
