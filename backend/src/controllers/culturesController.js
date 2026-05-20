/**
 * Controlador de Culturas
 * Refactorizado usando crudControllerFactory para eliminar código duplicado
 */
import { createCrudController } from '../utils/crudControllerFactory.js';
import * as cultureService from '../services/cultureService.js';

// Crear controlador CRUD usando el factory
const crudController = createCrudController({
  service: {
    getAll: cultureService.getAllCultures,
    getById: cultureService.getCultureById,
    create: cultureService.createCulture,
    update: cultureService.updateCulture,
    delete: cultureService.deleteCulture,
    getStats: cultureService.getCultureStats
  },
  entityName: 'Cultura',
  entityNamePlural: 'Culturas'
});

// Exportar métodos con nombres específicos del dominio
export const {
  list: listCultures,
  getById: getCulture,
  create: createCultureController,
  update: updateCultureController,
  deleteItem: deleteCultureController,
  getStats: getCultureStatsController
} = crudController;