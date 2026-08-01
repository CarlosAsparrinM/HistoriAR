import {
  createVisit,
  deleteVisit,
  deleteVisitForUser,
  getAllVisits,
  getVisitById,
  getVisitByIdForUser,
  updateVisit,
  updateVisitForUser,
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
  try {
    const doc = req.user?.role === 'admin'
      ? await getVisitById(req.params.id)
      : await getVisitByIdForUser(req.params.id, req.user?.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    return res.json(doc);
  } catch (err) {
    return res.status(400).json({ message: 'Identificador de visita inválido' });
  }
}

export async function createVisitController(req, res) {
  try {
    const allowedUserFields = [
      'monumentId',
      'tourId',
      'duration',
      'rating',
      'device',
      'experienceType',
      'clientVisitId',
    ];
    const allowedFields = req.user?.role === 'admin'
      ? [...allowedUserFields, 'userId', 'date']
      : allowedUserFields;
    const body = Object.fromEntries(
      Object.entries(req.body || {}).filter(([field]) => allowedFields.includes(field)),
    );
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
    const allowedUserFields = ['duration', 'rating'];
    const allowedAdminFields = [
      ...allowedUserFields,
      'date',
      'device',
      'experienceType',
      'tourId',
      'monumentId',
      'userId',
    ];
    const allowedFields = req.user?.role === 'admin' ? allowedAdminFields : allowedUserFields;
    const payload = Object.fromEntries(
      Object.entries(req.body || {}).filter(([field]) => allowedFields.includes(field)),
    );

    const doc = req.user?.role === 'admin'
      ? await updateVisit(req.params.id, payload)
      : await updateVisitForUser(req.params.id, req.user?.id, payload);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteVisitController(req, res) {
  try {
    const doc = req.user?.role === 'admin'
      ? await deleteVisit(req.params.id)
      : await deleteVisitForUser(req.params.id, req.user?.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    return res.status(400).json({ message: 'Identificador de visita inválido' });
  }
}
