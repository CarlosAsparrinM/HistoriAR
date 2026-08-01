import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, select: false },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  avatarUrl:{ type: String },
  district: { type: String },
  status:   { type: String, enum: ['Activo', 'Suspendido', 'Eliminado'], default: 'Activo' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
