import mongoose from 'mongoose';

const VisitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monument', required: true },
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' }, // Opcional: tour al que pertenece esta visita
    date: { type: Date, default: Date.now },
    duration: { type: Number }, // minutos
    rating: { type: Number, min: 1, max: 5 },
    device: { type: String },
    experienceType: { type: String, enum: ['ar', 'model3d'] },
    clientVisitId: { type: String, trim: true },
  },
  { timestamps: true },
);

// Índices para queries frecuentes
VisitSchema.index({ userId: 1 });
VisitSchema.index({ monumentId: 1 });
VisitSchema.index({ experienceType: 1, date: 1 });
VisitSchema.index({ tourId: 1 });
VisitSchema.index({ userId: 1, tourId: 1 }); // Para obtener todas visitas de un user en un tour
VisitSchema.index(
  { userId: 1, clientVisitId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientVisitId: { $type: 'string' } },
  },
);

export default mongoose.model('Visit', VisitSchema);
