import Tour from '../models/Tour.js';
import TourSession from '../models/TourSession.js';

const SESSION_TOUR_MONUMENT_FIELDS = [
  'name',
  'description',
  'status',
  'location',
  'culture',
  'period',
  'discovery',
  'imageUrl',
  's3ImageKey',
  'model3DUrl',
  's3ModelKey'
].join(' ');

const SESSION_TOUR_INSTITUTION_FIELDS = 'name description imageUrl status location';

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

  async stopSession({ sessionId, userId, isAdmin = false }) {
    const filter = { _id: sessionId };
    if (!isAdmin) filter.userId = userId;
    const session = await TourSession.findOne(filter);
    if (!session) throw new Error('Session not found');
    if (session.completedAt) return session;

    this._completeSession(session);
    await session.save();
    return session;
  }

  async rateSession({ sessionId, rating, userId, isAdmin = false }) {
    const filter = { _id: sessionId };
    if (!isAdmin) filter.userId = userId;
    const session = await TourSession.findOne(filter);
    if (!session) throw new Error('Session not found');

    session.rating = rating;
    await session.save();
    return session;
  }

  async getUserSessions({ userId, limit = 20, activeOnly = false }) {
    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const filter = { userId };
    if (activeOnly) filter.completedAt = null;

    return await TourSession.find(filter)
      .populate({
        path: 'tourId',
        populate: [
          { path: 'monuments.monumentId', select: SESSION_TOUR_MONUMENT_FIELDS },
          { path: 'institutionId', select: SESSION_TOUR_INSTITUTION_FIELDS },
        ],
      })
      .populate({
        path: 'stopsVisited.monumentId',
        select: SESSION_TOUR_MONUMENT_FIELDS
      })
      .sort({ createdAt: -1 })
      .limit(normalizedLimit)
      .lean();
  }

  _completeSession(session, completedAt = new Date()) {
    session.completedAt = completedAt;
    if (session.startedAt) {
      session.totalDuration = Math.round((completedAt - session.startedAt) / 60000);
    }
  }
}

export default new TourSessionService();
