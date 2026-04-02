import mongoose from 'mongoose';

const ModelVersionSchema = new mongoose.Schema({
  monumentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Monument', 
    required: true,
    index: true 
  },
  filename: { 
    type: String, 
    required: true 
  },
  url: { 
    type: String, 
    required: true 
  },
  s3Key: {
    type: String,
    index: true
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: false,
    index: true 
  }, // Solo una versión puede ser true por monumento
  fileSize: { 
    type: Number, 
    required: true 
  }, // En bytes
  tilesUrl: {
    type: String
  } // URL del tileset.json para 3D Tiles (opcional)
}, { timestamps: true });

// Índices compuestos para queries de historial y versión activa
ModelVersionSchema.index({ monumentId: 1, uploadedAt: -1 });
ModelVersionSchema.index({ monumentId: 1, isActive: 1 });

export default mongoose.model('ModelVersion', ModelVersionSchema);
