import { Router } from 'express';
import {
  listMonument,
  getMonument,
  listMonumentAdmin,
  getMonumentAdmin,
  createMonumentController, 
  updateMonumentController, 
  deleteMonumentController, 
  searchMonumentsController, 
  getFilterOptionsController,
  getMonumentStatsController,
  getModelVersionsController,
  activateModelVersionController,
  deleteModelVersionController,
  uploadModelVersionController,
  confirmModelVersionUploadController
} from '../controllers/monumentsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { uploadImageToS3 } from '../services/s3Service.js';
import { sanitizeStorageFileName, StorageValidationError, validateUploadMetadata, validateUploadedFileSignature } from '../utils/storageSecurity.js';
import { uploadImage, uploadModel } from '../utils/uploader.js';

const router = Router();

router.get('/search', searchMonumentsController);
router.get('/filter-options', getFilterOptionsController);
router.get('/stats', verifyToken, requireRole('admin'), getMonumentStatsController);
router.get('/admin', verifyToken, requireRole('admin'), listMonumentAdmin);
router.get('/admin/:id', verifyToken, requireRole('admin'), getMonumentAdmin);
router.get('/', listMonument);
router.get('/:id', getMonument);

router.post('/',
  verifyToken, requireRole('admin'),
  createMonumentController
);

router.put('/:id',
  verifyToken, requireRole('admin'),
  updateMonumentController
);

router.delete('/:id', verifyToken, requireRole('admin'), deleteMonumentController);

// Model versioning endpoints
router.get('/:id/model-versions', verifyToken, requireRole('admin'), getModelVersionsController);
router.post('/:id/upload-model', verifyToken, requireRole('admin'), uploadModel.single('model'), uploadModelVersionController);
router.post('/:id/model-versions/complete', verifyToken, requireRole('admin'), confirmModelVersionUploadController);
router.post('/:id/model-versions/:versionId/activate', verifyToken, requireRole('admin'), activateModelVersionController);
router.delete('/:id/model-versions/:versionId', verifyToken, requireRole('admin'), deleteModelVersionController);

// Upload endpoints specifically for monuments
router.post('/:id/upload-image', verifyToken, requireRole('admin'), uploadImage.single('image'), async (req, res) => {
  try {
    const { id: monumentId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
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
    
    // Upload to S3 in images/monuments/ folder
    const imageUrl = await uploadImageToS3(
      req.file.buffer,
      filename,
      monumentId,
      req.file.mimetype
    );

    const Monument = (await import('../models/Monument.js')).default;
    await Monument.findByIdAndUpdate(monumentId, {
      imageUrl,
      s3ImageKey: key,
      s3ImageFileName: filename
    }, { runValidators: true });

    res.json({
      imageUrl,
      s3ImageKey: key,
      filename,
      message: 'Image uploaded successfully to S3'
    });
  } catch (error) {
    console.error('Image upload error:', error);
    const status = error instanceof StorageValidationError ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? error.message : 'Failed to upload image to S3'
    });
  }
});

router.post('/upload-model', verifyToken, requireRole('admin'), uploadModel.single('model'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No 3D model file provided' });
    }

    const { monumentId } = req.body;
    if (!monumentId) {
      return res.status(400).json({ error: 'monumentId is required' });
    }

    const s3Service = await import('../services/s3Service.js');
    
    // Validate 3D model file
    const allowedTypes = ['model/gltf-binary', 'application/octet-stream', 'model/gltf+json'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only GLB and GLTF model files are allowed' });
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'Model size must be less than 50MB' });
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

    const Monument = (await import('../models/Monument.js')).default;
    await Monument.findByIdAndUpdate(monumentId, {
      model3DUrl: modelUrl,
      s3ModelKey: key,
      s3ModelFileName: filename
    }, { runValidators: true });

    res.json({
      modelUrl,
      s3ModelKey: key,
      filename,
      message: '3D model uploaded successfully to S3'
    });
  } catch (error) {
    console.error('3D model upload error:', error);
    const status = error instanceof StorageValidationError ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? error.message : 'Failed to upload 3D model'
    });
  }
});

export default router;
