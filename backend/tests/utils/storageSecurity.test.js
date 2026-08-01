import { describe, expect, it } from 'vitest';

import {
  assertResourceStorageKey,
  buildManagedUploadKey,
  isManagedStorageKey,
  normalizeSignedExpiry,
  sanitizeStorageFileName,
  validateUploadMetadata,
  validateUploadedFileSignature,
} from '../../src/utils/storageSecurity.js';

const monumentId = '507f1f77bcf86cd799439011';

describe('storageSecurity', () => {
  it('genera la clave desde metadatos permitidos y no desde una ruta del cliente', () => {
    const key = buildManagedUploadKey({
      resourceType: 'monument-model',
      resourceId: monumentId,
      fileName: 'Modelo final.glb',
      contentType: 'model/gltf-binary',
      now: 123,
    });

    expect(key).toBe(`models/monuments/${monumentId}/123_Modelo_final.glb`);
    expect(isManagedStorageKey(key)).toBe(true);
  });

  it.each(['../secret.glb', '..\\secret.glb', '/root.glb', 'folder/model.glb'])
  ('rechaza separadores y traversal en nombres: %s', (fileName) => {
    expect(() => sanitizeStorageFileName(fileName)).toThrow('inválido');
  });

  it('rechaza combinaciones de extensión y MIME inconsistentes', () => {
    expect(() => validateUploadMetadata({
      resourceType: 'monument-image',
      resourceId: monumentId,
      fileName: 'imagen.jpg',
      contentType: 'application/octet-stream',
      fileSize: 100,
    })).toThrow('no están permitidos');
  });

  it('comprueba la firma real y no solo el MIME declarado', () => {
    expect(validateUploadedFileSignature({
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      contentType: 'image/jpeg',
    })).toBe(true);
    expect(() => validateUploadedFileSignature({
      buffer: Buffer.from('not an image'),
      contentType: 'image/jpeg',
    })).toThrow('firma real');
  });

  it('rechaza claves de otro recurso aunque estén en un prefijo administrado', () => {
    const otherId = '507f1f77bcf86cd799439012';
    expect(() => assertResourceStorageKey({
      key: `models/monuments/${otherId}/123_model.glb`,
      resourceType: 'monument-model',
      resourceId: monumentId,
    })).toThrow('no pertenece');
  });

  it('limita la expiración y rechaza valores inválidos', () => {
    expect(normalizeSignedExpiry(3600)).toBe(900);
    expect(() => normalizeSignedExpiry(0)).toThrow('entre 60 y 900');
    expect(() => normalizeSignedExpiry('abc')).toThrow('entre 60 y 900');
  });
});
