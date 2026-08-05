import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock auth middleware
vi.mock('../../src/middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: 'No token provided' });
    }
    req.user = { id: 'test-user-id', role: 'user' };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

// Mock the Monument model
const mockMonuments = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Machu Picchu',
    description: 'Ancient Inca citadel',
    category: 'Arqueológico',
    location: { district: 'Cusco', lat: -13.1631, lng: -72.5450 },
    status: 'Disponible',
    institutionId: '507f1f77bcf86cd799439012'
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'Plaza de Armas',
    description: 'Colonial main square',
    category: 'Colonial',
    location: { district: 'Lima', lat: -12.0464, lng: -77.0428 },
    status: 'Disponible',
    institutionId: '507f1f77bcf86cd799439014'
  },
  {
    _id: '507f1f77bcf86cd799439015',
    name: 'Casa de la Literatura',
    description: 'Republican era building',
    category: 'Republicano',
    location: { district: 'Lima', lat: -12.0464, lng: -77.0428 },
    status: 'Disponible',
    institutionId: '507f1f77bcf86cd799439014'
  }
];

const mockInstitutions = [
  { _id: '507f1f77bcf86cd799439012', name: 'Museo Nacional' },
  { _id: '507f1f77bcf86cd799439014', name: 'Municipalidad de Lima' }
];

// Mock Monument service
const mockMonumentService = {
  searchMonuments: vi.fn(),
  getFilterOptions: vi.fn()
};

vi.mock('../../src/services/monumentService.js', () => ({
  searchMonuments: mockMonumentService.searchMonuments,
  getFilterOptions: mockMonumentService.getFilterOptions
}));

// Mock pagination utility
vi.mock('../../src/utils/pagination.js', () => ({
  buildPagination: vi.fn((query) => ({
    page: parseInt(query.page || '1'),
    limit: parseInt(query.limit || '10'),
    skip: (parseInt(query.page || '1') - 1) * parseInt(query.limit || '10')
  }))
}));

// Import after mocking
const { default: monumentsRouter } = await import('../../src/routes/monuments.routes.js');

const app = express();
app.use(express.json());
app.use('/api/monuments', monumentsRouter);

describe('Monument Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/monuments/search', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await request(app)
        .get('/api/monuments/search')
        .query({ text: 'Machu' });

      expect(response.status).toBe(401);
    });

    it('should search monuments by text when token is provided', async () => {
      const searchResults = {
        items: [mockMonuments[0]],
        total: 1
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ text: 'Machu' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        page: 1,
        total: 1,
        items: [mockMonuments[0]]
      });
      
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: 'Machu', district: undefined, category: undefined, institution: undefined },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should search monuments by district filter', async () => {
      const searchResults = {
        items: [mockMonuments[1], mockMonuments[2]],
        total: 2
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ district: 'Lima' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: undefined, district: 'Lima', category: undefined, institution: undefined },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should search monuments by category filter', async () => {
      const searchResults = {
        items: [mockMonuments[0]],
        total: 1
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ category: 'Arqueológico' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: undefined, district: undefined, category: 'Arqueológico', institution: undefined },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should search monuments by institution filter', async () => {
      const searchResults = {
        items: [mockMonuments[1]],
        total: 1
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ institution: '507f1f77bcf86cd799439014' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: undefined, district: undefined, category: undefined, institution: '507f1f77bcf86cd799439014' },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should search monuments with multiple filters', async () => {
      const searchResults = {
        items: [mockMonuments[2]],
        total: 1
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ 
          text: 'Casa',
          district: 'Lima',
          category: 'Republicano'
        });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: 'Casa', district: 'Lima', category: 'Republicano', institution: undefined },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should handle pagination parameters', async () => {
      const searchResults = {
        items: [mockMonuments[0]],
        total: 25
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ 
          text: 'monument',
          page: '3',
          limit: '5'
        });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(3);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: 'monument', district: undefined, category: undefined, institution: undefined },
        { skip: 10, limit: 5, populate: false }
      );
    });

    it('should handle populate parameter', async () => {
      const searchResults = {
        items: [mockMonuments[0]],
        total: 1
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ 
          text: 'Machu',
          populate: 'true'
        });

      expect(response.status).toBe(200);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: 'Machu', district: undefined, category: undefined, institution: undefined },
        { skip: 0, limit: 10, populate: true }
      );
    });

    it('should return empty results when no matches found', async () => {
      const searchResults = {
        items: [],
        total: 0
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ text: 'nonexistent' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        page: 1,
        total: 0,
        items: []
      });
    });

    it('should handle service errors', async () => {
      mockMonumentService.searchMonuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ text: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/monuments/filter-options', () => {
    it('should return filter options successfully', async () => {
      const filterOptions = {
        districts: ['Cusco', 'Lima'],
        categories: ['Arqueológico', 'Colonial', 'Republicano'],
        institutions: mockInstitutions
      };
      
      mockMonumentService.getFilterOptions.mockResolvedValue(filterOptions);

      const response = await request(app)
        .get('/api/monuments/filter-options')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(filterOptions);
      expect(mockMonumentService.getFilterOptions).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors for filter options', async () => {
      mockMonumentService.getFilterOptions.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/monuments/filter-options')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should return empty arrays when no data available', async () => {
      const emptyOptions = {
        districts: [],
        categories: [],
        institutions: []
      };
      
      mockMonumentService.getFilterOptions.mockResolvedValue(emptyOptions);

      const response = await request(app)
        .get('/api/monuments/filter-options')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(emptyOptions);
    });
  });

  describe('Search Performance and Edge Cases', () => {
    it('should handle empty search parameters', async () => {
      const searchResults = {
        items: mockMonuments,
        total: 3
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: undefined, district: undefined, category: undefined, institution: undefined },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should handle whitespace-only search text', async () => {
      const searchResults = {
        items: mockMonuments,
        total: 3
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ text: '   ' });

      expect(response.status).toBe(200);
      expect(mockMonumentService.searchMonuments).toHaveBeenCalledWith(
        { text: '   ', district: undefined, category: undefined, institution: undefined },
        { skip: 0, limit: 10, populate: false }
      );
    });

    it('should handle invalid category values', async () => {
      const searchResults = {
        items: [],
        total: 0
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ category: 'InvalidCategory' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
    });

    it('should handle invalid institution ID format', async () => {
      const searchResults = {
        items: [],
        total: 0
      };
      
      mockMonumentService.searchMonuments.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/monuments/search')
        .set('Authorization', 'Bearer valid-token')
        .query({ institution: 'invalid-id' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
    });
  });
});