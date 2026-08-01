import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config();

let s3Client = null;

/**
 * Initialize AWS S3 client with credentials from environment variables
 * @returns {S3Client} Configured S3 client instance
 */
export const initializeS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  const requiredEnvVars = ['AWS_REGION', 'S3_BUCKET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
  }

  const clientConfig = { region: process.env.AWS_REGION };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  s3Client = new S3Client(clientConfig);
  console.log(`✅ S3 client initialized for region: ${process.env.AWS_REGION}`);
  
  return s3Client;
};

/**
 * Verify connection to S3 bucket
 * @returns {Promise<boolean>} True if connection is successful
 * @throws {Error} If connection fails
 */
export const verifyS3Connection = async () => {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET;

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });

    await client.send(command);
    console.log(`✅ Successfully connected to S3 bucket: ${bucketName}`);
    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    
    if (error.name === 'NoSuchBucket') {
      throw new Error(`S3 bucket "${process.env.S3_BUCKET}" does not exist`);
    }
    
    if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      throw new Error('AWS credentials are invalid or missing');
    }
    
    if (error.name === 'AccessDenied') {
      throw new Error('Insufficient permissions to access S3 bucket');
    }
    
    throw error;
  }
};

/**
 * Create folder structure in S3 (implicit - S3 doesn't require explicit folder creation)
 * Folders are created automatically when uploading files with prefixes
 * @returns {Promise<void>}
 */
export const createFolderStructure = async () => {
  // S3 doesn't require explicit folder creation
  // Folders are created implicitly when uploading files with prefixes like:
  // - images/{monumentId}/
  // - models/{monumentId}/
  console.log('✅ S3 folder structure ready (folders created implicitly on upload)');
};

/**
 * Get the initialized S3 client
 * @returns {S3Client} S3 client instance
 * @throws {Error} If client is not initialized
 */
export const getS3Client = () => {
  if (!s3Client) {
    return initializeS3Client();
  }
  return s3Client;
};

/**
 * Get S3 bucket name from environment
 * @returns {string} Bucket name
 */
export const getBucketName = () => {
  return process.env.S3_BUCKET;
};

/**
 * Get AWS region from environment
 * @returns {string} AWS region
 */
export const getRegion = () => {
  return process.env.AWS_REGION;
};
