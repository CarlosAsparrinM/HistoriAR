# Migración a React Query - Admin Panel HistoriAR

## Estado Actual ✅

### Completado
- React Query instalado (`@tanstack/react-query`)
- QueryClientProvider en `src/main.jsx`
- **Hooks implementados y listos:**
  - `src/hooks/useHistoricalData.js` - HistoricalData manager
  - `src/hooks/useMonuments.js` - Monuments manager
  - `src/hooks/useTours.js` - Tours manager
  - `src/hooks/useQuizzes.js` - Quizzes manager
  - `src/hooks/useARExperiences.js` - AR Experiences manager

- **Componentes refactorizados (piloto):**
  - `HistoricalDataEditor.jsx` ✅
  - `HistoricalDataForm.jsx` ✅

### Pendiente de Refactor
- `MonumentsManager.jsx` - usar hooks de `useMonuments.js`
- `ToursManager.jsx` - usar hooks de `useTours.js`
- `QuizzesManager.jsx` - usar hooks de `useQuizzes.js`
- `ARExperiencesManager.jsx` - usar hooks de `useARExperiences.js`

---

## Cómo Funciona (Conceptualmente)

### Flujo Actual (sin React Query - problema)
```
Usuario crea item → Formulario guarda en API → Vuelve atrás 
→ Componente padre mantiene estado ANTIGUO 
→ No ve los cambios
```

### Flujo Nuevo (con React Query - solución)
```
Usuario crea item → useMutation guardar en API
→ onSuccess: queryClient.invalidateQueries(['items'])
→ useQuery(['items']) re-renderiza automáticamente
→ Vuelve atrás → datos ya están frescos 
→ SIN refreshón brusco ✨
```

---

## Patrón de Refactor para Cada Manager

### Paso 1: Reemplazar `useState` por hooks React Query

**Antes:**
```jsx
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadItems();
}, []);

const loadItems = async () => {
  try {
    setLoading(true);
    const data = await apiService.getItems();
    setItems(data);
  } finally {
    setLoading(false);
  }
};
```

**Después:**
```jsx
import { useItems } from '../hooks/useMonuments'; // Ejemplo

const { data: items = [], isLoading } = useItems({ page, ...filters });
// Listo, eso es todo. No hay useState, no hay useEffect manual.
```

### Paso 2: Reemplazar mutaciones manuales (create/update/delete)

**Antes:**
```jsx
const handleCreate = async () => {
  try {
    await apiService.createItem(data);
    await loadItems(); // Re-fetch manual
    toast.success('Creado');
  } catch (err) {
    toast.error(err.message);
  }
};
```

**Después:**
```jsx
import { useCreateMonument } from '../hooks/useMonuments';

const createMutation = useCreateMonument();

const handleCreate = async () => {
  try {
    await createMutation.mutateAsync(data);
    // ✨ No hay que hacer loadItems() - React Query invalida automáticamente
    toast.success('Creado');
  } catch (err) {
    toast.error(err.message);
  }
};

// En el template:
<Button disabled={createMutation.isPending}>
  {createMutation.isPending ? 'Guardando...' : 'Crear'}
</Button>
```

### Paso 3: Actualizar UI con estados de mutation

**Cambios en el template:**
```jsx
// Usar createMutation.isPending en lugar de isSubmitting
disabled={createMutation.isPending}

// Mostrar loading spinner para delete/update
{deleteMutation.isPending ? <Loader /> : <Trash2 />}
```

---

## Ejemplo Completo: Refactorizar `ToursManager.jsx`

### 1. Importar hooks
```jsx
import {
  useTours,
  useCreateTour,
  useUpdateTour,
  useDeleteTour,
} from '../hooks/useTours';
```

### 2. Reemplazar state de lista
```jsx
// ❌ ANTES
const [tours, setTours] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  loadTours();
}, [currentPage, filters]);

// ✅ DESPUÉS
const { data: toursData, isLoading } = useTours({ 
  page: currentPage, 
  ...filters 
});
const tours = toursData?.items || [];
const totalTours = toursData?.total || 0;
```

### 3. Reemplazar mutaciones
```jsx
// ❌ ANTES
const handleDelete = async (id) => {
  try {
    await apiService.deleteTour(id);
    await loadTours(); // Re-fetch manual
    toast.success('Eliminado');
  } catch (err) {
    toast.error(err.message);
  }
};

// ✅ DESPUÉS
const deleteMutation = useDeleteTour();

const handleDelete = async (id) => {
  try {
    await deleteMutation.mutateAsync(id);
    toast.success('Eliminado');
  } catch (err) {
    toast.error(err.message);
  }
};
```

