import mongoose from 'mongoose';

const VisitSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monument', required: true },
  date:       { type: Date, default: Date.now },
  duration:   { type: Number },   // minutos
  rating:     { type: Number, min: 1, max: 5 },
  device:     { type: String },
  isAR:       { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Visit', VisitSchema);
