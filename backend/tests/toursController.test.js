import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as controller from '../src/controllers/toursController.js';
import tourService from '../src/services/tourService.js';

function mockRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('toursController', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('listToursController aplica paginacion y populate=false', async () => {
    const req = {
      query: {
        page: '3',
        limit: '5',
        isActive: 'true',
        populate: 'false'
      }
    };
    const res = mockRes();
    const items = [{ _id: 'tour1' }];
    const spy = vi
      .spyOn(tourService, 'getAllTours')
      .mockResolvedValue({ items, total: 21 });

    await controller.listToursController(req, res);

    expect(spy).toHaveBeenCalledWith(
      {
        institutionId: undefined,
        type: undefined,
        district: undefined,
        isActive: true
      },
      {
        skip: 10,
        limit: 5,
        populate: false
      }
    );
    expect(res.json).toHaveBeenCalledWith({ page: 3, total: 21, items });
  });

  it('getToursByInstitutionController fuerza tours activos y aplica paginacion', async () => {
    const req = {
      params: { institutionId: 'inst1' },
      query: {
        activeOnly: 'false',
        page: '2',
        limit: '10',
        summary: 'true'
      }
    };
    const res = mockRes();
    const items = [{ _id: 'tour1' }];
    const spy = vi
      .spyOn(tourService, 'getToursByInstitution')
      .mockResolvedValue({ items, total: 11 });

    await controller.getToursByInstitutionController(req, res);

    expect(spy).toHaveBeenCalledWith('inst1', {
      activeOnly: true,
      skip: 10,
      limit: 10,
      populate: false
    });
    expect(res.json).toHaveBeenCalledWith({ page: 2, total: 11, items });
  });

  it('no permite desactivar el filtro de publicación desde la ruta pública', async () => {
    const req = { query: { isActive: 'false' } };
    const res = mockRes();
    const spy = vi
      .spyOn(tourService, 'getAllTours')
      .mockResolvedValue({ items: [], total: 0 });

    await controller.listToursController(req, res);

    expect(spy.mock.calls[0][0].isActive).toBe(true);
  });

  it('permite al controlador admin consultar tours inactivos', async () => {
    const req = { query: { isActive: 'false' } };
    const res = mockRes();
    const spy = vi
      .spyOn(tourService, 'getAllTours')
      .mockResolvedValue({ items: [], total: 0 });

    await controller.listToursAdminController(req, res);

    expect(spy.mock.calls[0][0].isActive).toBe(false);
  });

  it('oculta un tour inactivo aunque se consulte directamente por ID', async () => {
    const req = { params: { id: 'tour1' } };
    const res = mockRes();
    vi.spyOn(tourService, 'getTourById').mockResolvedValue({
      _id: 'tour1',
      isActive: false,
    });

    await controller.getTourController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Tour not found' });
  });
});
