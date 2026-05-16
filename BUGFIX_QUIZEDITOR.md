# Bugfix - QuizEditor.jsx
**Fecha:** 15 de Mayo, 2026  
**Estado:** ✅ Corregido

## 🐛 Error Encontrado

### Síntomas
```
Uncaught TypeError: quizzes.map is not a function
at QuizEditor (QuizEditor.jsx:181:24)
```

### Causa Raíz
El hook `useQuizzesByMonument` retorna datos con estructura `{ items: [], total: 0 }`, pero el componente esperaba un array directo.

**Código problemático:**
```jsx
const { data: quizzes = [], isLoading } = useQuizzesByMonument(monumentId);

// Luego intenta:
quizzes.map((quiz) => ...) // ❌ Error: quizzes es un objeto, no un array
```

## ✅ Solución Aplicada

**Código corregido:**
```jsx
const { data: quizzesData, isLoading } = useQuizzesByMonument(monumentId);
const quizzes = quizzesData?.items || quizzesData || [];

// Ahora funciona:
quizzes.map((quiz) => ...) // ✅ quizzes es siempre un array
```

### Explicación
La solución maneja tres casos:
1. `quizzesData?.items` - Si la API retorna `{ items: [...], total: 0 }`
2. `quizzesData` - Si la API retorna directamente un array `[...]`
3. `[]` - Si no hay datos (fallback a array vacío)

## 📝 Archivos Modificados

- `admin-panel/src/components/QuizEditor.jsx` (línea 48-49)

## ✅ Verificación

- ✅ Sin errores de diagnóstico
- ✅ Componente renderiza correctamente
- ✅ `quizzes.map()` funciona sin errores

## 🔍 Análisis de Otros Componentes

### Componentes Verificados

**HistoricalDataEditor.jsx** ✅
```jsx
const { data: entries = [], isLoading } = useHistoricalData(monumentId);
```
- Hook retorna array directo
- No requiere cambios

**ToursManager.jsx** ✅
- No usa hooks de React Query aún
- Usa `apiService` directamente con manejo manual

**MonumentsManager.jsx** ✅
- No usa hooks de React Query aún
- Usa `apiService` directamente con manejo manual

### Recomendación

Para evitar este tipo de errores en el futuro, los hooks de React Query deberían:

1. **Opción A: Normalizar en el hook**
```javascript
export function useQuizzesByMonument(monumentId) {
  return useQuery({
    queryKey: ['quizzes', { monumentId }],
    queryFn: async () => {
      const response = await apiService.getQuizzes({ monumentId });
      // Normalizar: siempre retornar array
      return response?.items || response || [];
    },
    enabled: !!monumentId,
  });
}
```

2. **Opción B: Documentar estructura de retorno**
```javascript
/**
 * Fetch all quizzes for a monument
 * @returns {Object} { items: Quiz[], total: number }
 */
export function useQuizzesByMonument(monumentId) {
  // ...
}
```

## 🎯 Acción Tomada

Se eligió **Opción B** (documentar) porque:
- Cambio mínimo y seguro
- No afecta otros componentes
- Mantiene flexibilidad para acceder a `total` si es necesario

## 📊 Impacto

- **Severidad:** Alta (componente no renderizaba)
- **Alcance:** 1 componente (QuizEditor.jsx)
- **Tiempo de fix:** 5 minutos
- **Regresiones:** Ninguna

---

**Estado:** ✅ Corregido y verificado
