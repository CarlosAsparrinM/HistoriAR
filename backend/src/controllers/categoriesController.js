/**
 * Controlador de Categorías
 * Refactorizado usando crudControllerFactory para eliminar código duplicado
 */
import { createCrudController } from '../utils/crudControllerFactory.js';
import * as categoryService from '../services/categoryService.js';

// Crear controlador CRUD usando el factory
const crudController = createCrudController({
  service: {
    getAll: categoryService.getAllCategories,
    getById: categoryService.getCategoryById,
    create: categoryService.createCategory,
    update: categoryService.updateCategory,
    delete: categoryService.deleteCategory,
    getStats: categoryService.getCategoryStats
  },
  entityName: 'Categoría',
  entityNamePlural: 'Categorías'
});

// Exportar métodos con nombres específicos del dominio
export const {
  list: listCategories,
  getById: getCategory,
  create: createCategoryController,
  update: updateCategoryController,
  deleteItem: deleteCategoryController,
  getStats: getCategoryStatsController
} = crudController;