import mongoose from 'mongoose';

const StopVisitedSchema = new mongoose.Schema({
  monumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monument', required: true },
  visitedAt: { type: Date, default: Date.now },
  duration: { type: Number }, // minutos
});

const TourSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    stopsVisited: { type: [StopVisitedSchema], default: [] },
    totalDuration: { type: Number }, // minutos
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

// Índices útiles
TourSessionSchema.index({ userId: 1 });
TourSessionSchema.index({ tourId: 1 });
TourSessionSchema.index({ userId: 1, tourId: 1 });
TourSessionSchema.index({ userId: 1, completedAt: 1, createdAt: -1 });

export default mongoose.model('TourSession', TourSessionSchema);
