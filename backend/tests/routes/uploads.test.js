import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockS3Service = vi.hoisted(() => ({
  generatePresignedPutUrl: vi.fn(),
  generatePresignedGetUrl: vi.fn(),
  uploadImageToS3: vi.fn(),
  uploadModelToS3: vi.fn(),
  deleteFileFromS3: vi.fn()
}));

vi.mock('../../src/services/s3Service.js', () => mockS3Service);
vi.mock('../../src/middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  },
  requireRole: () => (req, res, next) => next()
}));
vi.mock('../../src/utils/uploader.js', () => ({
  uploadImage: {
    single: () => (req, res, next) => {
      if (req.headers['x-test-file'] === '1') {
        req.file = {
          buffer: Buffer.from('fake image'),
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 1024
        };
      }
      next();
    }
  },
  uploadModel: {
    single: () => (req, res, next) => {
      if (req.headers['x-test-file'] === '1') {
        req.file = {
          buffer: Buffer.from('fake model'),
          originalname: 'test.glb',
          mimetype: 'model/gltf-binary',
          size: 1024
        };
      }
      next();
    }
  }
}));

const { default: uploadsRouter } = await import('../../src/routes/uploads.routes.js');

const app = express();
app.use(express.json());
app.use('/api/uploads', uploadsRouter);

describe('Upload Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/uploads/signed-url', () => {
    it('should generate presigned upload URLs', async () => {
      mockS3Service.generatePresignedPutUrl.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/...presigned...'
      );

      const response = await request(app)
        .post('/api/uploads/signed-url')
        .send({
          key: 'models/monument-id/model.glb',
          contentType: 'model/gltf-binary',
          expiresIn: 900
        });

      expect(response.status).toBe(200);
      expect(response.body.url).toContain('https://');
      expect(response.body.publicUrl).toContain('amazonaws.com');
      expect(response.body.key).toBe('models/monument-id/model.glb');
    });

    it('should return 400 when key is missing', async () => {
      const response = await request(app)
        .post('/api/uploads/signed-url')
        .send({ contentType: 'model/gltf-binary' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/uploads/signed-get', () => {
    it('should generate presigned download URLs', async () => {
      mockS3Service.generatePresignedGetUrl.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/...download...'
      );

      const response = await request(app)
        .get('/api/uploads/signed-get')
        .query({ key: 'models/monument-id/model.glb' });

      expect(response.status).toBe(200);
      expect(response.body.url).toContain('https://');
      expect(response.body.key).toBe('models/monument-id/model.glb');
    });

    it('should return 400 when key is missing', async () => {
      const response = await request(app)
        .get('/api/uploads/signed-get');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/uploads/image', () => {
    it('should upload image successfully', async () => {
      mockS3Service.uploadImageToS3.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/images/monuments/test.jpg'
      );

      const response = await request(app)
        .post('/api/uploads/image')
        .set('x-test-file', '1')
        .send({ monumentId: 'monument-id' });

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toContain('https://');
      expect(response.body.s3Key).toContain('images/monuments/monument-id/');
      expect(response.body.message).toContain('successfully');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/uploads/image')
        .send({ monumentId: 'monument-id' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No image file provided');
    });

    it('should handle upload errors', async () => {
      mockS3Service.uploadImageToS3.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/uploads/image')
        .set('x-test-file', '1')
        .send({ monumentId: 'monument-id' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Upload failed');
    });
  });

  describe('POST /api/uploads/model', () => {
    it('should upload 3D model successfully', async () => {
      mockS3Service.uploadModelToS3.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/models/monuments/test.glb'
      );

      const response = await request(app)
        .post('/api/uploads/model')
        .set('x-test-file', '1')
        .send({ monumentId: 'monument-id' });

      expect(response.status).toBe(200);
      expect(response.body.modelUrl).toContain('https://');
      expect(response.body.s3Key).toContain('models/monuments/monument-id/');
      expect(response.body.message).toContain('successfully');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/uploads/model')
        .send({ monumentId: 'monument-id' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No 3D model file provided');
    });
  });

  describe('DELETE /api/uploads/file', () => {
    it('should delete file successfully', async () => {
      mockS3Service.deleteFileFromS3.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/uploads/file')
        .send({ fileUrl: 'models/test.glb' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.fileUrl).toBe('models/test.glb');
      expect(mockS3Service.deleteFileFromS3).toHaveBeenCalledWith('models/test.glb');
    });

    it('should return 400 when fileUrl is missing', async () => {
      const response = await request(app)
        .delete('/api/uploads/file')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should handle deletion errors', async () => {
      mockS3Service.deleteFileFromS3.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app)
        .delete('/api/uploads/file')
        .send({ fileUrl: 'models/test.glb' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Delete failed');
    });
  });
});
