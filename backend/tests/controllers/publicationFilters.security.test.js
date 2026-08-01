import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/monumentService.js', () => ({
  createMonument: vi.fn(),
  deleteMonument: vi.fn(),
  getAllMonuments: vi.fn(),
  getFilterOptions: vi.fn(),
  getMonumentById: vi.fn(),
  getMonumentStats: vi.fn(),
  searchMonuments: vi.fn(),
  updateMonument: vi.fn(),
}));

vi.mock('../../src/services/s3Service.js', () => ({}));
vi.mock('../../src/utils/s3-helpers.js', () => ({
  hydrateMedia: vi.fn(async (value) => value),
  signIfNeeded: vi.fn(async (value) => value),
}));

vi.mock('../../src/services/institutionService.js', () => ({
  createInstitution: vi.fn(),
  deleteInstitution: vi.fn(),
  getAllInstitutions: vi.fn(),
  getInstitutionById: vi.fn(),
  getInstitutionStats: vi.fn(),
  updateInstitution: vi.fn(),
}));

const monumentService = await import('../../src/services/monumentService.js');
const institutionService = await import('../../src/services/institutionService.js');
const monuments = await import('../../src/controllers/monumentsController.js');
const institutions = await import('../../src/controllers/institutionsController.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('publication filters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fuerza Disponible al listar monumentos aunque el cliente pida Oculto', async () => {
    monumentService.getAllMonuments.mockResolvedValue({ items: [], total: 0 });
    const req = { query: { status: 'Oculto' } };
    const res = mockRes();

    await monuments.listMonument(req, res);

    expect(monumentService.getAllMonuments.mock.calls[0][0].status).toBe('Disponible');
  });

  it('devuelve 404 para un monumento no publicado consultado por ID', async () => {
    monumentService.getMonumentById.mockResolvedValue({ _id: 'm1', status: 'Oculto' });
    const res = mockRes();

    await monuments.getMonument({ params: { id: 'm1' }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'No encontrado' });
  });

  it('bloquea filtros que intenten listar instituciones ocultas', async () => {
    institutionService.getAllInstitutions.mockResolvedValue({ items: [], total: 0 });
    const res = mockRes();

    await institutions.listInstitution({
      query: { availableOnly: 'false', status: 'Oculto' },
    }, res);

    expect(institutionService.getAllInstitutions).toHaveBeenCalledWith(
      expect.objectContaining({ availableOnly: true, status: 'all' }),
    );
  });

  it('devuelve 404 para una institución no publicada consultada por ID', async () => {
    institutionService.getInstitutionById.mockResolvedValue({
      _id: 'i1',
      status: 'Oculto',
    });
    const res = mockRes();

    await institutions.getInstitution({ params: { id: 'i1' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Institución no encontrada' });
  });
});
