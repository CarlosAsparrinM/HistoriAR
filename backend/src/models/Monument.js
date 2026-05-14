import mongoose from 'mongoose';

const MonumentSchema = new mongoose.Schema({
  name:        { type: String, required: true, index: true },
  description: { type: String, index: 'text' },
  categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  location: {
    lat:      { type: Number },
    lng:      { type: Number },
    address:  { type: String },
    district: { type: String, index: true }
  },
  period: {
    name:      { type: String },
    isIdentified: { type: Boolean, default: true },
    startYear: { type: Number },
    endYear:   { type: Number }
  },
  discovery: {
    isDateKnown: { type: Boolean, default: false },
    datePrecision: { type: String, enum: ['exact', 'month', 'year', 'unknown'], default: 'unknown' },
    discoveredAt: { type: Date },
    discoveredYear: { type: Number },
    discoveredMonth: { type: Number },
    isDiscovererKnown: { type: Boolean, default: false },
    discovererName: { type: String }
  },
  cultures:     [{ type: String }],
  culture:      { type: String },
  imageUrl:     { type: String }, // S3 URL for monument images
  s3ImageKey:   { type: String }, // S3 object key for monument image
  model3DUrl:   { type: String }, // S3 URL for 3D models
  s3ModelKey:   { type: String }, // S3 object key for 3D model
  model3DTilesUrl: { type: String }, // S3 URL for 3D Tiles tileset.json (opcional)
  s3ModelTilesKey: { type: String }, // S3 object key for 3D Tiles tileset.json
  s3ImageFileName: { type: String }, // S3 filename for image deletion
  s3ModelFileName: { type: String }, // S3 filename for model deletion
  institutionId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Institution', index: true },
  status:       { type: String, enum: ['Disponible', 'Oculto', 'Borrado'], default: 'Disponible' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Add text index for search functionality (Requirements 4.1, 4.2, 5.1, 5.2)
MonumentSchema.index({ name: 'text', description: 'text' });

// Add compound indexes for query optimization (Requirements 4.5, 5.4)
MonumentSchema.index({ status: 1, categoryId: 1 });
MonumentSchema.index({ status: 1, 'location.district': 1 });
MonumentSchema.index({ status: 1, institutionId: 1 });
MonumentSchema.index({ status: 1, name: 1 }); // For default sorting

export default mongoose.model('Monument', MonumentSchema);
