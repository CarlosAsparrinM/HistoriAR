import tourSessionService from '../services/tourSessionService.js';

export async function startTourSessionController(req, res) {
  try {
    const userId = req.user?.id;
    const tourId = req.params.id;
    const session = await tourSessionService.startSession({ userId, tourId });
    res.status(201).json({ id: session._id, session });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function stopTourSessionController(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const session = await tourSessionService.stopSession({
      sessionId,
      userId: req.user?.id,
      isAdmin: req.user?.role === 'admin',
    });
    res.json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function rateTourSessionController(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const { rating } = req.body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    const session = await tourSessionService.rateSession({
      sessionId,
      rating,
      userId: req.user?.id,
      isAdmin: req.user?.role === 'admin',
    });
    res.json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function getUserTourSessionsController(req, res) {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const activeOnly = req.query.activeOnly === 'true';
    const sessions = await tourSessionService.getUserSessions({
      userId,
      limit,
      activeOnly
    });
    res.json({ total: sessions.length, items: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
