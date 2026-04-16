import Culture from '../models/Culture.js';

export async function getAllCultures({ skip = 0, limit = 50, activeOnly = false, search = '' } = {}) {
  const filter = activeOnly ? { isActive: true } : {};

  if (search && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } }
    ];
  }

  const items = await Culture.find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Culture.countDocuments(filter);

  return { items, total };
}

export async function getCultureById(id) {
  return await Culture.findById(id);
}

export async function createCulture(data) {
  const culture = new Culture(data);
  return await culture.save();
}

export async function updateCulture(id, data) {
  return await Culture.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteCulture(id) {
  return await Culture.findByIdAndDelete(id);
}

export async function getCultureStats() {
  const [total, active] = await Promise.all([
    Culture.countDocuments({}),
    Culture.countDocuments({ isActive: true })
  ]);

  return { total, active };
}