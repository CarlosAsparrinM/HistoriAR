import Tour from '../models/Tour.js';
import Monument from '../models/Monument.js';

const TOUR_MONUMENT_FIELDS = [
  'name',
  'description',
  'status',
  'location',
  'culture',
  'period',
  'discovery',
  'imageUrl',
  's3ImageKey',
  'model3DUrl',
  's3ModelKey'
].join(' ');

const TOUR_INSTITUTION_FIELDS = [
  'name',
  'description',
  'imageUrl',
  'status',
  'location'
].join(' ');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeInstitutionOptions(activeOnlyOrOptions, options) {
  if (typeof activeOnlyOrOptions === 'object' && activeOnlyOrOptions !== null) {
    return activeOnlyOrOptions;
  }

  return {
    ...options,
    activeOnly: activeOnlyOrOptions !== undefined ? activeOnlyOrOptions : true
  };
}

function applyTourPopulation(query, {
  populate = true,
  includeCreatedBy = false
} = {}) {
  if (!populate) return query;

  query
    .populate({
      path: 'monuments.monumentId',
      select: TOUR_MONUMENT_FIELDS
    })
    .populate({
      path: 'institutionId',
      select: TOUR_INSTITUTION_FIELDS
    });

  if (includeCreatedBy) {
    query.populate('createdBy', 'name email');
  }

  return query;
}

class TourService {
  /**
   * Crear nuevo tour
   * @param {Object} tourData - Datos del tour
   * @param {string} userId - ID del usuario creador
   * @returns {Promise<Object>} Tour creado
   */
  async createTour(tourData, userId) {
    try {
      // Validar que monumentos pertenezcan a la institución
      const monumentIds = tourData.monuments.map(m => m.monumentId);
      const monuments = await Monument.find({
        _id: { $in: monumentIds },
        institutionId: tourData.institutionId
      }).select('_id').lean();
      
      if (monuments.length !== monumentIds.length) {
        throw new Error('Some monuments do not belong to the selected institution');
      }
      
      // Crear tour
      const tour = new Tour({
        ...tourData,
        createdBy: userId
      });
      
      return await tour.save();
    } catch (error) {
      console.error('Error creating tour:', error);
      throw new Error(`Failed to create tour: ${error.message}`);
    }
  }

  /**
   * Obtener tours por institución
   * @param {string} institutionId - ID de la institución
   * @param {boolean} activeOnly - Solo tours activos (default: true)
   * @returns {Promise<Array>} Array de tours
   */
  async getToursByInstitution(institutionId, activeOnlyOrOptions = true, maybeOptions = {}) {
    try {
      const {
        activeOnly = true,
        skip = 0,
        limit = 10,
        populate = true
      } = normalizeInstitutionOptions(activeOnlyOrOptions, maybeOptions);
      const query = { institutionId };
      if (activeOnly) query.isActive = true;

      const toursQuery = applyTourPopulation(
        Tour.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        { populate }
      ).lean();

      const [items, total] = await Promise.all([
        toursQuery.exec(),
        Tour.countDocuments(query)
      ]);

      return { items, total };
    } catch (error) {
      console.error('Error getting tours by institution:', error);
      throw new Error(`Failed to get tours: ${error.message}`);
    }
  }

  /**
   * Obtener tour por ID
   * @param {string} tourId - ID del tour
   * @returns {Promise<Object>} Tour
   */
  async getTourById(tourId) {
    try {
      return await applyTourPopulation(Tour.findById(tourId), {
        populate: true,
        includeCreatedBy: true
      }).lean();
    } catch (error) {
      console.error('Error getting tour by ID:', error);
      throw new Error(`Failed to get tour: ${error.message}`);
    }
  }

  /**
   * Obtener todos los tours
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Array de tours
   */
  async getAllTours(filters = {}, {
    skip = 0,
    limit = 10,
    populate = true
  } = {}) {
    try {
      const query = {};
      
      if (filters.institutionId) {
        query.institutionId = filters.institutionId;
      }
      
      if (filters.type) {
        query.type = filters.type;
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      if (filters.district) {
        // Buscar IDs de monumentos que pertenezcan a este distrito (insensible a mayúsculas/minúsculas)
        const monumentsInDistrict = await Monument.find({
          'location.district': { $regex: new RegExp(`^${escapeRegex(filters.district)}$`, 'i') }
        }).select('_id').lean();
        const monumentIds = monumentsInDistrict.map(m => m._id);
        
        // El query buscará tours donde al menos un monumento de la lista pertenezca al distrito
        query['monuments.monumentId'] = { $in: monumentIds };
      }
      
      const toursQuery = applyTourPopulation(
        Tour.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        { populate, includeCreatedBy: true }
      ).lean();

      const [items, total] = await Promise.all([
        toursQuery.exec(),
        Tour.countDocuments(query)
      ]);

      return { items, total };
    } catch (error) {
      console.error('Error getting all tours:', error);
      throw new Error(`Failed to get tours: ${error.message}`);
    }
  }

  /**
   * Actualizar tour
   * @param {string} tourId - ID del tour
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Tour actualizado
   */
  async updateTour(tourId, updateData) {
    try {
      // Si se actualizan monumentos, validar que pertenezcan a la institución
      if (updateData.monuments) {
        const tour = await Tour.findById(tourId);
        if (!tour) {
          throw new Error('Tour not found');
        }
        
        const monumentIds = updateData.monuments.map(m => m.monumentId);
        const monuments = await Monument.find({
          _id: { $in: monumentIds },
          institutionId: tour.institutionId
        }).select('_id').lean();
        
        if (monuments.length !== monumentIds.length) {
          throw new Error('Some monuments do not belong to the institution');
        }
      }
      
      return await applyTourPopulation(
        Tour.findByIdAndUpdate(tourId, updateData, { new: true }),
        { populate: true }
      );
    } catch (error) {
      console.error('Error updating tour:', error);
      throw new Error(`Failed to update tour: ${error.message}`);
    }
  }

  /**
   * Actualizar orden de monumentos en tour
   * @param {string} tourId - ID del tour
   * @param {Array} newMonumentsOrder - Nuevo orden de monumentos
   * @returns {Promise<Object>} Tour actualizado
   */
  async updateTourOrder(tourId, newMonumentsOrder) {
    try {
      return await Tour.findByIdAndUpdate(
        tourId,
        { monuments: newMonumentsOrder },
        { new: true }
      ).populate({
        path: 'monuments.monumentId',
        select: TOUR_MONUMENT_FIELDS
      });
    } catch (error) {
      console.error('Error updating tour order:', error);
      throw new Error(`Failed to update tour order: ${error.message}`);
    }
  }

  /**
   * Eliminar tour
   * @param {string} tourId - ID del tour
   * @returns {Promise<Object>} Tour eliminado
   */
  async deleteTour(tourId) {
    try {
      return await Tour.findByIdAndDelete(tourId);
    } catch (error) {
      console.error('Error deleting tour:', error);
      throw new Error(`Failed to delete tour: ${error.message}`);
    }
  }
}

export default new TourService();
