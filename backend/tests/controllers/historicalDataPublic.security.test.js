import { beforeEach, describe, expect, it, vi } from 'vitest';

const historicalDataModel = { find: vi.fn() };
const monumentModel = { exists: vi.fn() };
vi.mock('../../src/models/HistoricalData.js', () => ({ default: historicalDataModel }));
vi.mock('../../src/models/Monument.js', () => ({ default: monumentModel }));
vi.mock('../../src/services/s3Service.js', () => ({}));
vi.mock('../../src/utils/s3-helpers.js', () => ({
  hydrateMedia: vi.fn(async (entry) => ({ ...entry, imageUrl: 'https://signed.example/image.jpg' })),
}));
vi.mock('../../src/utils/storageSecurity.js', () => ({
  StorageValidationError: class StorageValidationError extends Error {},
  buildManagedUploadKey: vi.fn(),
  validateUploadMetadata: vi.fn(),
  validateUploadedFileSignature: vi.fn(),
}));

const controller = await import('../../src/controllers/historicalDataController.js');

function response() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('public historical data contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monumentModel.exists.mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });
  });

  it('consulta todas las fichas del monumento y elimina campos administrativos', async () => {
    historicalDataModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([{
        _id: 'entry-1', title: 'Historia', description: 'Texto', order: 0,
        status: 'Disponible', createdBy: 'admin-1', s3ImageKey: 'images/private.jpg',
      }]),
    });
    const res = response();

    const monumentId = '507f1f77bcf86cd799439011';
    await controller.getPublicHistoricalDataByMonument({ params: { monumentId } }, res);

    expect(monumentModel.exists).toHaveBeenCalledWith({ _id: monumentId, status: 'Disponible' });
    expect(historicalDataModel.find).toHaveBeenCalledWith({ monumentId });
    const body = res.json.mock.calls[0][0][0];
    expect(body).toMatchObject({ id: 'entry-1', title: 'Historia', imageUrl: 'https://signed.example/image.jpg' });
    expect(body).not.toHaveProperty('createdBy');
    expect(body).not.toHaveProperty('s3ImageKey');
    expect(body).not.toHaveProperty('status');
  });

  it('no expone fichas cuando el monumento no es público', async () => {
    monumentModel.exists.mockResolvedValue(null);
    const res = response();

    await controller.getPublicHistoricalDataByMonument(
      { params: { monumentId: '507f1f77bcf86cd799439011' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(historicalDataModel.find).not.toHaveBeenCalled();
  });

  it('trata un identificador inválido como un monumento no encontrado', async () => {
    const res = response();

    await controller.getPublicHistoricalDataByMonument(
      { params: { monumentId: 'invalid-id' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(monumentModel.exists).not.toHaveBeenCalled();
    expect(historicalDataModel.find).not.toHaveBeenCalled();
  });
});
