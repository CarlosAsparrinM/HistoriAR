import { beforeEach, describe, expect, it, vi } from 'vitest';

const model = {
  find: vi.fn(),
  findOneAndUpdate: vi.fn(),
};

vi.mock('mongoose', () => ({
  default: { isValidObjectId: vi.fn((id) => typeof id === 'string' && id.startsWith('valid-')) },
}));
vi.mock('../../src/models/HistoricalData.js', () => ({ default: model }));
vi.mock('../../src/services/s3Service.js', () => ({}));
vi.mock('../../src/utils/s3-helpers.js', () => ({ hydrateMedia: vi.fn() }));
vi.mock('../../src/utils/storageSecurity.js', () => ({
  StorageValidationError: class StorageValidationError extends Error {},
  sanitizeStorageFileName: vi.fn(),
  validateUploadMetadata: vi.fn(),
  validateUploadedFileSignature: vi.fn(),
}));

const controller = await import('../../src/controllers/historicalDataController.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('historical data reorder integrity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza identificadores, ordenes o duplicados inválidos antes de consultar', async () => {
    const res = mockRes();
    await controller.reorderHistoricalData({
      params: { monumentId: 'monument-1' },
      body: { items: [{ id: 'invalid-id', order: -1 }, { id: 'invalid-id', order: 1 }] },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(model.find).not.toHaveBeenCalled();
  });

  it('verifica que todas las entradas pertenecen al monumento antes de actualizar', async () => {
    model.find.mockReturnValue({ select: vi.fn().mockResolvedValue([{ _id: 'valid-1' }]) });
    const res = mockRes();

    await controller.reorderHistoricalData({
      params: { monumentId: 'monument-1' },
      body: { items: [{ id: 'valid-1', order: 0 }, { id: 'valid-2', order: 1 }] },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reordena solo dentro del monumento y ejecuta validadores', async () => {
    model.find.mockReturnValue({ select: vi.fn().mockResolvedValue([{ _id: 'valid-1' }, { _id: 'valid-2' }]) });
    model.findOneAndUpdate.mockResolvedValue({});
    const res = mockRes();

    await controller.reorderHistoricalData({
      params: { monumentId: 'monument-1' },
      body: { items: [{ id: 'valid-1', order: 1 }, { id: 'valid-2', order: 0 }] },
    }, res);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'valid-1', monumentId: 'monument-1' },
      { order: 1 },
      { runValidators: true },
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Order updated successfully' });
  });
});
