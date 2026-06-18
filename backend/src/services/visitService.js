import TourSession from '../models/TourSession.js';
import Visit from '../models/Visit.js';

export async function getAllVisits(filter = {}, { skip = 0, limit = 10 } = {}) {
  const [items, total] = await Promise.all([
    Visit.find(filter).skip(skip).limit(limit),
    Visit.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getVisitById(id) {
  return await Visit.findById(id);
}

export async function createVisit(data) {
  let visit;
  if (data.clientVisitId && data.userId) {
    const existingVisit = await Visit.findOne({
      userId: data.userId,
      clientVisitId: data.clientVisitId,
    });
    if (existingVisit) return existingVisit;
  }

  try {
    visit = await Visit.create(data);
  } catch (error) {
    if (error?.code === 11000 && data.clientVisitId && data.userId) {
      const existingVisit = await Visit.findOne({
        userId: data.userId,
        clientVisitId: data.clientVisitId,
      });
      if (existingVisit) return existingVisit;
    }
    throw error;
  }

  // Si la visita pertenece a un tour, intentar registrar la parada en la TourSession activa
  try {
    if (data.tourId && data.userId) {
      const session = await TourSession.findOne({
        userId: data.userId,
        tourId: data.tourId,
        completedAt: null,
      });

      if (session) {
        const stop = {
          monumentId: data.monumentId,
          visitedAt: data.date ? new Date(data.date) : new Date(),
          duration: data.duration,
        };

        session.stopsVisited.push(stop);
        // Actualizar duración total acumulada si duration está presente
        if (typeof data.duration === 'number') {
          session.totalDuration = (session.totalDuration || 0) + data.duration;
        }

        await session.save();
      }
    }
  } catch (err) {
    // No bloquear el flujo de creación de visitas si hay error en TourSession
    console.error('Error registering stop in TourSession:', err.message);
  }

  return visit;
}

export async function updateVisit(id, data) {
  return await Visit.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteVisit(id) {
  return await Visit.findByIdAndDelete(id);
}

export async function getAverageDuration(monumentId) {
  const result = await Visit.aggregate([
    { $match: { monumentId } },
    { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
  ]);
  return result[0]?.avgDuration || 0;
}
