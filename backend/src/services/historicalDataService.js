import HistoricalData from '../models/HistoricalData.js';

export async function getAllHistoricalData({ skip = 0, limit = 10 } = {}) {
  const [items, total] = await Promise.all([
    HistoricalData.find().skip(skip).limit(limit),
    HistoricalData.countDocuments()
  ]);
  return { items, total };
}

export async function getHistoricalDataById(id) {
  return await HistoricalData.findById(id);
}

export async function createHistoricalData(data) {
  return await HistoricalData.create(data);
}

export async function updateHistoricalData(id, data) {
  return await HistoricalData.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function deleteHistoricalData(id) {
  return await HistoricalData.findByIdAndDelete(id);
}
