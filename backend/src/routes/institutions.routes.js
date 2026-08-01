import { Router } from 'express';
import { listInstitution, getInstitution, listInstitutionAdmin, getInstitutionAdmin, createInstitutionController, updateInstitutionController, deleteInstitutionController, getInstitutionStatsController } from '../controllers/institutionsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { uploadImage } from '../utils/uploader.js';
import { buildManagedUploadKey, StorageValidationError, validateUploadMetadata, validateUploadedFileSignature } from '../utils/storageSecurity.js';

const router = Router();

// Upload endpoint for institution images - MUST be before /:id route
router.post('/upload-image', verifyToken, requireRole('admin'), uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const institutionId = req.body.institutionId || req.body.monumentId;
    if (!institutionId) {
      return res.status(400).json({ error: 'Institution ID is required' });
    }

    const s3Service = await import('../services/s3Service.js');
    const Institution = (await import('../models/Institution.js')).default;
    
    validateUploadMetadata({
      resourceType: 'institution-image',
      resourceId: institutionId,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
    });
    validateUploadedFileSignature({ buffer: req.file.buffer, contentType: req.file.mimetype });

    // Obtener la institución actual para verificar si tiene imagen previa
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Si tiene imagen anterior, borrarla de S3
    if (institution.s3ImageKey || institution.imageUrl) {
      try {
        await s3Service.deleteFileFromS3(institution.s3ImageKey || institution.imageUrl);
        console.log('Old institution image deleted from S3');
      } catch (error) {
        console.log('Error deleting old image from S3:', error.message);
        // Continuar aunque falle el borrado
      }
    }

    // Crear nombre de archivo único: institution_{institutionId}_{timestamp}.ext
    const key = buildManagedUploadKey({
      resourceType: 'institution-image',
      resourceId: institutionId,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
    });
    
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
      key,
      fileName: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('Error uploading institution image:', error);
    const status = error instanceof StorageValidationError ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? error.message : 'Failed to upload image to S3'
    });
  }
});

// Standard CRUD routes - MUST be after specific routes like /upload-image
router.get('/', listInstitution);
router.get('/stats', verifyToken, requireRole('admin'), getInstitutionStatsController);
router.get('/admin', verifyToken, requireRole('admin'), listInstitutionAdmin);
router.get('/admin/:id', verifyToken, requireRole('admin'), getInstitutionAdmin);
router.get('/:id', getInstitution);
router.post('/', verifyToken, requireRole('admin'), createInstitutionController);
router.put('/:id', verifyToken, requireRole('admin'), updateInstitutionController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteInstitutionController);

export default router;
