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
    const session = await tourSessionService.stopSession({ sessionId });
    res.json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function rateTourSessionController(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const { rating } = req.body;
    if (typeof rating !== 'number') throw new Error('Rating must be a number');
    const session = await tourSessionService.rateSession({ sessionId, rating });
    res.json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function getUserTourSessionsController(req, res) {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sessions = await tourSessionService.getUserSessions({ userId, limit });
    res.json({ total: sessions.length, items: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
