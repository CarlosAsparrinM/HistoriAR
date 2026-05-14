import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { uploadImage, uploadModel } from '../utils/uploader.js';
import * as s3Service from '../services/s3Service.js';
const { generatePresignedGetUrl } = s3Service;

const router = Router();

// Endpoint para obtener una URL firmada de subida a S3
// POST /api/uploads/signed-url
// Body: { key, contentType, expiresIn }
router.post('/signed-url', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { key, contentType, expiresIn } = req.body;

    if (!key || !contentType) {
      return res.status(400).json({ error: 'key and contentType are required' });
    }

    const url = await s3Service.generatePresignedPutUrl({
      key,
      contentType,
      expiresIn: expiresIn || 3600,
    });

    const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.json({ url, publicUrl, key });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presigned URL' });
  }
});

// Endpoint para obtener una URL firmada de descarga desde S3
router.get('/signed-get', verifyToken, async (req, res) => {
  try {
    const { key, expiresIn } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const url = await generatePresignedGetUrl({
      key,
      expiresIn: Number(expiresIn) || 3600,
    });

    res.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned GET URL:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presigned GET URL' });
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

    // Validate image file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only JPG and PNG images are allowed' });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'Image size must be less than 5MB' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;
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
      s3Key: key,
      filename,
      message: 'Image uploaded successfully to S3'
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload image to S3' 
    });
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

    // Validate 3D model file
    const allowedTypes = ['model/gltf-binary', 'application/octet-stream', 'model/gltf+json'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only GLB and GLTF model files are allowed' });
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'Model size must be less than 50MB' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;
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
      s3Key: key,
      filename,
      message: '3D model uploaded successfully to S3'
    });
  } catch (error) {
    console.error('3D model upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload 3D model to S3' 
    });
  }
});

// Delete file from S3 by URL
router.delete('/file', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    await s3Service.deleteFileFromS3(fileUrl);
    
    res.json({ 
      message: 'File deleted successfully from S3',
      fileUrl
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete file from S3' 
    });
  }
});

export default router;
