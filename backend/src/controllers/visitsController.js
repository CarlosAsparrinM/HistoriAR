import {
  createVisit,
  deleteVisit,
  getAllVisits,
  getVisitById,
  updateVisit,
} from '../services/visitService.js';
import { buildPagination } from '../utils/pagination.js';

export async function listVisit(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.monumentId) filter.monumentId = req.query.monumentId;

    if (req.user?.role !== 'admin') {
      filter.userId = req.user?.id;
    }

    const { items, total } = await getAllVisits(filter, { skip, limit });
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getVisit(req, res) {
  const doc = await getVisitById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json(doc);
}

export async function createVisitController(req, res) {
  try {
    const body = { ...req.body };
    if (!body.userId && req.user?.id) body.userId = req.user.id;

    if (req.user?.role !== 'admin') {
      body.userId = req.user?.id;
    }

    const doc = await createVisit(body);
    res.status(201).json({ id: doc._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateVisitController(req, res) {
  try {
    const doc = await updateVisit(req.params.id, req.body);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteVisitController(req, res) {
  const doc = await deleteVisit(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json({ message: 'Eliminado' });
}
