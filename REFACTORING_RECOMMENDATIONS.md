# Recomendaciones de Refactorización - HistoriAR

Este documento detalla las oportunidades de mejora identificadas durante la limpieza de código.

---

## 🟡 Media Prioridad

### 1. Factory Pattern para Controladores CRUD

**Problema Actual:**
Los controladores `categoriesController.js`, `culturesController.js`, `institutionsController.js`, `toursController.js` y `quizzesController.js` tienen código casi idéntico:

```javascript
// Patrón repetido en cada controlador:
export const list = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, ...filters } = req.query;
    // ... lógica de paginación y filtros
    const items = await Service.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });
    // ... respuesta
  } catch (error) {
    // ... manejo de errores
  }
};

export const getById = async (req, res) => { /* ... */ };
export const create = async (req, res) => { /* ... */ };
export const update = async (req, res) => { /* ... */ };
export const deleteItem = async (req, res) => { /* ... */ };
export const getStats = async (req, res) => { /* ... */ };
```

**Solución Propuesta:**

Crear `backend/src/utils/crudControllerFactory.js`:

```javascript
/**
 * Factory para generar controladores CRUD estándar
 * @param {Model} Model - Modelo de Mongoose
 * @param {string} entityName - Nombre de la entidad (singular)
 * @param {Object} options - Opciones de configuración
 */
export function createCrudController(Model, entityName, options = {}) {
  const {
    searchFields = ['name'], // Campos para búsqueda de texto
    populateFields = [],      // Campos para populate
    defaultSort = { createdAt: -1 },
    customValidation = null,  // Función de validación personalizada
  } = options;

  return {
    // List con paginación y búsqueda
    list: async (req, res) => {
      try {
        const { page = 1, limit = 10, search, ...filters } = req.query;
        const skip = (page - 1) * limit;
        
        let query = { ...filters };
        
        // Búsqueda de texto en campos configurados
        if (search) {
          query.$or = searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
          }));
        }
        
        const [items, total] = await Promise.all([
          Model.find(query)
            .populate(populateFields)
            .skip(skip)
            .limit(parseInt(limit))
            .sort(defaultSort),
          Model.countDocuments(query)
        ]);
        
        res.json({
          items,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit)
        });
      } catch (error) {
        console.error(`Error listing ${entityName}s:`, error);
        res.status(500).json({ 
          message: `Error al obtener ${entityName}s`,
          error: error.message 
        });
      }
    },

    // Get by ID
    getById: async (req, res) => {
      try {
        const item = await Model.findById(req.params.id)
          .populate(populateFields);
        
        if (!item) {
          return res.status(404).json({ 
            message: `${entityName} no encontrado` 
          });
        }
        
        res.json(item);
      } catch (error) {
        console.error(`Error getting ${entityName}:`, error);
        res.status(500).json({ 
          message: `Error al obtener ${entityName}`,
          error: error.message 
        });
      }
    },

    // Create
    create: async (req, res) => {
      try {
        // Validación personalizada si existe
        if (customValidation) {
          const validationError = await customValidation(req.body);
          if (validationError) {
            return res.status(400).json({ message: validationError });
          }
        }
        
        const item = new Model(req.body);
        await item.save();
        
        res.status(201).json({
          message: `${entityName} creado exitosamente`,
          data: item
        });
      } catch (error) {
        console.error(`Error creating ${entityName}:`, error);
        res.status(500).json({ 
          message: `Error al crear ${entityName}`,
          error: error.message 
        });
      }
    },

    // Update
    update: async (req, res) => {
      try {
        const item = await Model.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );
        
        if (!item) {
          return res.status(404).json({ 
            message: `${entityName} no encontrado` 
          });
        }
        
        res.json({
          message: `${entityName} actualizado exitosamente`,
          data: item
        });
      } catch (error) {
        console.error(`Error updating ${entityName}:`, error);
        res.status(500).json({ 
          message: `Error al actualizar ${entityName}`,
          error: error.message 
        });
      }
    },

    // Delete
    deleteItem: async (req, res) => {
      try {
        const item = await Model.findByIdAndDelete(req.params.id);
        
        if (!item) {
          return res.status(404).json({ 
            message: `${entityName} no encontrado` 
          });
        }
        
        res.json({ 
          message: `${entityName} eliminado exitosamente` 
        });
      } catch (error) {
        console.error(`Error deleting ${entityName}:`, error);
        res.status(500).json({ 
          message: `Error al eliminar ${entityName}`,
          error: error.message 
        });
      }
    },

    // Stats
    getStats: async (req, res) => {
      try {
        const total = await Model.countDocuments();
        const active = await Model.countDocuments({ isActive: true });
        
        res.json({
          total,
          active,
          inactive: total - active
        });
      } catch (error) {
        console.error(`Error getting ${entityName} stats:`, error);
        res.status(500).json({ 
          message: `Error al obtener estadísticas`,
          error: error.message 
        });
      }
    }
  };
}
```

**Uso en Controladores:**

