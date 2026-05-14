import { buildPagination } from '../utils/pagination.js';
import { getAllCultures, getCultureById, createCulture, updateCulture, deleteCulture, getCultureStats } from '../services/cultureService.js';

export async function listCultures(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const activeOnly = req.query.activeOnly === 'true';
    const { items, total } = await getAllCultures({
      skip,
      limit,
      activeOnly,
      search: req.query.search || ''
    });
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCultureStatsController(_req, res) {
  try {
    const stats = await getCultureStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCulture(req, res) {
  try {
    const doc = await getCultureById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Cultura no encontrada' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createCultureController(req, res) {
  try {
    const doc = await createCulture(req.body);
    res.status(201).json({ id: doc._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateCultureController(req, res) {
  try {
    const doc = await updateCulture(req.params.id, req.body);
    if (!doc) return res.status(404).json({ message: 'Cultura no encontrada' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteCultureController(req, res) {
  try {
    const doc = await deleteCulture(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Cultura no encontrada' });
    res.json({ message: 'Cultura eliminada' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}