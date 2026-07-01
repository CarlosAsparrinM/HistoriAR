import Tour from '../models/Tour.js';
import TourSession from '../models/TourSession.js';

class TourSessionService {
  async startSession({ userId, tourId }) {
    const tour = await Tour.findById(tourId);
    if (!tour) throw new Error('Tour not found');

    const activeSessions = await TourSession.find({
      userId,
      completedAt: null,
    }).sort({ createdAt: -1 });
    const now = new Date();
    let reusableSession = null;

    await Promise.all(activeSessions.map(async (session) => {
      if (!reusableSession && session.tourId?.toString() === tourId.toString()) {
        reusableSession = session;
        return;
      }

      this._completeSession(session, now);
      await session.save();
    }));

    if (reusableSession) return reusableSession;

    const session = new TourSession({
      userId,
      tourId,
      institutionId: tour.institutionId,
      startedAt: now,
      stopsVisited: [],
    });

    await session.save();
    return session;
  }

  async stopSession({ sessionId }) {
    const session = await TourSession.findById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.completedAt) return session;

    this._completeSession(session);
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
      .populate({
        path: 'tourId',
        populate: [
          { path: 'monuments.monumentId' },
          { path: 'institutionId' },
        ],
      })
      .populate('stopsVisited.monumentId')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  _completeSession(session, completedAt = new Date()) {
    session.completedAt = completedAt;
    if (session.startedAt) {
      session.totalDuration = Math.round((completedAt - session.startedAt) / 60000);
    }
  }
}

export default new TourSessionService();
