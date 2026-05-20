/**
 * Controlador de Instituciones
 * Refactorizado usando crudControllerFactory con soporte para hidratación de medios S3
 */
import { createCrudController } from '../utils/crudControllerFactory.js';
import * as institutionService from '../services/institutionService.js';
import * as s3Service from '../services/s3Service.js';
import { hydrateMedia } from '../utils/s3-helpers.js';

const MEDIA_URL_EXPIRATION_SECONDS = 60 * 60;

/**
 * Hidratar URLs de medios de una institución
 */
async function hydrateInstitutionMedia(institution) {
  return hydrateMedia(institution, [
    { urlField: 'imageUrl', keyField: 's3ImageKey' }
  ]);
}

/**
 * Hook para limpiar archivos S3 antes de eliminar una institución
 */
async function beforeDeleteInstitution(institutionId, service) {
  const currentInstitution = await service.getById(institutionId);
  
  if (currentInstitution && (currentInstitution.s3ImageKey || currentInstitution.imageUrl)) {
    try {
      await s3Service.deleteFileFromS3(
        currentInstitution.s3ImageKey || currentInstitution.imageUrl
      );
    } catch (error) {
      console.error('Error deleting institution image from S3:', error.message);
      // No lanzar error, continuar con la eliminación
    }
  }
}

// Crear controlador CRUD usando el factory
const crudController = createCrudController({
  service: {
    getAll: institutionService.getAllInstitutions,
    getById: institutionService.getInstitutionById,
    create: institutionService.createInstitution,
    update: institutionService.updateInstitution,
    delete: institutionService.deleteInstitution,
    getStats: institutionService.getInstitutionStats
  },
  entityName: 'Institución',
  entityNamePlural: 'Instituciones',
  hydrateMedia: hydrateInstitutionMedia,
  beforeDelete: beforeDeleteInstitution
});

// Exportar métodos con nombres específicos del dominio
export const {
  list: listInstitution,
  getById: getInstitution,
  create: createInstitutionController,
  update: updateInstitutionController,
  deleteItem: deleteInstitutionController,
  getStats: getInstitutionStatsController
} = crudController;