### 4. Actualizar template (loading states)
```jsx
// ❌ ANTES
{loading ? <Spinner /> : (
  <Table>
    {tours.map(tour => (
      <Button onClick={() => handleDelete(tour._id)} disabled={actionLoading}>
        {actionLoading === tour._id ? <Loader /> : <Trash2 />}
      </Button>
    ))}
  </Table>
)}

// ✅ DESPUÉS
{isLoading ? <Spinner /> : (
  <Table>
    {tours.map(tour => (
      <Button onClick={() => handleDelete(tour._id)} disabled={deleteMutation.isPending}>
        {deleteMutation.isPending ? <Loader /> : <Trash2 />}
      </Button>
    ))}
  </Table>
)}
```

---

## Hooks Disponibles por Módulo

### useMonuments.js
```javascript
useMonuments(params)          // List with pagination/filters
useMonumentById(id)           // Single monument
useCreateMonument()           // Create
useUpdateMonument()           // Update
useDeleteMonument()           // Delete
useModelVersions(monumentId)  // Model versions list
useActivateModelVersion()     // Activate model
useDeleteModelVersion()       // Delete model version
useUploadModelVersion()       // Upload 3D model
```

### useHistoricalData.js
```javascript
useHistoricalData(monumentId)    // List by monument
useHistoricalDataById(id)        // Single entry
useCreateHistoricalData()        // Create
useUpdateHistoricalData()        // Update
useDeleteHistoricalData()        // Delete
useReorderHistoricalData()       // Reorder entries
```

### useTours.js
```javascript
useTours(params)          // List with pagination/filters
useTourById(id)           // Single tour
useCreateTour()           // Create
useUpdateTour()           // Update
useDeleteTour()           // Delete
```

### useQuizzes.js
```javascript
useQuizzes(params)              // List with pagination/filters
useQuizzesByMonument(monumentId)// List by monument
useQuizById(id)                 // Single quiz
useCreateQuiz()                 // Create
useUpdateQuiz()                 // Update
useDeleteQuiz()                 // Delete
```

### useARExperiences.js
```javascript
useARExperiences(params)    // List AR experiences
useARExperienceById(id)     // Single experience
useARModelVersions(id)      // Model versions
useUploadARModel()          // Upload AR model
useActivateARModel()        // Activate AR model
```

---

## Guía de Migración: Orden Recomendado

1. ✅ **HistoricalData** - YA HECHO (piloto)
2. **Monuments** - Próximo (más complejo, incluye uploads)
3. **Tours** - Después de Monuments
4. **Quizzes** - Después de Tours
5. **ARExperiences** - Último

---

## Validación: Comportamiento Esperado Después de Migración

✅ **Al crear un item:**
1. Abre formulario → Crea item → Guarda
2. Cierra formulario automáticamente
3. Vuelve a la lista automáticamente
4. **La lista MUESTRA EL NUEVO ITEM sin refresh brusco** ✨

✅ **Al editar un item:**
1. Abre formulario → Modifica datos → Guarda
2. Cierra formulario automáticamente
3. La lista MUESTRA EL CAMBIO sin refresh brusco ✨

✅ **Al eliminar un item:**
1. Confirma eliminación
2. Item desaparece de la lista sin refresh brusco ✨

✅ **Navegación:**
- Cambiar página → otros datos aparecen sin lag
- Aplicar filtros → datos se actualizan
- Volver atrás desde formulario → datos actualizados automáticamente

---

## Troubleshooting

### La lista no se actualiza después de crear
**Causa:** La mutation no está invalidando la query correctamente
**Solución:** Verificar que `onSuccess` llama a `queryClient.invalidateQueries`

### Loading spinner no desaparece
**Causa:** `mutation.isPending` todavía es `true`
**Solución:** Verificar que la respuesta de la API es exitosa (200-201)

### Hay refresh brusco visible
**Causa:** Probablemente se está usando `window.location.reload()` en otro lado
**Solución:** Buscar `reload` en el código y eliminarlo; React Query maneja todo

### Datos desincronizados entre pestañas
**Causa:** `refetchOnWindowFocus` está deshabilitado
**Solución:** Activarlo en QueryClient options si quieres sincronización entre tabs

---

## Referencia: Configuración de QueryClient (src/main.jsx)

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 min: tiempo antes de "stale"
      gcTime: 1000 * 60 * 10,          // 10 min: tiempo antes de limpiar cache
      retry: 1,                        // Reintentar 1 vez en error
      refetchOnWindowFocus: false,     // No re-fetch al cambiar tab (opcional)
    },
    mutations: {
      retry: 1,
    },
  },
})
```

---

## Documentación oficial
- React Query: https://tanstack.com/query/latest
- Ejemplos: https://github.com/TanStack/query/tree/main/examples

---

**Próximo paso:** ¿Empezamos con `MonumentsManager.jsx`?
