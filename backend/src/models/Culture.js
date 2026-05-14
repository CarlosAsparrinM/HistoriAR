import mongoose from 'mongoose';

const CultureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

CultureSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Culture', CultureSchema);