import mongoose from 'mongoose';

const HistoricalDataSchema = new mongoose.Schema({
  monumentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Monument', required: true, index: true },
  title:        { type: String, required: true },
  description:  { type: String },
  imageUrl:     { type: String }, // S3 URL for the main image of this historical data entry
  s3ImageKey:   { type: String }, // S3 object key for the main image
  s3ImageFileName: { type: String }, // S3 filename for image deletion
  discoveryInfo:{ type: String },
  oldImages:    [{ type: String }], // Additional URLs (legacy field, can be used for galleries)
  activities:   [{ type: String }],
  sources:      [{ type: String }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  order:        { type: Number, default: 0 } // Para ordenar las entradas de información
}, { timestamps: { createdAt: true, updatedAt: true } });

// Index for efficient queries
HistoricalDataSchema.index({ monumentId: 1, order: 1 });

export default mongoose.model('HistoricalData', HistoricalDataSchema);
