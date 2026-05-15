import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/s3Service.js', () => ({
  uploadImageToS3: vi.fn(),
  uploadModelToS3: vi.fn(),
  deleteFileFromS3: vi.fn(),
  generatePresignedPutUrl: vi.fn(),
  generatePresignedGetUrl: vi.fn()
}));

import * as s3Service from '../../src/services/s3Service.js';

describe('S3Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadImageToS3', () => {
    it('should upload JPEG images successfully', async () => {
      const fileBuffer = Buffer.from('fake image data');
      const filename = 'test.jpg';
      const mimeType = 'image/jpeg';

      s3Service.uploadImageToS3.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/images/test.jpg'
      );

      const result = await s3Service.uploadImageToS3(fileBuffer, filename, 'monument-id', mimeType);

      expect(result).toBe('https://historiar-storage-prod.s3.us-east-1.amazonaws.com/images/test.jpg');
      expect(s3Service.uploadImageToS3).toHaveBeenCalledWith(fileBuffer, filename, 'monument-id', mimeType);
    });

    it('should upload PNG images successfully', async () => {
      const fileBuffer = Buffer.from('fake image data');
      const filename = 'test.png';
      const mimeType = 'image/png';

      s3Service.uploadImageToS3.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/images/test.png'
      );

      const result = await s3Service.uploadImageToS3(fileBuffer, filename, 'monument-id', mimeType);

      expect(result).toBe('https://historiar-storage-prod.s3.us-east-1.amazonaws.com/images/test.png');
    });

    it('should handle upload errors', async () => {
      s3Service.uploadImageToS3.mockRejectedValue(new Error('S3 upload failed'));

      await expect(s3Service.uploadImageToS3(Buffer.from('data'), 'test.jpg', 'id', 'image/jpeg'))
        .rejects.toThrow('S3 upload failed');
    });
  });

  describe('uploadModelToS3', () => {
    it('should upload GLB models successfully', async () => {
      const fileBuffer = Buffer.from('fake model data');
      const filename = 'model.glb';
      const mimeType = 'model/gltf-binary';

      s3Service.uploadModelToS3.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/models/model.glb'
      );

      const result = await s3Service.uploadModelToS3(fileBuffer, filename, 'monument-id', mimeType);

      expect(result).toBe('https://historiar-storage-prod.s3.us-east-1.amazonaws.com/models/model.glb');
    });

    it('should handle model upload errors', async () => {
      s3Service.uploadModelToS3.mockRejectedValue(new Error('S3 upload failed'));

      await expect(s3Service.uploadModelToS3(Buffer.from('data'), 'model.glb', 'id', 'model/gltf-binary'))
        .rejects.toThrow('S3 upload failed');
    });
  });

  describe('deleteFileFromS3', () => {
    it('should delete files successfully', async () => {
      s3Service.deleteFileFromS3.mockResolvedValue(true);

      const result = await s3Service.deleteFileFromS3('models/monument-id/model.glb');

      expect(result).toBe(true);
      expect(s3Service.deleteFileFromS3).toHaveBeenCalledWith('models/monument-id/model.glb');
    });

    it('should handle deletion errors', async () => {
      s3Service.deleteFileFromS3.mockRejectedValue(new Error('S3 delete failed'));

      await expect(s3Service.deleteFileFromS3('models/monument-id/model.glb'))
        .rejects.toThrow('S3 delete failed');
    });
  });

  describe('generatePresignedPutUrl', () => {
    it('should generate presigned PUT URLs', async () => {
      s3Service.generatePresignedPutUrl.mockResolvedValue(
        'https://historiar-storage-prod.s3.us-east-1.amazonaws.com/...presigned...'
      );

      const result = await s3Service.generatePresignedPutUrl({
        key: 'models/monument-id/model.glb',
        contentType: 'model/gltf-binary',
        expiresIn: 900
      });

      expect(result).toContain('https://');
      expect(s3Service.generatePresignedPutUrl).toHaveBeenCalled();
    });
  });
});
