import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export async function getAllUsers(filter = {}, { skip = 0, limit = 10 } = {}) {
  const [items, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).select('-password'),
    User.countDocuments(filter)
  ]);
  return { items, total };
}

export async function getUserById(id) {
  return await User.findById(id).select('-password');
}

export async function createUser(data) {
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  return await User.create(data);
}

export async function updateUser(id, data) {
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  return await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
}

export async function softDeleteUser(id) {
  const anonymizedEmail = `eliminado_${id}_${Date.now()}@anonymized.com`;
  return await User.findByIdAndUpdate(
    id,
    {
      name: 'Usuario Eliminado',
      email: anonymizedEmail,
      status: 'Eliminado',
      password: null,
      avatarUrl: null,
      district: null
    },
    { new: true }
  );
}
