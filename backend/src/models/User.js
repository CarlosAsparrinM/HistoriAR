import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, select: false },
  // `sub` is the stable identifier issued by Google. Do not use email as the
  // Google identity key: it can change while `sub` does not.
  googleSubject: { type: String, unique: true, sparse: true, select: false },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  avatarUrl:{ type: String },
  district: { type: String },
  termsAcceptedAt: { type: Date },
  termsVersion: { type: String },
  privacyVersion: { type: String },
  status:   { type: String, enum: ['Activo', 'Suspendido', 'Eliminado'], default: 'Activo' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
