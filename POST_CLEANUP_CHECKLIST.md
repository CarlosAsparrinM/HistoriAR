# Checklist Post-Limpieza - HistoriAR

Este documento contiene las verificaciones necesarias para confirmar que la limpieza de código no introdujo errores.

---

## ✅ Verificaciones del Backend

### 1. Servidor Inicia Correctamente
```bash
cd backend
npm run dev
```
**Esperado:** Servidor inicia en puerto 4000 sin errores.

### 2. Endpoints de Monumentos Funcionan
```bash
# Listar monumentos
curl http://localhost:4000/api/monuments

# Obtener un monumento específico (reemplazar ID)
curl http://localhost:4000/api/monuments/{monument_id}
```
**Esperado:** Respuestas JSON correctas sin errores.

### 3. Upload de Modelos 3D Funciona
- Subir un modelo GLB desde el admin panel
- Verificar que se crea la versión correctamente
- Confirmar que NO hay errores relacionados con `tiles3DService`

**Esperado:** Upload exitoso sin intentar procesar tiles 3D.

### 4. Scripts de Producción Funcionan
```bash
# Verificar configuración
npm run verify

# Verificar variables de entorno
npm run check:env

# Crear índices (si es necesario)
npm run indexes
```
**Esperado:** Todos los scripts ejecutan sin errores.

### 5. Migraciones
```bash
# Verificar que no hay migraciones pendientes
npm run migrate
```
**Esperado:** No hay migraciones nuevas por ejecutar.

---

## ✅ Verificaciones del Admin Panel

### 1. Aplicación Inicia Correctamente
```bash
cd admin-panel
npm run dev
```
**Esperado:** Aplicación inicia sin errores de compilación.

### 2. Login Funciona
- Abrir http://localhost:5173
- Iniciar sesión con credenciales válidas

**Esperado:** Login exitoso, redirección al dashboard.

### 3. Navegación del Sidebar
Verificar que todas las rutas funcionan:
- ✅ Dashboard
- ✅ Monumentos
- ✅ Instituciones
- ✅ Categorías
- ✅ Culturas
- ✅ Experiencias AR
- ✅ Recorridos
- ✅ Fichas Históricas
- ✅ Quizzes
- ✅ Usuarios App
- ❌ Mensajería (debe estar eliminada)

**Esperado:** Todas las rutas cargan correctamente. NO debe aparecer "Mensajería".

### 4. Operaciones CRUD en Monumentos
- Crear un monumento nuevo
- Editar el monumento
- Subir un modelo 3D
- Eliminar el monumento

**Esperado:** Todas las operaciones funcionan sin errores.

### 5. Manejo de Sesión Expirada
- Dejar la sesión abierta por tiempo prolongado
- Intentar realizar una operación

**Esperado:** Redirección automática al login con mensaje "Sesión expirada".

### 6. Upload de Imágenes
- Crear/editar una ficha histórica con imagen
- Verificar que la imagen se sube correctamente

**Esperado:** Upload exitoso, imagen visible en S3.

---

## ✅ Verificaciones de Archivos

### 1. Estructura de Directorios
```bash
# Verificar que .tools existe y contiene los scripts
ls backend/.tools

# Verificar que migrations/archive existe
ls backend/src/migrations/archive

# Verificar que scripts solo tiene scripts de producción
ls backend/scripts
```

**Esperado:**
- `.tools/` contiene 10 scripts + README.md
- `migrations/archive/` contiene 5 migraciones + README.md
- `scripts/` contiene solo 6 scripts de producción

### 2. .gitignore Actualizado
```bash
# Verificar que .tools está en .gitignore
grep ".tools" backend/.gitignore
```

**Esperado:** Línea `.tools/` presente en el archivo.

### 3. Archivos Eliminados
Verificar que estos archivos NO existen:
```bash
# Debe retornar "No such file"
ls backend/src/services/tiles3DService.js
```

**Esperado:** Archivo no encontrado.

---

## ✅ Verificaciones de Código

### 1. No Hay Imports Rotos
```bash
# En backend
cd backend
npm run test  # Si hay tests configurados

# En admin-panel
cd admin-panel
npm run build  # Debe compilar sin errores
```

**Esperado:** Sin errores de imports no encontrados.

### 2. Linter Pasa
```bash
# Si tienen ESLint configurado
cd admin-panel
npm run lint
```

**Esperado:** Sin errores críticos.

