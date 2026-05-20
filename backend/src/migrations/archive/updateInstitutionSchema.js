/**
 * Migración: Actualizar esquema de instituciones
 * 
 * Actualiza las instituciones existentes para:
 * - Agregar campo status (default: 'Oculto')
 * - Mover district y address a location.district y location.address
 * - Asegurar que todos los días del schedule tengan valores por defecto
 */

import mongoose from 'mongoose';
import Institution from '../models/Institution.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateInstitutionSchema() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n📋 Iniciando migración de instituciones...');

    // Obtener todas las instituciones
    const institutions = await Institution.find({});
    console.log(`📊 Encontradas ${institutions.length} instituciones para migrar`);

    let updated = 0;
    let skipped = 0;

    for (const institution of institutions) {
      let needsUpdate = false;
      const updates = {};

      // 1. Agregar status si no existe
      if (!institution.status) {
        updates.status = 'Oculto';
        needsUpdate = true;
      }

      // 2. Mover district y address a location si existen en el nivel superior
      if (institution.district && !institution.location?.district) {
        if (!updates.location) updates.location = institution.location || {};
        updates.location.district = institution.district;
        needsUpdate = true;
      }

      if (institution.address && !institution.location?.address) {
        if (!updates.location) updates.location = institution.location || {};
        updates.location.address = institution.address;
        needsUpdate = true;
      }

      // 3. Asegurar que schedule tenga todos los días con valores por defecto
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const scheduleUpdates = {};
      
      for (const day of days) {
        if (!institution.schedule || !institution.schedule[day]) {
          scheduleUpdates[`schedule.${day}`] = { closed: true };
          needsUpdate = true;
        }
      }

      if (Object.keys(scheduleUpdates).length > 0) {
        Object.assign(updates, scheduleUpdates);
      }

      // Aplicar actualizaciones si es necesario
      if (needsUpdate) {
        await Institution.findByIdAndUpdate(
          institution._id,
          { $set: updates },
          { new: true }
        );
        updated++;
        console.log(`✅ Actualizada: ${institution.name}`);
      } else {
        skipped++;
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Actualizadas: ${updated}`);
    console.log(`   ⏭️  Sin cambios: ${skipped}`);
    console.log(`   📝 Total: ${institutions.length}`);

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar migración
updateInstitutionSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export default updateInstitutionSchema;
