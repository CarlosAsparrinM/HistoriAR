import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TourSession from '../src/models/TourSession.js';
import Visit from '../src/models/Visit.js';
import * as visitService from '../src/services/visitService.js';

describe('visitService.createVisit', () => {
  const sandbox = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crea una visita y añade parada a TourSession activa', async () => {
    const data = {
      userId: 'user123',
      monumentId: 'mon1',
      tourId: 'tour1',
      duration: 5,
    };

    const createdVisit = { _id: 'visit1', ...data };

    // Mock Visit.create
    const createSpy = vi.spyOn(Visit, 'create').mockResolvedValue(createdVisit);

    // Mock TourSession.findOne to return a fake session
    const fakeSession = {
      stopsVisited: [],
      totalDuration: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    const findOneSpy = vi.spyOn(TourSession, 'findOne').mockResolvedValue(fakeSession);

    const result = await visitService.createVisit(data);

    expect(createSpy).toHaveBeenCalledWith(data);
    expect(findOneSpy).toHaveBeenCalled();
    expect(fakeSession.stopsVisited.length).toBe(1);
    expect(fakeSession.save).toHaveBeenCalled();
    expect(result).toEqual(createdVisit);
  });

  it('crea una visita y no falla si no existe TourSession', async () => {
    const data = {
      userId: 'userX',
      monumentId: 'monX',
      tourId: 'tourX',
    };

    const createdVisit = { _id: 'visitX', ...data };

    vi.spyOn(Visit, 'create').mockResolvedValue(createdVisit);
    vi.spyOn(TourSession, 'findOne').mockResolvedValue(null);

    const result = await visitService.createVisit(data);

    expect(result).toEqual(createdVisit);
  });

  it('propaga error si Visit.create falla', async () => {
    const data = {
      userId: 'userErr',
      monumentId: 'monErr',
    };

    vi.spyOn(Visit, 'create').mockRejectedValue(new Error('DB error'));
    vi.spyOn(TourSession, 'findOne').mockResolvedValue(null);

    await expect(visitService.createVisit(data)).rejects.toThrow('DB error');
  });

  it('no propaga error si session.save falla (se registra y se ignora)', async () => {
    const data = {
      userId: 'userSave',
      monumentId: 'monSave',
      tourId: 'tourSave',
      duration: 3,
    };

    const createdVisit = { _id: 'visitSave', ...data };
    vi.spyOn(Visit, 'create').mockResolvedValue(createdVisit);

    // session.save falla
    const fakeSession = {
      stopsVisited: [],
      totalDuration: 0,
      save: vi.fn().mockRejectedValue(new Error('save failed')),
    };

    vi.spyOn(TourSession, 'findOne').mockResolvedValue(fakeSession);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await visitService.createVisit(data);

    expect(result).toEqual(createdVisit);
    expect(fakeSession.save).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('devuelve la visita existente para una clave idempotente repetida', async () => {
    const data = {
      userId: 'user-idempotent',
      monumentId: 'mon-idempotent',
      clientVisitId: 'client-visit-1',
    };
    const existingVisit = { _id: 'existing-visit', ...data };

    const findOneSpy = vi
      .spyOn(Visit, 'findOne')
      .mockResolvedValue(existingVisit);
    const createSpy = vi.spyOn(Visit, 'create');

    const result = await visitService.createVisit(data);

    expect(findOneSpy).toHaveBeenCalledWith({
      userId: data.userId,
      clientVisitId: data.clientVisitId,
    });
    expect(createSpy).not.toHaveBeenCalled();
    expect(result).toEqual(existingVisit);
  });
});