### 3. Búsqueda de Referencias Huérfanas
```bash
# Buscar referencias a tiles3DService
grep -r "tiles3DService" backend/src/

# Buscar referencias a /messaging
grep -r "/messaging" admin-panel/src/

# Buscar imports del ícono Mail no usado
grep -r "Mail," admin-panel/src/components/AppSidebar.jsx
```

**Esperado:** Sin resultados (o solo en comentarios/logs).

---

## ✅ Verificaciones de Base de Datos

### 1. Datos de Monumentos Intactos
```javascript
// En MongoDB shell o Compass
db.monuments.countDocuments()
db.modelversions.countDocuments()
```

**Esperado:** Conteos correctos, sin pérdida de datos.

### 2. Migraciones Aplicadas
```javascript
// Verificar que las migraciones archivadas ya se ejecutaron
db.institutions.findOne()  // Debe tener campos latitude/longitude
db.quizzes.findOne()       // Debe tener estructura nueva
```

**Esperado:** Esquemas actualizados correctamente.

---

## ✅ Verificaciones de S3

### 1. Uploads Funcionan
- Subir una imagen desde el admin panel
- Verificar que aparece en el bucket S3

**Esperado:** Archivo visible en S3 con permisos correctos.

### 2. Presigned URLs Funcionan
- Abrir una imagen desde el admin panel
- Verificar que la URL presigned carga la imagen

**Esperado:** Imagen carga correctamente.

---

## 🔍 Verificaciones de Regresión

### Casos de Uso Críticos

#### 1. Flujo Completo de Monumento
1. Crear monumento nuevo
2. Agregar ficha histórica con imagen
3. Subir modelo 3D
4. Crear quiz asociado
5. Agregar a un recorrido
6. Ver desde la app móvil (si es posible)

**Esperado:** Flujo completo funciona sin errores.

#### 2. Flujo de Autenticación
1. Login con credenciales válidas
2. Realizar operaciones
3. Esperar expiración de token
4. Intentar operación
5. Re-login

**Esperado:** Manejo correcto de sesión expirada.

#### 3. Flujo de Búsqueda y Filtros
1. Buscar monumentos por nombre
2. Filtrar por categoría
3. Filtrar por cultura
4. Paginar resultados

**Esperado:** Búsqueda y filtros funcionan correctamente.

---

## 📝 Checklist de Verificación Rápida

Marcar cada ítem después de verificar:

### Backend
- [ ] Servidor inicia sin errores
- [ ] Endpoints de monumentos responden
- [ ] Upload de modelos 3D funciona
- [ ] No hay referencias a tiles3DService
- [ ] Scripts de producción funcionan
- [ ] .tools/ contiene 10 scripts
- [ ] migrations/archive/ contiene 5 migraciones

### Admin Panel
- [ ] Aplicación compila sin errores
- [ ] Login funciona
- [ ] Sidebar NO muestra "Mensajería"
- [ ] Todas las rutas cargan correctamente
- [ ] CRUD de monumentos funciona
- [ ] Upload de imágenes funciona
- [ ] Manejo de sesión expirada funciona

### Código
- [ ] No hay imports rotos
- [ ] Build de producción funciona
- [ ] No hay referencias huérfanas
- [ ] .gitignore incluye .tools/

### Datos
- [ ] Datos de monumentos intactos
- [ ] Migraciones aplicadas correctamente
- [ ] S3 uploads funcionan
- [ ] Presigned URLs funcionan

---

## 🚨 Qué Hacer Si Algo Falla

### Error: "Cannot find module 'tiles3DService'"
**Causa:** Referencia no eliminada.
**Solución:** Buscar y eliminar el import/require.

### Error: "Route /messaging not found"
**Causa:** Caché del navegador o hot reload no actualizó.
**Solución:** Limpiar caché, reiniciar dev server.

### Error: Scripts en .tools no funcionan
**Causa:** Rutas relativas rotas.
**Solución:** Ejecutar desde el directorio correcto o actualizar rutas.

### Error: Migraciones se ejecutan nuevamente
**Causa:** Sistema de migraciones no registra las archivadas.
**Solución:** Verificar que el sistema de migraciones solo lee archivos en el directorio principal.

---

## ✅ Confirmación Final

Una vez completadas todas las verificaciones:

```bash
# Crear un commit con los cambios
git add .
git commit -m "chore: limpieza de código - eliminar código muerto y reorganizar estructura"

# Opcional: crear tag
git tag -a cleanup-v1.0 -m "Limpieza de código completada"
```

**Estado:** ✅ Limpieza completada y verificada

---

**Última actualización:** 15 de Mayo, 2026
