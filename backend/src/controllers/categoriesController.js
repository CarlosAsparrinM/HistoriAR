import { buildPagination } from '../utils/pagination.js';
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getCategoryStats } from '../services/categoryService.js';

export async function listCategories(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const activeOnly = req.query.activeOnly === 'true';
    const { items, total } = await getAllCategories({
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

export async function getCategoryStatsController(_req, res) {
  try {
    const stats = await getCategoryStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCategory(req, res) {
  try {
    const doc = await getCategoryById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json(doc);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
}

export async function createCategoryController(req, res) {
  try {
    const doc = await createCategory(req.body);
    res.status(201).json({ id: doc._id });
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
}

export async function updateCategoryController(req, res) {
  try {
    const doc = await updateCategory(req.params.id, req.body);
    if (!doc) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json(doc);
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
}

export async function deleteCategoryController(req, res) {
  try {
    const doc = await deleteCategory(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json({ message: 'Categoría eliminada' });
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
}