import { beforeEach, describe, expect, it, vi } from 'vitest';

import TourSession from '../../src/models/TourSession.js';
import tourSessionService from '../../src/services/tourSessionService.js';

describe('tourSessionService ownership', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('busca por sesión y propietario al detener una sesión de usuario', async () => {
    const session = {
      startedAt: new Date(Date.now() - 60_000),
      completedAt: null,
      save: vi.fn().mockResolvedValue(true),
    };
    const findOne = vi.spyOn(TourSession, 'findOne').mockResolvedValue(session);

    await tourSessionService.stopSession({
      sessionId: 'session-1',
      userId: 'user-1',
      isAdmin: false,
    });

    expect(findOne).toHaveBeenCalledWith({ _id: 'session-1', userId: 'user-1' });
    expect(session.save).toHaveBeenCalledOnce();
  });

  it('permite acceso administrativo explícito sin alterar el filtro de usuarios', async () => {
    const session = {
      completedAt: new Date(),
      save: vi.fn(),
    };
    const findOne = vi.spyOn(TourSession, 'findOne').mockResolvedValue(session);

    await tourSessionService.stopSession({
      sessionId: 'session-1',
      userId: 'admin-1',
      isAdmin: true,
    });

    expect(findOne).toHaveBeenCalledWith({ _id: 'session-1' });
  });
});
