import { buildPagination } from '../utils/pagination.js';
import { getAllInstitutions, getInstitutionById, createInstitution, updateInstitution, deleteInstitution, getInstitutionStats } from '../services/institutionService.js';
import * as s3Service from '../services/s3Service.js';

const MEDIA_URL_EXPIRATION_SECONDS = 60 * 60;

async function signIfNeeded(value) {
  const key = s3Service.resolveS3Key(value);
  if (!key) return value || null;
  return s3Service.generatePresignedGetUrl({ key, expiresIn: MEDIA_URL_EXPIRATION_SECONDS });
}

async function hydrateInstitutionMedia(institution) {
  if (!institution) return institution;

  const plain = institution.toObject ? institution.toObject() : { ...institution };
  plain.imageUrl = await signIfNeeded(plain.s3ImageKey || plain.imageUrl);
  return plain;
}

export async function listInstitution(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const availableOnly = req.query.availableOnly === 'true';
    const { items, total } = await getAllInstitutions({
      skip,
      limit,
      availableOnly,
      search: req.query.search || '',
      type: req.query.type || 'all',
      status: req.query.status || 'all'
    });
    const hydratedItems = await Promise.all(items.map(hydrateInstitutionMedia));
    res.json({ page, total, items: hydratedItems });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function getInstitutionStatsController(_req, res) {
  try {
    const stats = await getInstitutionStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getInstitution(req, res) {
  const doc = await getInstitutionById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json(await hydrateInstitutionMedia(doc));
}

export async function createInstitutionController(req, res) {
  try {
    const doc = await createInstitution(req.body);
    res.status(201).json({ id: doc._id });
  } catch (err) { res.status(400).json({ message: err.message }); }
}

export async function updateInstitutionController(req, res) {
  try {
    const doc = await updateInstitution(req.params.id, req.body);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
}

export async function deleteInstitutionController(req, res) {
  const currentInstitution = await getInstitutionById(req.params.id);
  if (currentInstitution && (currentInstitution.s3ImageKey || currentInstitution.imageUrl)) {
    try {
      await s3Service.deleteFileFromS3(currentInstitution.s3ImageKey || currentInstitution.imageUrl);
    } catch (error) {
      console.error('Error deleting institution image from S3:', error.message);
    }
  }

  const doc = await deleteInstitution(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json({ message: 'Eliminado' });
}
