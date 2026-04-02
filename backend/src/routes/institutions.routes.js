import { Router } from 'express';
import { listInstitution, getInstitution, createInstitutionController, updateInstitutionController, deleteInstitutionController } from '../controllers/institutionsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload endpoint for institution images - MUST be before /:id route
router.post('/upload-image', verifyToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { monumentId } = req.body; // monumentId es el institutionId en este caso
    if (!monumentId) {
      return res.status(400).json({ error: 'Institution ID is required' });
    }

    const s3Service = await import('../services/s3Service.js');
    const Institution = (await import('../models/Institution.js')).default;
    
    // Validate image file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only JPG and PNG images are allowed' });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'Image size must be less than 5MB' });
    }

    // Obtener la institución actual para verificar si tiene imagen previa
    const institution = await Institution.findById(monumentId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Si tiene imagen anterior, borrarla de S3
    if (institution.imageUrl) {
      try {
        await s3Service.deleteFileFromS3(institution.imageUrl);
        console.log('Old institution image deleted from S3');
      } catch (error) {
        console.log('Error deleting old image from S3:', error.message);
        // Continuar aunque falle el borrado
      }
    }

    // Crear nombre de archivo único: institution_{institutionId}_{timestamp}.ext
    const timestamp = Date.now();
    const extension = req.file.originalname.split('.').pop();
    const filename = `institution_${monumentId}_${timestamp}.${extension}`;
    const key = `images/institutions/${filename}`;
    
    // Upload file to S3 using institutions folder
    const publicUrl = await s3Service.uploadFileToS3(
      req.file.buffer,
      key,
      req.file.mimetype
    );
    
    // Actualizar la institución con la nueva URL
    institution.imageUrl = publicUrl;
    institution.s3ImageKey = key;
    await institution.save();

    res.json({
      imageUrl: publicUrl,
      s3ImageKey: key,
      fileName: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('Error uploading institution image:', error);
    res.status(500).json({ 
      error: 'Failed to upload image to S3',
      details: error.message 
    });
  }
});

// Standard CRUD routes - MUST be after specific routes like /upload-image
router.get('/', listInstitution);
router.get('/:id', getInstitution);
router.post('/', verifyToken, requireRole('admin'), createInstitutionController);
router.put('/:id', verifyToken, requireRole('admin'), updateInstitutionController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteInstitutionController);

export default router;
