import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Monument model
const mockMonumentModel = {
  find: vi.fn(),
  countDocuments: vi.fn(),
  distinct: vi.fn(),
  aggregate: vi.fn()
};

// Mock mongoose
vi.mock('mongoose', () => {
  class FakeSchema {
    constructor() {}
    index() {}
  }

  FakeSchema.Types = {
    ObjectId: class ObjectId {}
  };

  return {
    default: {
      Schema: FakeSchema,
      model: vi.fn()
    }
  };
});

// Mock the Monument model
vi.mock('../../src/models/Monument.js', () => ({
  default: mockMonumentModel
}));

// Import after mocking
const { searchMonuments, getFilterOptions } = await import('../../src/services/monumentService.js');

describe('Monument Service - Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchMonuments', () => {
    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn()
    };

    beforeEach(() => {
      mockMonumentModel.find.mockReturnValue(mockQuery);
      mockMonumentModel.countDocuments.mockResolvedValue(0);
    });

    it('should search monuments with text query and relevance scoring', async () => {
      const mockResults = [
        { _id: '1', name: 'Machu Picchu', description: 'Ancient citadel', score: 1.5 }
      ];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({ text: 'Machu' });

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        $text: { $search: 'Machu' },
        status: 'Disponible'
      });
      expect(mockQuery.select).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
      expect(mockQuery.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
      expect(result).toEqual({ items: mockResults, total: 1 });
    });

    it('should search monuments by district with case-insensitive matching', async () => {
      const mockResults = [
        { _id: '1', name: 'Plaza de Armas', location: { district: 'Lima' } }
      ];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({ district: 'lima' });

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        'location.district': { $regex: 'lima', $options: 'i' },
        status: 'Disponible'
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual({ items: mockResults, total: 1 });
    });

    it('should search monuments by category', async () => {
      const mockResults = [
        { _id: '1', name: 'Machu Picchu', categoryId: 'Arqueológico' }
      ];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({ category: 'Arqueológico' });

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        categoryId: 'Arqueológico',
        status: 'Disponible'
      });
      expect(result).toEqual({ items: mockResults, total: 1 });
    });

    it('should search monuments by institution', async () => {
      const mockResults = [
        { _id: '1', name: 'Monument', institutionId: '507f1f77bcf86cd799439011' }
      ];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({ institution: '507f1f77bcf86cd799439011' });

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        institutionId: '507f1f77bcf86cd799439011',
        status: 'Disponible'
      });
      expect(result).toEqual({ items: mockResults, total: 1 });
    });

    it('should combine multiple search filters', async () => {
      const mockResults = [
        { _id: '1', name: 'Casa Colonial', category: 'Colonial', location: { district: 'Lima' } }
      ];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({
        text: 'Casa',
        district: 'Lima',
        category: 'Colonial',
        institution: '507f1f77bcf86cd799439011'
      });

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        $text: { $search: 'Casa' },
        'location.district': { $regex: 'Lima', $options: 'i' },
        categoryId: 'Colonial',
        institutionId: '507f1f77bcf86cd799439011',
        status: 'Disponible'
      });
      expect(result).toEqual({ items: mockResults, total: 1 });
    });

    it('should apply pagination correctly', async () => {
      const mockResults = [{ _id: '1', name: 'Monument' }];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(25);

      const result = await searchMonuments({ text: 'test' }, { skip: 10, limit: 5 });

      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual({ items: mockResults, total: 25 });
    });

    it('should populate related fields when requested', async () => {
      const mockResults = [{ _id: '1', name: 'Monument' }];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      await searchMonuments({ text: 'test' }, { populate: true });

      expect(mockQuery.populate).toHaveBeenCalledWith('institutionId createdBy');
    });

    it('should handle empty search parameters', async () => {
      const mockResults = [{ _id: '1', name: 'Monument' }];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({});

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        status: 'Disponible'
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual({ items: mockResults, total: 1 });
    });

    it('should ignore empty string parameters', async () => {
      const mockResults = [{ _id: '1', name: 'Monument' }];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      const result = await searchMonuments({
        text: '',
        district: '  ',
        category: '',
        institution: ''
      });

      expect(mockMonumentModel.find).toHaveBeenCalledWith({
        status: 'Disponible'
      });
    });

    it('should only return available monuments', async () => {
      const mockResults = [{ _id: '1', name: 'Monument', status: 'Disponible' }];
      
      mockQuery.exec.mockResolvedValue(mockResults);
      mockMonumentModel.countDocuments.mockResolvedValue(1);

      await searchMonuments({ text: 'test' });

      expect(mockMonumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Disponible' })
      );
    });
  });

  describe('getFilterOptions', () => {
    it('should return all filter options', async () => {
      const mockDistricts = ['Lima', 'Cusco', 'Arequipa'];
      const mockCategories = ['Arqueológico', 'Colonial', 'Republicano'];
      const mockInstitutions = [
        { _id: '507f1f77bcf86cd799439011', name: 'Museo Nacional' },
        { _id: '507f1f77bcf86cd799439012', name: 'Universidad de Lima' }
      ];

      mockMonumentModel.distinct
        .mockResolvedValueOnce(mockDistricts)
        .mockResolvedValueOnce(mockCategories);
      
      mockMonumentModel.aggregate.mockResolvedValue(mockInstitutions);

      const result = await getFilterOptions();

      expect(result).toEqual({
        districts: ['Arequipa', 'Cusco', 'Lima'], // Sorted alphabetically
        categories: ['Arqueológico', 'Colonial', 'Republicano'], // Already sorted
        institutions: mockInstitutions
      });
    });

    it('should filter out null and empty districts', async () => {
      mockMonumentModel.distinct.mockResolvedValueOnce(['Lima', 'Cusco']);
      mockMonumentModel.distinct.mockResolvedValueOnce(['Arqueológico']);
      mockMonumentModel.aggregate.mockResolvedValue([]);

      await getFilterOptions();

      expect(mockMonumentModel.distinct).toHaveBeenCalledWith(
        'location.district',
        { status: 'Disponible', 'location.district': { $ne: null, $ne: '' } }
      );
    });

    it('should only include available monuments in filter options', async () => {
      mockMonumentModel.distinct.mockResolvedValue([]);
      mockMonumentModel.aggregate.mockResolvedValue([]);

      await getFilterOptions();

      expect(mockMonumentModel.distinct).toHaveBeenCalledWith(
        'location.district',
        expect.objectContaining({ status: 'Disponible' })
      );
      expect(mockMonumentModel.distinct).toHaveBeenCalledWith(
        'categoryId',
        expect.objectContaining({ status: 'Disponible' })
      );
    });

    it('should sort districts and categories alphabetically', async () => {
      const unsortedDistricts = ['Cusco', 'Arequipa', 'Lima'];
      const unsortedCategories = ['Colonial', 'Arqueológico', 'Republicano'];
      
      mockMonumentModel.distinct
        .mockResolvedValueOnce(unsortedDistricts)
        .mockResolvedValueOnce(unsortedCategories);
      mockMonumentModel.aggregate.mockResolvedValue([]);

      const result = await getFilterOptions();

      expect(result.districts).toEqual(['Arequipa', 'Cusco', 'Lima']);
      expect(result.categories).toEqual(['Arqueológico', 'Colonial', 'Republicano']);
    });

    it('should handle institutions aggregation correctly', async () => {
      mockMonumentModel.distinct.mockResolvedValue([]);
      mockMonumentModel.aggregate.mockResolvedValue([]);

      await getFilterOptions();

      expect(mockMonumentModel.aggregate).toHaveBeenCalledWith([
        { $match: { status: 'Disponible', institutionId: { $ne: null } } },
        { $group: { _id: '$institutionId' } },
        { $lookup: { from: 'institutions', localField: '_id', foreignField: '_id', as: 'institution' } },
        { $unwind: '$institution' },
        { $project: { _id: '$institution._id', name: '$institution.name' } },
        { $sort: { name: 1 } }
      ]);
    });

    it('should handle empty results gracefully', async () => {
      mockMonumentModel.distinct.mockResolvedValue([]);
      mockMonumentModel.aggregate.mockResolvedValue([]);

      const result = await getFilterOptions();

      expect(result).toEqual({
        districts: [],
        categories: [],
        institutions: []
      });
    });
  });
});