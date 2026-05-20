import mongoose from 'mongoose';
import Institution from '../models/Institution.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkInstitutions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const institutions = await Institution.find({});
    console.log(`📊 Total de instituciones: ${institutions.length}\n`);

    institutions.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.name}`);
      console.log(`   Status: ${inst.status || 'SIN STATUS'}`);
      console.log(`   Imagen: ${inst.imageUrl ? '✅ SI' : '❌ NO'}`);
      console.log(`   Ubicación: lat=${inst.location?.lat || 'NO'}, lng=${inst.location?.lng || 'NO'}`);
      console.log(`   Distrito: ${inst.location?.district || inst.district || 'NO'}`);
      console.log(`   Dirección: ${inst.location?.address || inst.address || 'NO'}`);
      
      // Verificar horarios
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const openDays = days.filter(day => 
        inst.schedule?.[day] && 
        !inst.schedule[day].closed && 
        inst.schedule[day].open && 
        inst.schedule[day].close
      );
      console.log(`   Horarios: ${openDays.length > 0 ? `✅ ${openDays.length} días configurados` : '❌ Sin horarios'}`);
      
      // Verificar si está completa
      const isComplete = inst.imageUrl && openDays.length > 0;
      console.log(`   Completa: ${isComplete ? '✅ SI' : '❌ NO'}`);
      console.log('');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInstitutions();
