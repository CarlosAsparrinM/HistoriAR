import Institution from '../models/Institution.js';

export async function getAllInstitutions({ skip = 0, limit = 10, availableOnly = false, search = '', type = 'all', status = 'all' } = {}) {
  const filter = {};

  if (availableOnly) {
    filter.status = 'Disponible';
  }

  if (type && type !== 'all') {
    filter.type = type;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { 'location.district': { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } }
    ];
  }
  
  const [items, total] = await Promise.all([
    Institution.find(filter).skip(skip).limit(limit),
    Institution.countDocuments(filter)
  ]);
  return { items, total };
}

export async function getInstitutionById(id) {
  return await Institution.findById(id);
}

export async function createInstitution(data) {
  return await Institution.create(data);
}

export async function updateInstitution(id, data) {
  return await Institution.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteInstitution(id) {
  return await Institution.findByIdAndDelete(id);
}

export async function getInstitutionStats() {
  const [total, available, hidden, museums] = await Promise.all([
    Institution.countDocuments({}),
    Institution.countDocuments({ status: 'Disponible' }),
    Institution.countDocuments({ status: 'Oculto' }),
    Institution.countDocuments({ type: 'Museo' })
  ]);

  return { total, available, hidden, museums };
}
