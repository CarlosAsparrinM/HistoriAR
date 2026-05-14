import * as s3Service from '../services/s3Service.js';

const MEDIA_URL_EXPIRATION_SECONDS = 60 * 60;

/**
 * Signs an S3 key if it's a valid key, otherwise returns the value as is.
 * @param {string} value - The S3 key or URL to sign
 * @returns {Promise<string|null>} - The presigned URL or original value
 */
export async function signIfNeeded(value) {
  const key = s3Service.resolveS3Key(value);
  if (!key) return value || null;
  return s3Service.generatePresignedGetUrl({ key, expiresIn: MEDIA_URL_EXPIRATION_SECONDS });
}

/**
 * Hydrates an object with signed URLs for its S3 keys.
 * @param {Object} doc - The Mongoose document or plain object
 * @param {Array<string>} fields - The fields to hydrate (mapping of plain field to s3 key field)
 * @returns {Promise<Object>} - The hydrated object
 */
export async function hydrateMedia(doc, fieldMappings = []) {
  if (!doc) return doc;

  const plain = doc.toObject ? doc.toObject() : { ...doc };

  for (const mapping of fieldMappings) {
    const { urlField, keyField } = mapping;
    plain[urlField] = await signIfNeeded(plain[keyField] || plain[urlField]);
  }

  return plain;
}
