import User from '../models/User.js';
import Visit from '../models/Visit.js';

/**
 * Helpers de fecha — reemplazan moment.js con Date nativo
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function subtractDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function subtractMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function subtractYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/**
 * Obtiene las estadísticas para el dashboard con filtros de tiempo
 */
export async function getDashboardStats(req, res) {
  try {
    const { period, customStartDate, customEndDate } = req.query;

    // El dashboard nunca muestra el día actual
    const now = new Date();
    const yesterday = endOfDay(subtractDays(now, 1));

    let startDate;
    let endDate = yesterday;

    switch (period) {
      case 'yesterday':
        startDate = startOfDay(subtractDays(now, 1));
        break;
      case 'week':
        startDate = startOfDay(subtractDays(now, 7));
        break;
      case 'month':
        startDate = startOfDay(subtractMonths(now, 1));
        break;
      case '3months':
        startDate = startOfDay(subtractMonths(now, 3));
        break;
      case 'year':
        startDate = startOfDay(subtractYears(now, 1));
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate));
          const requestedEnd = endOfDay(new Date(customEndDate));
          endDate = requestedEnd > yesterday ? yesterday : requestedEnd;
        } else {
          startDate = startOfDay(subtractDays(now, 7));
        }
        break;
      default:
        startDate = startOfDay(subtractDays(now, 7));
    }

    // 1. Usuarios totales (solo usuarios de la app, excluye administradores y eliminados)
    const totalUsers = await User.countDocuments({
      role: 'user',
      status: { $ne: 'Eliminado' },
      createdAt: { $lte: endDate },
    });

    // 2. Visitas totales en el rango
    const totalVisits = await Visit.countDocuments({
      date: { $gte: startDate, $lte: endDate },
    });

    // 3. Sesiones AR en el rango
    const arSessions = await Visit.countDocuments({
      date: { $gte: startDate, $lte: endDate },
      isAR: true,
    });

    // 4. Tiempo promedio de sesión (en minutos)
    const avgDurationResult = await Visit.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          duration: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    const avgSessionTime =
      avgDurationResult.length > 0
        ? Math.round(avgDurationResult[0].avgDuration * 10) / 10
        : 0;

    res.json({
      range: {
        start: startDate,
        end: endDate,
      },
      metrics: {
        totalUsers,
        totalVisits,
        arSessions,
        avgSessionTime,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard' });
  }
}
