import Tour from '../models/Tour.js';
import TourSession from '../models/TourSession.js';

class TourSessionService {
  async startSession({ userId, tourId }) {
    const tour = await Tour.findById(tourId);
    if (!tour) throw new Error('Tour not found');

    const session = new TourSession({
      userId,
      tourId,
      institutionId: tour.institutionId,
      startedAt: new Date(),
      stopsVisited: [],
    });

    await session.save();
    return session;
  }

  async stopSession({ sessionId }) {
    const session = await TourSession.findById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.completedAt) return session;

    session.completedAt = new Date();
    // Calcular totalDuration si hay startedAt
    if (session.startedAt) {
      session.totalDuration = Math.round((session.completedAt - session.startedAt) / 60000);
    }

    await session.save();
    return session;
  }

  async rateSession({ sessionId, rating }) {
    const session = await TourSession.findById(sessionId);
    if (!session) throw new Error('Session not found');

    session.rating = rating;
    await session.save();
    return session;
  }

  async getUserSessions({ userId, limit = 20 }) {
    return await TourSession.find({ userId })
      .populate('tourId')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

export default new TourSessionService();
