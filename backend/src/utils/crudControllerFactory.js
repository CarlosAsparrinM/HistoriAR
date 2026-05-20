/**
 * Factory para generar controladores CRUD estándar
 * 
 * Este factory elimina la duplicación de código entre controladores
 * que siguen el mismo patrón CRUD básico.
 * 
 * @example
 * import { createCrudController } from '../utils/crudControllerFactory.js';
 * import * as categoryService from '../services/categoryService.js';
 * 
 * const crudController = createCrudController({
 *   service: categoryService,
 *   entityName: 'Categoría',
 *   entityNamePlural: 'Categorías'
 * });
 * 
 * export const {
 *   list: listCategories,
 *   getById: getCategory,
 *   create: createCategoryController,
 *   update: updateCategoryController,
 *   deleteItem: deleteCategoryController,
 *   getStats: getCategoryStatsController
 * } = crudController;
 */

import { buildPagination } from './pagination.js';

/**
 * Crea un conjunto de controladores CRUD estándar
 * 
 * @param {Object} config - Configuración del controlador
 * @param {Object} config.service - Servicio con métodos CRUD (getAll, getById, create, update, delete, getStats)
 * @param {string} config.entityName - Nombre de la entidad en singular (ej: "Categoría")
 * @param {string} [config.entityNamePlural] - Nombre de la entidad en plural (ej: "Categorías")
 * @param {Function} [config.hydrateMedia] - Función opcional para hidratar URLs de medios (S3)
 * @param {Function} [config.beforeDelete] - Hook opcional antes de eliminar (ej: limpiar archivos S3)
 * @param {Object} [config.listOptions] - Opciones adicionales para el método list
 * @returns {Object} Objeto con métodos de controlador: list, getById, create, update, deleteItem, getStats
 */
export function createCrudController(config) {
  const {
    service,
    entityName,
    entityNamePlural = `${entityName}s`,
    hydrateMedia = null,
    beforeDelete = null,
    listOptions = {}
  } = config;

  // Validar que el servicio tiene los métodos requeridos
  const requiredMethods = ['getAll', 'getById', 'create', 'update', 'delete'];
  const missingMethods = requiredMethods.filter(method => 
    !service[method] && !service[`get${method.charAt(0).toUpperCase() + method.slice(1)}`]
  );
  
  if (missingMethods.length > 0) {
    throw new Error(
      `Service is missing required methods: ${missingMethods.join(', ')}. ` +
      `Expected methods: ${requiredMethods.join(', ')}`
    );
  }

  /**
   * Listar entidades con paginación y filtros
   */
  async function list(req, res) {
    try {
      const { skip, limit, page } = buildPagination(req.query);
      
      // Construir opciones de consulta
      const queryOptions = {
        skip,
        limit,
        search: req.query.search || '',
        ...listOptions.defaultFilters
      };

      // Agregar filtros comunes si están presentes
      if (req.query.activeOnly !== undefined) {
        queryOptions.activeOnly = req.query.activeOnly === 'true';
      }
      if (req.query.availableOnly !== undefined) {
        queryOptions.availableOnly = req.query.availableOnly === 'true';
      }
      if (req.query.type) {
        queryOptions.type = req.query.type;
      }
      if (req.query.status) {
        queryOptions.status = req.query.status;
      }

      // Agregar filtros personalizados
      if (listOptions.customFilters) {
        Object.keys(listOptions.customFilters).forEach(key => {
          if (req.query[key] !== undefined) {
            queryOptions[key] = req.query[key];
          }
        });
      }

      const { items, total } = await service.getAll(queryOptions);

      // Hidratar medios si es necesario
      const hydratedItems = hydrateMedia 
        ? await Promise.all(items.map(hydrateMedia))
        : items;

      res.json({ page, total, items: hydratedItems });
    } catch (err) {
      console.error(`Error listing ${entityNamePlural}:`, err);
      res.status(500).json({ message: err.message });
    }
  }

  /**
   * Obtener estadísticas de la entidad
   */
  async function getStats(req, res) {
    try {
      if (!service.getStats) {
        return res.status(501).json({ 
          message: `Stats not implemented for ${entityName}` 
        });
      }

      const stats = await service.getStats();
      res.json(stats);
    } catch (err) {
      console.error(`Error getting ${entityName} stats:`, err);
      res.status(500).json({ message: err.message });
    }
  }

  /**
   * Obtener una entidad por ID
   */
  async function getById(req, res) {
    try {
      const doc = await service.getById(req.params.id);
      
      if (!doc) {
        return res.status(404).json({ 
          message: `${entityName} no encontrad${entityName.endsWith('a') ? 'a' : 'o'}` 
        });
      }

      // Hidratar medios si es necesario
      const hydratedDoc = hydrateMedia 
        ? await hydrateMedia(doc)
        : doc;

      res.json(hydratedDoc);
    } catch (err) {
      console.error(`Error getting ${entityName}:`, err);
      res.status(500).json({ message: err.message });
    }
  }

  /**
   * Crear una nueva entidad
   */
  async function create(req, res) {
    try {
      const doc = await service.create(req.body);
      res.status(201).json({ id: doc._id });
    } catch (err) {
      console.error(`Error creating ${entityName}:`, err);
      res.status(400).json({ message: err.message });
    }
  }

  /**
   * Actualizar una entidad existente
   */
  async function update(req, res) {
    try {
      const doc = await service.update(req.params.id, req.body);
      
      if (!doc) {
        return res.status(404).json({ 
          message: `${entityName} no encontrad${entityName.endsWith('a') ? 'a' : 'o'}` 
        });
      }

      res.json(doc);
    } catch (err) {
      console.error(`Error updating ${entityName}:`, err);
      res.status(400).json({ message: err.message });
    }
  }

  /**
   * Eliminar una entidad
   */
  async function deleteItem(req, res) {
    try {
      // Ejecutar hook antes de eliminar si existe
      if (beforeDelete) {
        await beforeDelete(req.params.id, service);
      }

      const doc = await service.delete(req.params.id);
      
      if (!doc) {
        return res.status(404).json({ 
          message: `${entityName} no encontrad${entityName.endsWith('a') ? 'a' : 'o'}` 
        });
      }

      res.json({ 
        message: `${entityName} eliminad${entityName.endsWith('a') ? 'a' : 'o'}` 
      });
    } catch (err) {
      console.error(`Error deleting ${entityName}:`, err);
      res.status(400).json({ message: err.message });
    }
  }

  return {
    list,
    getStats,
    getById,
    create,
    update,
    deleteItem
  };
}
