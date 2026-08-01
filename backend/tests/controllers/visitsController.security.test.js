import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/visitService.js', () => ({
  createVisit: vi.fn(),
  deleteVisit: vi.fn(),
  deleteVisitForUser: vi.fn(),
  getAllVisits: vi.fn(),
  getVisitById: vi.fn(),
  getVisitByIdForUser: vi.fn(),
  updateVisit: vi.fn(),
  updateVisitForUser: vi.fn(),
}));

const visitService = await import('../../src/services/visitService.js');
const controller = await import('../../src/controllers/visitsController.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('visitsController ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta la visita del usuario mediante ID y propietario', async () => {
    const visit = { _id: 'visit-1', userId: 'user-1' };
    visitService.getVisitByIdForUser.mockResolvedValue(visit);
    const req = { params: { id: 'visit-1' }, user: { id: 'user-1', role: 'user' } };
    const res = mockRes();

    await controller.getVisit(req, res);

    expect(visitService.getVisitByIdForUser).toHaveBeenCalledWith('visit-1', 'user-1');
    expect(visitService.getVisitById).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(visit);
  });

  it('fuerza el propietario y limita campos al crear una visita', async () => {
    visitService.createVisit.mockResolvedValue({ _id: 'visit-1' });
    const req = {
      user: { id: 'user-1', role: 'user' },
      body: {
        userId: 'user-2',
        monumentId: 'monument-1',
        duration: 3,
        experienceType: 'ar',
        date: '2000-01-01',
        unexpected: 'discard-me',
      },
    };
    const res = mockRes();

    await controller.createVisitController(req, res);

    expect(visitService.createVisit).toHaveBeenCalledWith({
      userId: 'user-1',
      monumentId: 'monument-1',
      duration: 3,
      experienceType: 'ar',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('no permite que un usuario cambie propietario ni referencias de la visita', async () => {
    const updated = { _id: 'visit-1', duration: 8, rating: 5 };
    visitService.updateVisitForUser.mockResolvedValue(updated);
    const req = {
      params: { id: 'visit-1' },
      user: { id: 'user-1', role: 'user' },
      body: {
        duration: 8,
        rating: 5,
        userId: 'user-2',
        monumentId: 'monument-2',
        tourId: 'tour-2',
      },
    };
    const res = mockRes();

    await controller.updateVisitController(req, res);

    expect(visitService.updateVisitForUser).toHaveBeenCalledWith(
      'visit-1',
      'user-1',
      { duration: 8, rating: 5 },
    );
    expect(visitService.updateVisit).not.toHaveBeenCalled();
  });

  it('elimina por ID y propietario para usuarios normales', async () => {
    visitService.deleteVisitForUser.mockResolvedValue({ _id: 'visit-1' });
    const req = { params: { id: 'visit-1' }, user: { id: 'user-1', role: 'user' } };
    const res = mockRes();

    await controller.deleteVisitController(req, res);

    expect(visitService.deleteVisitForUser).toHaveBeenCalledWith('visit-1', 'user-1');
    expect(visitService.deleteVisit).not.toHaveBeenCalled();
  });

  it('mantiene acceso administrativo explícito', async () => {
    const visit = { _id: 'visit-1', userId: 'user-2' };
    visitService.getVisitById.mockResolvedValue(visit);
    const req = { params: { id: 'visit-1' }, user: { id: 'admin-1', role: 'admin' } };
    const res = mockRes();

    await controller.getVisit(req, res);

    expect(visitService.getVisitById).toHaveBeenCalledWith('visit-1');
    expect(visitService.getVisitByIdForUser).not.toHaveBeenCalled();
  });
});