```javascript
// backend/src/controllers/categoriesController.js
import Category from '../models/Category.js';
import { createCrudController } from '../utils/crudControllerFactory.js';

const crudController = createCrudController(Category, 'Categoría', {
  searchFields: ['name', 'description'],
  defaultSort: { name: 1 }
});

// Exportar métodos CRUD estándar
export const {
  list: getCategories,
  getById: getCategory,
  create: createCategory,
  update: updateCategory,
  deleteItem: deleteCategory,
  getStats: getCategoryStats
} = crudController;

// Agregar métodos específicos si es necesario
export const getBySlug = async (req, res) => {
  // Lógica específica de categorías
};
```

**Beneficios:**
- ✅ Elimina ~200-300 líneas de código duplicado
- ✅ Centraliza la lógica de paginación y búsqueda
- ✅ Facilita el mantenimiento (un solo lugar para actualizar)
- ✅ Mantiene flexibilidad para lógica específica por entidad
- ✅ Mejora la consistencia entre controladores

**Estimación de Esfuerzo:** 2-3 horas

---

### 2. Migración Completa a React Query

**Estado Actual:**
- ✅ Hooks implementados: `useHistoricalData`, `useMonuments`, `useTours`, `useQuizzes`
- ❌ Managers sin migrar: `MonumentsManager`, `ToursManager`, `QuizzesManager`, `ARExperiencesManager`

**Problema:**
Los managers aún usan `useState` + `useEffect` manual en lugar de los hooks de React Query, lo que causa:
- Datos desactualizados después de crear/editar
- Necesidad de refresh manual
- Código más complejo y propenso a errores

**Solución:**
Seguir el patrón documentado en `REACT_QUERY_MIGRATION.md`:

**Antes:**
```jsx
const [tours, setTours] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadTours();
}, [currentPage, filters]);

const loadTours = async () => {
  try {
    setLoading(true);
    const data = await apiService.getTours();
    setTours(data);
  } finally {
    setLoading(false);
  }
};
```

**Después:**
```jsx
import { useTours, useCreateTour, useDeleteTour } from '../hooks/useTours';

const { data: toursData, isLoading } = useTours({ 
  page: currentPage, 
  ...filters 
});
const tours = toursData?.items || [];

const createMutation = useCreateTour();
const deleteMutation = useDeleteTour();
```

**Orden Recomendado:**
1. `ToursManager.jsx` (más simple)
2. `QuizzesManager.jsx` (similar a Tours)
3. `MonumentsManager.jsx` (más complejo, incluye uploads)
4. `ARExperiencesManager.jsx` (último)

**Beneficios:**
- ✅ Datos siempre actualizados sin refresh manual
- ✅ Menos código (elimina useState, useEffect, handlers manuales)
- ✅ Mejor UX (actualizaciones instantáneas)
- ✅ Caché automático entre componentes

**Estimación de Esfuerzo:** 4-6 horas (1-1.5h por manager)

---

## 🟢 Baja Prioridad (Mejoras Opcionales)

### 3. Centralizar Configuración de Validación

**Oportunidad:**
Los controladores tienen validaciones dispersas. Se podría centralizar en schemas de validación reutilizables.

**Ejemplo con Joi o Zod:**
```javascript
// backend/src/validation/categorySchema.js
import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  isActive: Joi.boolean().default(true)
});
```

**Beneficio:** Validación consistente y reutilizable.

---

### 4. Implementar Soft Deletes

**Oportunidad:**
Actualmente las eliminaciones son permanentes. Implementar soft deletes permitiría recuperación de datos.

**Implementación:**
```javascript
// Agregar a modelos
const schema = new Schema({
  // ... campos existentes
  deletedAt: { type: Date, default: null }
});

// Middleware para excluir eliminados
schema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});
```

**Beneficio:** Mayor seguridad de datos y posibilidad de auditoría.

---

### 5. Agregar Tests Unitarios

**Estado Actual:** Tests configurados pero no implementados.

**Prioridad:**
1. Controladores CRUD (después de refactorizar con factory)
2. Servicios críticos (S3, auth)
3. Hooks de React Query

**Herramientas:** Vitest (ya configurado)

---

## 📊 Resumen de Impacto

| Tarea | Prioridad | Esfuerzo | Líneas Reducidas | Beneficio Principal |
|-------|-----------|----------|------------------|---------------------|
| Factory CRUD | Media | 2-3h | ~250 | Mantenibilidad |
| React Query | Media | 4-6h | ~150 | UX + Código limpio |
| Validación | Baja | 2-3h | ~50 | Consistencia |
| Soft Deletes | Baja | 3-4h | N/A | Seguridad de datos |
| Tests | Baja | 8-12h | N/A | Confiabilidad |

---

## 🎯 Recomendación de Implementación

**Fase 1 (Corto plazo - 1 semana):**
1. Factory pattern para controladores CRUD
2. Migración de ToursManager y QuizzesManager a React Query

**Fase 2 (Mediano plazo - 2 semanas):**
3. Migración de MonumentsManager y ARExperiencesManager
4. Eliminar REACT_QUERY_MIGRATION.md

**Fase 3 (Largo plazo - 1 mes):**
5. Implementar tests unitarios para código crítico
6. Evaluar soft deletes y validación centralizada

---

**Nota:** Estas son recomendaciones basadas en el análisis de código. La priorización final debe considerar las necesidades del negocio y el roadmap del producto.
