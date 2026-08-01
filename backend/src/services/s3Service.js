import { 
  PutObjectCommand, 
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand, 
  DeleteObjectsCommand, 
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getS3Client, getBucketName, getRegion } from '../config/s3.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertManagedStorageKey, isManagedStorageKey } from '../utils/storageSecurity.js';

const PUBLIC_URL_EXPIRES_IN = 60 * 60;

export const buildPublicS3Url = (key) => {
  const bucketName = getBucketName();
  const region = getRegion();
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

export const resolveS3Key = (value) => {
  if (!value) return null;

  if (isManagedStorageKey(value)) return value;

  const bucketName = getBucketName();
  const region = getRegion();
  try {
    const parsedUrl = new URL(value);
    const expectedHost = `${bucketName}.s3.${region}.amazonaws.com`;
    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== expectedHost) return null;
    const key = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
    return isManagedStorageKey(key) ? key : null;
  } catch {
    return null;
  }
};

// La clave es la referencia canónica en base de datos. La URL solo se usa como
// compatibilidad con registros históricos que todavía no guardan la clave.
export const resolveStoredMediaKey = ({ key, url } = {}) => resolveS3Key(key) || resolveS3Key(url);

export const generatePresignedGetUrl = async ({ key, expiresIn = PUBLIC_URL_EXPIRES_IN }) => {
  assertManagedStorageKey(key);
  const s3Client = getS3Client();
  const bucketName = getBucketName();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};
/**
 * Generate a presigned URL for uploading to S3
 * @param {Object} options
 * @param {string} options.key - S3 object key (path/filename)
 * @param {string} options.contentType - MIME type
 * @param {number} options.expiresIn - Expiration in seconds
 * @returns {Promise<string>} Presigned URL
 */
export const generatePresignedPutUrl = async ({
  key,
  contentType,
  contentLength,
  expiresIn = 3600,
}) => {
  assertManagedStorageKey(key);
  const s3Client = getS3Client();
  const bucketName = getBucketName();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
};

export const headStoredObject = async (key) => {
  assertManagedStorageKey(key);
  const response = await getS3Client().send(new HeadObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  }));
  return {
    contentLength: response.ContentLength,
    contentType: response.ContentType,
  };
};

/**
 * Handle S3 errors and provide clear error messages
 * @param {Error} error - S3 error
 * @throws {Error} Formatted error
 */
const handleS3Error = (error) => {
  console.error('[S3 Error]', error);

  if (error.name === 'NoSuchBucket') {
    throw new Error(`S3 bucket "${getBucketName()}" does not exist`);
  }

  if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
    throw new Error('AWS credentials are invalid or missing');
  }

  if (error.name === 'AccessDenied') {
    throw new Error('Insufficient permissions to access S3 bucket');
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    throw new Error('Network error connecting to S3');
  }

  // Generic error
  throw new Error(`S3 operation failed: ${error.message}`);
};

/**
 * Upload image file to S3 (legacy - uses monumentId as folder)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} monumentId - Monument ID for folder organization
 * @param {string} contentType - MIME type (default: image/jpeg)
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadImageToS3 = async (fileBuffer, fileName, monumentId, contentType = 'image/jpeg') => {
  const key = `images/monuments/${monumentId}/${fileName}`;
  return uploadFileToS3(fileBuffer, key, contentType);
};

/**
 * Upload 3D model file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} monumentId - Monument ID for folder organization
 * @param {string} contentType - MIME type (default: model/gltf-binary)
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadModelToS3 = async (fileBuffer, fileName, monumentId, contentType = 'model/gltf-binary') => {
  const key = `models/monuments/${monumentId}/${fileName}`;
  return uploadFileToS3(fileBuffer, key, contentType);
};

/**
 * Delete file from S3 by URL
 * @param {string} fileUrl - S3 file URL
 * @returns {Promise<void>}
 */
export const deleteFileFromS3 = async (fileUrl) => {
  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    const key = resolveS3Key(fileUrl);

    if (!key) {
      throw new Error(`Invalid S3 URL: ${fileUrl}`);
    }

    console.log(`[S3] Deleting file: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`[S3] File deleted successfully: ${key}`);
  } catch (error) {
    handleS3Error(error);
  }
};

/**
 * List all files for a monument
 * @param {string} monumentId - Monument ID
 * @returns {Promise<Array<string>>} Array of file keys
 */
export const listMonumentFiles = async (monumentId) => {
  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    const prefixes = [`images/monuments/${monumentId}/`, `models/monuments/${monumentId}/`];
    const allFiles = [];

    for (const prefix of prefixes) {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await s3Client.send(command);
      
      if (response.Contents) {
        allFiles.push(...response.Contents.map(item => item.Key));
      }
    }

    return allFiles;
  } catch (error) {
    handleS3Error(error);
  }
};

/**
 * Delete all files associated with a monument
 * @param {string} monumentId - Monument ID
 * @returns {Promise<void>}
 */
export const deleteMonumentFiles = async (monumentId) => {
  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    const prefixes = [`images/monuments/${monumentId}/`, `models/monuments/${monumentId}/`];

    console.log(`[S3] Deleting all files for monument: ${monumentId}`);

    for (const prefix of prefixes) {
      // List all objects with this prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const { Contents } = await s3Client.send(listCommand);

      if (Contents && Contents.length > 0) {
        // Delete all objects in batch
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: Contents.map(({ Key }) => ({ Key })),
            Quiet: false,
          },
        });

        const deleteResponse = await s3Client.send(deleteCommand);
        
        console.log(`[S3] Deleted ${Contents.length} files from ${prefix}`);
        
        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
          console.error('[S3] Some files failed to delete:', deleteResponse.Errors);
        }
      } else {
        console.log(`[S3] No files found in ${prefix}`);
      }
    }

    console.log(`[S3] All files deleted for monument: ${monumentId}`);
  } catch (error) {
    handleS3Error(error);
  }
};

/**
 * Upload generic file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - S3 key (full path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadFileToS3 = async (fileBuffer, key, contentType) => {
  try {
    assertManagedStorageKey(key);
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    console.log(`[S3] Uploading file to: ${key}`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    const url = buildPublicS3Url(key);
    
    console.log(`[S3] Upload successful: ${url}`);
    return url;
  } catch (error) {
    handleS3Error(error);
  }
};
