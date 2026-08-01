import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { uploadImage, uploadModel } from '../utils/uploader.js';
import * as s3Service from '../services/s3Service.js';
import {
  assertManagedStorageKey,
  buildManagedUploadKey,
  normalizeSignedExpiry,
  sanitizeStorageFileName,
  StorageValidationError,
  validateUploadMetadata,
  validateUploadedFileSignature,
} from '../utils/storageSecurity.js';
const { generatePresignedGetUrl } = s3Service;

const router = Router();

// Endpoint para obtener una URL firmada de subida a S3
// POST /api/uploads/signed-url
// Body: { resourceType, resourceId, fileName, contentType, fileSize, expiresIn }
router.post('/signed-url', verifyToken, requireRole('admin'), async (req, res) => {
  let key;
  let expiresIn;
  try {
    const { resourceType, resourceId, fileName, contentType, fileSize } = req.body;
    if (!resourceType || !resourceId || !fileName || !contentType || !fileSize) {
      throw new StorageValidationError(
        'resourceType, resourceId, fileName, contentType and fileSize are required'
      );
    }
    key = buildManagedUploadKey({
      resourceType,
      resourceId,
      fileName,
      contentType,
      fileSize,
    });
    expiresIn = normalizeSignedExpiry(req.body.expiresIn);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { contentType } = req.body;

    const url = await s3Service.generatePresignedPutUrl({
      key,
      contentType,
      contentLength: Number(req.body.fileSize),
      expiresIn,
    });

    const publicUrl = s3Service.buildPublicS3Url(key);
    res.json({ url, publicUrl, key });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// Endpoint para obtener una URL firmada de descarga desde S3
router.get('/signed-get', verifyToken, async (req, res) => {
  let key;
  let expiresIn;
  try {
    if (!req.query.key) throw new StorageValidationError('key is required');
    key = assertManagedStorageKey(req.query.key);
    expiresIn = normalizeSignedExpiry(req.query.expiresIn);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const url = await generatePresignedGetUrl({
      key,
      expiresIn,
    });

    res.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned GET URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned GET URL' });
  }
});

// Note: Signed URLs for S3 can be implemented later if needed
// For now, we use direct uploads through the backend

// Upload image to S3
router.post('/image', verifyToken, requireRole('admin'), uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { monumentId } = req.body;
    if (!monumentId) {
      return res.status(400).json({ error: 'monumentId is required' });
    }

    validateUploadMetadata({
      resourceType: 'monument-image',
      resourceId: monumentId,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
    });
    validateUploadedFileSignature({ buffer: req.file.buffer, contentType: req.file.mimetype });
    const filename = `${Date.now()}_${sanitizeStorageFileName(req.file.originalname)}`;
    const key = `images/monuments/${monumentId}/${filename}`;

    // Upload to S3
    const imageUrl = await s3Service.uploadImageToS3(
      req.file.buffer,
      filename,
      monumentId,
      req.file.mimetype
    );

    res.json({
      imageUrl,
      key,
      s3Key: key,
      filename,
      message: 'Image uploaded successfully to S3'
    });
  } catch (error) {
    console.error('Image upload error:', error);
    const status = error instanceof StorageValidationError ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'Failed to upload image to S3' : error.message });
  }
});

// Upload 3D model to S3
router.post('/model', verifyToken, requireRole('admin'), uploadModel.single('model'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No 3D model file provided' });
    }

    const { monumentId } = req.body;
    if (!monumentId) {
      return res.status(400).json({ error: 'monumentId is required' });
    }

    validateUploadMetadata({
      resourceType: 'monument-model',
      resourceId: monumentId,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
    });
    validateUploadedFileSignature({ buffer: req.file.buffer, contentType: req.file.mimetype });
    const filename = `${Date.now()}_${sanitizeStorageFileName(req.file.originalname)}`;
    const key = `models/monuments/${monumentId}/${filename}`;

    // Upload to S3
    const modelUrl = await s3Service.uploadModelToS3(
      req.file.buffer,
      filename,
      monumentId,
      req.file.mimetype
    );

    res.json({
      modelUrl,
      key,
      s3Key: key,
      filename,
      message: '3D model uploaded successfully to S3'
    });
  } catch (error) {
    console.error('3D model upload error:', error);
    const status = error instanceof StorageValidationError ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'Failed to upload 3D model to S3' : error.message });
  }
});

// Delete file from S3 by URL
router.delete('/file', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    const key = s3Service.resolveS3Key(fileUrl);
    if (!key) return res.status(400).json({ error: 'fileUrl is not managed by HistoriAR' });
    await s3Service.deleteFileFromS3(key);
    
    res.json({ 
      message: 'File deleted successfully from S3',
      fileUrl
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file from S3' });
  }
});

export default router;
