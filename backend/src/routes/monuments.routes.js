import { Router } from 'express';
import { 
  listMonument, 
  getMonument, 
  createMonumentController, 
  updateMonumentController, 
  deleteMonumentController, 
  searchMonumentsController, 
  getFilterOptionsController,
  getModelVersionsController,
  activateModelVersionController,
  deleteModelVersionController,
  uploadModelVersionController,
  confirmModelVersionUploadController
} from '../controllers/monumentsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { uploadMonumentImageToS3 } from '../services/s3Service.js';
import multer from 'multer';

const router = Router();

// Configure multer for monument file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (optimized for mobile AR)
  }
});

router.get('/', listMonument);
router.get('/search', searchMonumentsController);
router.get('/filter-options', getFilterOptionsController);
router.get('/:id', getMonument);

router.post('/',
  verifyToken, requireRole('admin'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'model3d', maxCount: 1 }
  ]),
  createMonumentController
);

router.put('/:id',
  verifyToken, requireRole('admin'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'model3d', maxCount: 1 }
  ]),
  updateMonumentController
);

router.delete('/:id', verifyToken, requireRole('admin'), deleteMonumentController);

// Model versioning endpoints
router.get('/:id/model-versions', verifyToken, requireRole('admin'), getModelVersionsController);
router.post('/:id/upload-model', verifyToken, requireRole('admin'), upload.single('model'), uploadModelVersionController);
router.post('/:id/model-versions/complete', verifyToken, requireRole('admin'), confirmModelVersionUploadController);
router.post('/:id/model-versions/:versionId/activate', verifyToken, requireRole('admin'), activateModelVersionController);
router.delete('/:id/model-versions/:versionId', verifyToken, requireRole('admin'), deleteModelVersionController);

// Upload endpoints specifically for monuments
router.post('/upload-image', verifyToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  try {
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

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;
    const key = `images/monuments/${filename}`;
    
    // Upload to S3 in images/monuments/ folder
    const imageUrl = await uploadMonumentImageToS3(
      req.file.buffer,
      filename,
      req.file.mimetype
    );

    const Monument = (await import('../models/Monument.js')).default;
    await Monument.findByIdAndUpdate(monumentId, {
      imageUrl,
      s3ImageKey: key,
      s3ImageFileName: filename
    });

    res.json({
      imageUrl,
      s3ImageKey: key,
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

router.post('/upload-model', verifyToken, requireRole('admin'), upload.single('model'), async (req, res) => {
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

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;
    const key = `models/${monumentId}/${filename}`;

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
    });

    res.json({
      modelUrl,
      s3ModelKey: key,
      filename,
      message: '3D model uploaded successfully to S3'
    });
  } catch (error) {
    console.error('3D model upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload 3D model' 
    });
  }
});

export default router;
