import mongoose from 'mongoose';

const DaySchema = new mongoose.Schema({
  open:   { type: String },
  close:  { type: String },
  closed: { type: Boolean, default: false }
}, { _id: false });

const InstitutionSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, enum: ['Museo', 'Universidad', 'Municipalidad', 'Otro'], default: 'Museo' },
  description: { type: String },
  contactEmail:{ type: String },
  phone:       { type: String },
  website:     { type: String },
  imageUrl:    { type: String },
  s3ImageKey:  { type: String },
  status:      { type: String, enum: ['Disponible', 'Oculto', 'Borrado'], default: 'Oculto' },
  location: {
    lat: { 
      type: Number,
      min: -90,
      max: 90
    },
    lng: { 
      type: Number,
      min: -180,
      max: 180
    },
    address:  { type: String },
    district: { type: String },
    radius: { 
      type: Number, 
      default: 100 
    } // Radio en metros
  },
  schedule: {
    monday:    { type: DaySchema, default: { closed: true } },
    tuesday:   { type: DaySchema, default: { closed: true } },
    wednesday: { type: DaySchema, default: { closed: true } },
    thursday:  { type: DaySchema, default: { closed: true } },
    friday:    { type: DaySchema, default: { closed: true } },
    saturday:  { type: DaySchema, default: { closed: true } },
    sunday:    { type: DaySchema, default: { closed: true } }
  }
}, { timestamps: true });

// Índice geoespacial para queries de proximidad
InstitutionSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Método para verificar si la institución está completa
InstitutionSchema.methods.isComplete = function() {
  // Verificar que tenga imagen
  if (!this.imageUrl) return false;
  
  // Verificar que tenga al menos un día con horario configurado (no cerrado)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hasSchedule = days.some(day => 
    this.schedule[day] && 
    !this.schedule[day].closed && 
    this.schedule[day].open && 
    this.schedule[day].close
  );
  
  return hasSchedule;
};

export default mongoose.model('Institution', InstitutionSchema);
