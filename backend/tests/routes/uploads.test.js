import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockS3Service = vi.hoisted(() => ({
  generatePresignedPutUrl: vi.fn(),
  generatePresignedGetUrl: vi.fn(),
  buildPublicS3Url: vi.fn(),
  resolveS3Key: vi.fn(),
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
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
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
          buffer: Buffer.from('glTFfake model'),
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
  const monumentId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Service.buildPublicS3Url.mockImplementation((key) => `https://bucket.example/${key}`);
    mockS3Service.resolveS3Key.mockImplementation((value) => (
      value?.startsWith(`models/monuments/${monumentId}/`) ? value : null
    ));
  });

  describe('POST /api/uploads/signed-url', () => {
    it('should generate presigned upload URLs', async () => {
      mockS3Service.generatePresignedPutUrl.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/...presigned...'
      );

      const response = await request(app)
        .post('/api/uploads/signed-url')
        .send({
          resourceType: 'monument-model',
          resourceId: monumentId,
          fileName: 'model.glb',
          contentType: 'model/gltf-binary',
          fileSize: 1024,
          expiresIn: 3600
        });

      expect(response.status).toBe(200);
      expect(response.body.url).toContain('https://');
      expect(response.body.publicUrl).toContain('https://bucket.example/');
      expect(response.body.key).toMatch(
        new RegExp(`^models/monuments/${monumentId}/\\d+_model\\.glb$`)
      );
      expect(mockS3Service.generatePresignedPutUrl).toHaveBeenCalledWith(
        expect.objectContaining({ expiresIn: 900, contentLength: 1024 })
      );
    });

    it('should return 400 when key is missing', async () => {
      const response = await request(app)
        .post('/api/uploads/signed-url')
        .send({ contentType: 'model/gltf-binary' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('rechaza traversal y claves construidas por el cliente', async () => {
      const response = await request(app)
        .post('/api/uploads/signed-url')
        .send({
          resourceType: 'monument-model',
          resourceId: monumentId,
          fileName: '../secret.glb',
          contentType: 'model/gltf-binary',
          fileSize: 1024,
          key: 'private/secret.glb'
        });

      expect(response.status).toBe(400);
      expect(mockS3Service.generatePresignedPutUrl).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/uploads/signed-get', () => {
    it('should generate presigned download URLs', async () => {
      mockS3Service.generatePresignedGetUrl.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/...download...'
      );

      const response = await request(app)
        .get('/api/uploads/signed-get')
        .query({ key: `models/monuments/${monumentId}/123_model.glb` });

      expect(response.status).toBe(200);
      expect(response.body.url).toContain('https://');
      expect(response.body.key).toBe(`models/monuments/${monumentId}/123_model.glb`);
    });

    it('should return 400 when key is missing', async () => {
      const response = await request(app)
        .get('/api/uploads/signed-get');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('rechaza claves fuera de los prefijos administrados', async () => {
      const response = await request(app)
        .get('/api/uploads/signed-get')
        .query({ key: 'backups/database.dump' });

      expect(response.status).toBe(400);
      expect(mockS3Service.generatePresignedGetUrl).not.toHaveBeenCalled();
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
        .send({ monumentId });

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toContain('https://');
      expect(response.body.s3Key).toContain(`images/monuments/${monumentId}/`);
      expect(response.body.message).toContain('successfully');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/uploads/image')
        .send({ monumentId });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No image file provided');
    });

    it('should handle upload errors', async () => {
      mockS3Service.uploadImageToS3.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/uploads/image')
        .set('x-test-file', '1')
        .send({ monumentId });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to upload image to S3');
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
        .send({ monumentId });

      expect(response.status).toBe(200);
      expect(response.body.modelUrl).toContain('https://');
      expect(response.body.s3Key).toContain(`models/monuments/${monumentId}/`);
      expect(response.body.message).toContain('successfully');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/uploads/model')
        .send({ monumentId });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No 3D model file provided');
    });
  });

  describe('DELETE /api/uploads/file', () => {
    it('should delete file successfully', async () => {
      mockS3Service.deleteFileFromS3.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/uploads/file')
        .send({ fileUrl: `models/monuments/${monumentId}/123_model.glb` });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.fileUrl).toBe(`models/monuments/${monumentId}/123_model.glb`);
      expect(mockS3Service.deleteFileFromS3).toHaveBeenCalledWith(
        `models/monuments/${monumentId}/123_model.glb`
      );
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
        .send({ fileUrl: `models/monuments/${monumentId}/123_model.glb` });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete file from S3');
    });
  });
});
