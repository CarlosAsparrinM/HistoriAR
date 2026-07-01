import mongoose from 'mongoose';

const TourSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  institutionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Institution', 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    enum: [
      'Recomendado', 
      'Cronológico', 
      'Temático', 
      'Arquitectónico', 
      'Familiar', 
      'Experto', 
      'Rápido', 
      'Completo'
    ],
    required: true,
    index: true
  },
  monuments: [{
    monumentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Monument', 
      required: true 
    },
    order: { 
      type: Number, 
      required: true 
    },
    description: { 
      type: String 
    }
  }],
  estimatedDuration: { 
    type: Number, 
    required: true 
  }, // En minutos
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true });

// Índices compuestos para optimizar queries frecuentes
TourSchema.index({ institutionId: 1, isActive: 1 });
TourSchema.index({ institutionId: 1, isActive: 1, createdAt: -1 });
TourSchema.index({ type: 1, isActive: 1 });
TourSchema.index({ type: 1, isActive: 1, createdAt: -1 });
TourSchema.index({ isActive: 1, createdAt: -1 });
TourSchema.index({ 'monuments.monumentId': 1 });

export default mongoose.model('Tour', TourSchema);
