import mongoose from 'mongoose';
import Institution from '../models/Institution.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migración: Agregar campo location a instituciones existentes
 * 
 * Este script agrega el campo location con valores por defecto a todas las instituciones
 * que no lo tengan. Los administradores deben actualizar manualmente las coordenadas reales.
 */
async function addLocationToInstitutions() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // Buscar instituciones sin campo location
    const institutions = await Institution.find({
      $or: [
        { location: { $exists: false } },
        { 'location.lat': { $exists: false } }
      ]
    });

    console.log(`\nEncontradas ${institutions.length} instituciones para migrar\n`);

    let updated = 0;
    for (const institution of institutions) {
      // Agregar location con valores por defecto
      institution.location = {
        lat: 0,
        lng: 0,
        radius: 100
      };
      
      await institution.save();
      updated++;
      console.log(`✓ Actualizada: ${institution.name}`);
    }

    console.log(`\n✓ Migración completada: ${updated} instituciones actualizadas`);
    console.log('\n⚠️  IMPORTANTE: Los administradores deben actualizar las coordenadas reales de cada institución');
    console.log('   Las coordenadas actuales están en (0, 0) como placeholder\n');

  } catch (error) {
    console.error('✗ Error en migración:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Conexión cerrada');
  }
}

// Ejecutar migración
addLocationToInstitutions();
