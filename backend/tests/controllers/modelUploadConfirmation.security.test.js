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

vi.mock('../../src/services/s3Service.js', () => ({
  buildPublicS3Url: vi.fn(),
  generatePresignedGetUrl: vi.fn(),
  headStoredObject: vi.fn(),
  resolveS3Key: vi.fn(),
}));

vi.mock('../../src/utils/s3-helpers.js', () => ({
  hydrateMedia: vi.fn(async (value) => value),
  signIfNeeded: vi.fn(async (value) => value),
}));

const monumentService = await import('../../src/services/monumentService.js');
const s3Service = await import('../../src/services/s3Service.js');
const { confirmModelVersionUploadController } = await import(
  '../../src/controllers/monumentsController.js'
);

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

const monumentId = '507f1f77bcf86cd799439011';
const validKey = `models/monuments/${monumentId}/123_model.glb`;

function request(overrides = {}) {
  return {
    params: { id: monumentId },
    user: { id: '507f1f77bcf86cd799439012' },
    body: {
      key: validKey,
      filename: 'model.glb',
      fileSize: 1024,
      contentType: 'model/gltf-binary',
      ...overrides,
    },
  };
}

describe('model upload confirmation security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza una clave que pertenece a otro monumento antes de consultar S3', async () => {
    const res = mockRes();
    await confirmModelVersionUploadController(request({
      key: 'models/monuments/507f1f77bcf86cd799439099/123_model.glb',
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(s3Service.headStoredObject).not.toHaveBeenCalled();
  });

  it('consulta HeadObject y rechaza diferencias de tamaño o MIME', async () => {
    monumentService.getMonumentById.mockResolvedValue({ _id: monumentId });
    s3Service.headStoredObject.mockResolvedValue({
      contentLength: 2048,
      contentType: 'model/gltf-binary',
    });
    const res = mockRes();

    await confirmModelVersionUploadController(request(), res);

    expect(s3Service.headStoredObject).toHaveBeenCalledWith(validKey);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'El objeto almacenado no coincide con el tamaño o tipo declarado',
    });
  });
});
