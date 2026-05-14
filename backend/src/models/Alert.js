import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['performance', 'error', 'anomaly', 'milestone', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    // Datos contextuales (visitCount, errorMessage, monumentName, etc)
    type: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  action: {
    // Acción recomendada: 'view_analytics', 'check_system', 'review_data', etc
    type: String
  },
  actionUrl: String,
  dismissible: {
    type: Boolean,
    default: true
  },
  dismissed: {
    type: Boolean,
    default: false
  },
  dismissedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    // Alertas que expiran automáticamente después de 30 días
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: true
  }
}, { timestamps: true });

// TTL index para eliminar alertas automáticamente después de expiresAt
AlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Alert', AlertSchema);
