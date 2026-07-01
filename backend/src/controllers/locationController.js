import locationService from '../services/locationService.js';
import { buildPagination } from '../utils/pagination.js';

/**
 * Obtener contexto de ubicación (institución y tours disponibles)
 */
export async function getLocationContextController(req, res) {
  try {
    const { lat, lng } = req.query;
    
    // Validar coordenadas
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
    }
    
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
    }
    
    const { skip, limit, page } = buildPagination(req.query);
    const context = await locationService.getAvailableToursForLocation(
      latitude,
      longitude,
      { skip, limit }
    );
    context.page = page;
    res.json(context);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Obtener monumentos cercanos
 */
export async function getNearbyMonumentsController(req, res) {
  try {
    const { lat, lng, maxDistance } = req.query;
    
    // Validar coordenadas
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const distance = maxDistance ? parseFloat(maxDistance) : 20;
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
    }
    
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
    }
    
    if (isNaN(distance) || distance <= 0) {
      return res.status(400).json({ message: 'maxDistance must be a positive number' });
    }
    
    const monuments = await locationService.getNearbyMonuments(latitude, longitude, distance);
    res.json({ total: monuments.length, items: monuments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
