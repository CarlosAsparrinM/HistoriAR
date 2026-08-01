import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as controller from '../src/controllers/tourSessionsController.js';
import tourSessionService from '../src/services/tourSessionService.js';

function mockRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('tourSessionsController', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('startTourSessionController responde 201 con session', async () => {
    const req = { params: { id: 'tour1' }, user: { id: 'user1' } };
    const res = mockRes();

    const fakeSession = { _id: 's1', tourId: 'tour1' };
    vi.spyOn(tourSessionService, 'startSession').mockResolvedValue(fakeSession);

    await controller.startTourSessionController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status().json).toHaveBeenCalled();
  });

  it('stopTourSessionController responde session', async () => {
    const req = { params: { sessionId: 's1' }, user: { id: 'user1', role: 'user' } };
    const res = mockRes();
    const fake = { _id: 's1', completedAt: new Date() };
    const spy = vi.spyOn(tourSessionService, 'stopSession').mockResolvedValue(fake);

    await controller.stopTourSessionController(req, res);

    expect(spy).toHaveBeenCalledWith({ sessionId: 's1', userId: 'user1', isAdmin: false });
    expect(res.json).toHaveBeenCalledWith(fake);
  });

  it('rateTourSessionController valida rating y responde', async () => {
    const req = {
      params: { sessionId: 's1' },
      body: { rating: 4 },
      user: { id: 'admin1', role: 'admin' },
    };
    const res = mockRes();
    const fake = { _id: 's1', rating: 4 };
    const spy = vi.spyOn(tourSessionService, 'rateSession').mockResolvedValue(fake);

    await controller.rateTourSessionController(req, res);

    expect(spy).toHaveBeenCalledWith({
      sessionId: 's1',
      rating: 4,
      userId: 'admin1',
      isAdmin: true,
    });
    expect(res.json).toHaveBeenCalledWith(fake);
  });

  it.each([0, 6, 2.5, '5'])('rateTourSessionController rechaza rating inválido: %s', async (rating) => {
    const req = {
      params: { sessionId: 's1' },
      body: { rating },
      user: { id: 'user1', role: 'user' },
    };
    const res = mockRes();
    const spy = vi.spyOn(tourSessionService, 'rateSession');

    await controller.rateTourSessionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('getUserTourSessionsController devuelve lista', async () => {
    const req = { user: { id: 'u1' }, query: { limit: '2' } };
    const res = mockRes();
    const list = [{ _id: 's1' }, { _id: 's2' }];
    const spy = vi.spyOn(tourSessionService, 'getUserSessions').mockResolvedValue(list);

    await controller.getUserTourSessionsController(req, res);

    expect(spy).toHaveBeenCalledWith({ userId: 'u1', limit: 2, activeOnly: false });
    expect(res.json).toHaveBeenCalledWith({ total: list.length, items: list });
  });

  it('getUserTourSessionsController soporta activeOnly', async () => {
    const req = { user: { id: 'u1' }, query: { limit: '1', activeOnly: 'true' } };
    const res = mockRes();
    const list = [{ _id: 's1', completedAt: null }];
    const spy = vi.spyOn(tourSessionService, 'getUserSessions').mockResolvedValue(list);

    await controller.getUserTourSessionsController(req, res);

    expect(spy).toHaveBeenCalledWith({ userId: 'u1', limit: 1, activeOnly: true });
    expect(res.json).toHaveBeenCalledWith({ total: list.length, items: list });
  });
});
