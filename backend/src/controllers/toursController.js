import tourService from '../services/tourService.js';
import { buildPagination } from '../utils/pagination.js';

function shouldPopulateTours(query) {
  if (query.populate !== undefined) return query.populate !== 'false';
  if (query.summary !== undefined) return query.summary !== 'true';
  return true;
}

/**
 * Crear nuevo tour
 */
export async function createTourController(req, res) {
  try {
    const userId = req.user?.id; // Cambiado de req.user?.sub a req.user?.id
    const tour = await tourService.createTour(req.body, userId);
    res.status(201).json({ id: tour._id, tour });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * Listar todos los tours con filtros opcionales
 */
export async function listToursController(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const filters = {
      institutionId: req.query.institutionId,
      type: req.query.type,
      district: req.query.district,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    };
    
    const { items, total } = await tourService.getAllTours(filters, {
      skip,
      limit,
      populate: shouldPopulateTours(req.query)
    });
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Obtener tour por ID
 */
export async function getTourController(req, res) {
  try {
    const tour = await tourService.getTourById(req.params.id);
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Actualizar tour
 */
export async function updateTourController(req, res) {
  try {
    const tour = await tourService.updateTour(req.params.id, req.body);
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    res.json(tour);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * Eliminar tour
 */
export async function deleteTourController(req, res) {
  try {
    const tour = await tourService.deleteTour(req.params.id);
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    res.json({ message: 'Tour deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Obtener tours por institución
 */
export async function getToursByInstitutionController(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const activeOnly = req.query.activeOnly !== 'false';
    const { items, total } = await tourService.getToursByInstitution(
      req.params.institutionId,
      {
        activeOnly,
        skip,
        limit,
        populate: shouldPopulateTours(req.query)
      }
    );
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
