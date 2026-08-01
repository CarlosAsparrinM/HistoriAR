import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock('../../src/config/s3.js', () => ({
  getS3Client: () => ({ send: mocks.send }),
  getBucketName: () => 'historiar-test',
  getRegion: () => 'us-east-1',
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

const s3Service = await import('../../src/services/s3Service.js');

const monumentId = '507f1f77bcf86cd799439011';
const modelKey = `models/monuments/${monumentId}/123_model.glb`;

describe('s3Service managed storage boundaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resuelve únicamente claves o URLs del bucket y prefijos administrados', () => {
    expect(s3Service.resolveS3Key(modelKey)).toBe(modelKey);
    expect(s3Service.resolveS3Key(
      `https://historiar-test.s3.us-east-1.amazonaws.com/${modelKey}?signature=abc`
    )).toBe(modelKey);
    expect(s3Service.resolveS3Key('https://evil.example/private/secret')).toBeNull();
    expect(s3Service.resolveS3Key('backups/database.dump')).toBeNull();
  });

  it('prioriza la clave persistida y usa la URL solo para registros legados', () => {
    const legacyUrl = `https://historiar-test.s3.us-east-1.amazonaws.com/${modelKey}`;
    expect(s3Service.resolveStoredMediaKey({ key: modelKey, url: 'https://evil.example/file' }))
      .toBe(modelKey);
    expect(s3Service.resolveStoredMediaKey({ url: legacyUrl })).toBe(modelKey);
    expect(s3Service.resolveStoredMediaKey({ key: 'backups/database.dump', url: 'https://evil.example/file' }))
      .toBeNull();
  });

  it('incluye MIME y tamaño validados en el comando de upload firmado', async () => {
    mocks.getSignedUrl.mockResolvedValue('https://signed.example');

    await s3Service.generatePresignedPutUrl({
      key: modelKey,
      contentType: 'model/gltf-binary',
      contentLength: 1024,
      expiresIn: 900,
    });

    const [, command, options] = mocks.getSignedUrl.mock.calls[0];
    expect(command.input).toMatchObject({
      Key: modelKey,
      ContentType: 'model/gltf-binary',
      ContentLength: 1024,
    });
    expect(options).toEqual({ expiresIn: 900 });
  });

  it('consulta metadatos del objeto real antes de confirmar', async () => {
    mocks.send.mockResolvedValue({
      ContentLength: 1024,
      ContentType: 'model/gltf-binary',
    });

    await expect(s3Service.headStoredObject(modelKey)).resolves.toEqual({
      contentLength: 1024,
      contentType: 'model/gltf-binary',
    });
    expect(mocks.send.mock.calls[0][0].input).toMatchObject({ Key: modelKey });
  });

  it('no envía comandos de eliminación para claves ajenas', async () => {
    await expect(s3Service.deleteFileFromS3('backups/database.dump'))
      .rejects.toThrow('Invalid S3 URL');
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
