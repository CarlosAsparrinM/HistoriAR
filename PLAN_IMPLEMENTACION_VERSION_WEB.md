# Plan de implementación — HistoriAR Web (sin AR)

- **Estado:** listo para ejecutar en una rama nueva.
- **Rama sugerida:** `feature/public-web` desde `main`.
- **Alcance:** sitio público web para explorar monumentos, instituciones, tours, fichas históricas y modelos 3D interactivos.
- **Fuera de alcance:** realidad aumentada, administración de contenidos, cargas de archivos, cambios de autenticación móvil y despliegue en un proveedor concreto.
- **Regla de compatibilidad:** la app `app_movil/` no se modifica durante esta implementación. La web tendrá código, dependencias, pruebas y build independientes.

## 1. Objetivo y resultado

Entregar una aplicación web responsive que permita a un visitante:

1. explorar el catálogo público de monumentos;
2. filtrar o buscar por texto, categoría, distrito e institución;
3. ver la ficha cultural e histórica de cada monumento;
4. abrir y manipular su modelo GLB/GLTF en un visor 3D (rotación, zoom y reinicio);
5. recorrer instituciones y tours publicados;
6. recibir una invitación clara a usar la aplicación móvil cuando quiera usar AR.

La web no intentará abrir cámara, usar geolocalización para AR, registrar una visita AR ni importar `ar_flutter_plugin_plus`.

## 2. Decisión de arquitectura

### 2.1 Aplicación separada

Crear `app_web/` como proyecto Flutter Web independiente con su propio:

- `pubspec.yaml` y `pubspec.lock`;
- `.env.example` (`API_BASE_URL`, `ENVIRONMENT` y origen público);
- estructura `lib/features`, `lib/services`, `lib/models` y `test/`;
- comando de compilación `flutter build web --release`;
- job propio dentro de CI.

Se conserva `app_movil/` sin cambios. No se comparte su árbol `lib/` directamente, ya que contiene dependencias y flujos específicos de móvil/AR. Cuando ambos clientes estabilicen sus contratos, se podrá evaluar un paquete Dart compartido que solo contenga DTOs y cliente HTTP, sin plugins de plataforma.

### 2.2 Modelo 3D

Usar `model_viewer_plus` en modo visor web para GLB/GLTF. La integración debe:

- habilitar controles de cámara, rotación, zoom, carga y reinicio;
- omitir `ar`, `ar-modes`, cámara y permisos;
- mostrar estados de carga, error, modelo no disponible y enlace para reintentar;
- usar únicamente URLs HTTPS entregadas por la API; nunca componer claves S3 en el navegador;
- volver a solicitar la ficha pública si una URL firmada expira durante una sesión larga.

Se debe probar el visor en Chrome, Edge, Firefox y Safari moderno. Si un modelo no carga, la ficha textual debe seguir siendo usable.

### 2.3 Backend como contrato público

La web consumirá solo endpoints públicos. No usará `/admin`, cookies administrativas, cabecera CSRF ni endpoints de carga:

| Necesidad web | Contrato actual o requerido |
|---|---|
| Catálogo/búsqueda de monumentos | `GET /api/monuments`, `GET /api/monuments/search`, `GET /api/monuments/:id` |
| Filtros | `GET /api/monuments/filter-options`, categorías y culturas públicas |
| Instituciones | `GET /api/institutions`, `GET /api/institutions/:id` |
| Tours | rutas públicas de tours por institución y por ID |
| Quiz de lectura | DTO público existente, sin respuestas ni explicaciones |
| Fichas históricas | **Nuevo DTO público explícito**: solo contenido publicado, sin `createdBy`, claves S3 ni datos administrativos |
| Modelos 3D | URL temporal hidratada en el DTO público del monumento |

Antes de construir la pantalla de ficha, crear y probar una ruta pública de datos históricos, por ejemplo `GET /api/monuments/:monumentId/historical-data/public`. Debe devolver solo título, descripción, imágenes hidratadas, actividades, fuentes y orden. Si todavía no existe una condición de publicación en `HistoricalData`, la primera tarea será añadir `status: Disponible|Oculto` con migración y rollback documentados; no se expondrá todo el historial administrativo por defecto.

## 3. Fases de implementación

### Fase 0 — Contrato y preparación

1. Crear la rama `feature/public-web` desde el `main` ya endurecido.
2. Documentar DTOs públicos en `backend/docs/PUBLIC_WEB_API.md`, incluyendo ejemplos, campos prohibidos y códigos de error.
3. Definir el dominio/origen definitivo de la web antes de producción y añadirlo a `ALLOWED_ORIGINS` del backend.
4. Añadir pruebas de regresión que aseguren que los DTOs públicos no devuelven respuestas de quizzes, datos de administración, correo del creador, claves S3 ni objetos ocultos.
5. Resolver la publicación de fichas históricas y crear la ruta pública mínima descrita antes de cualquier interfaz que la consuma.

**Criterio de salida:** las respuestas públicas son estables, filtradas y están probadas sin requerir una sesión administrativa.

### Fase 1 — Base de `app_web/`

1. Crear el proyecto Flutter Web aislado y fijar la misma versión Flutter usada en CI.
2. Configurar ambientes `development`, `staging` y `production` con `--dart-define`; no incluir secretos en el bundle.
3. Implementar cliente HTTP de solo lectura, timeouts, manejo de errores y modelos DTO independientes.
4. Definir tema, tipografía, breakpoints y navegación declarativa para escritorio, tableta y móvil web.
5. Crear páginas de carga, vacío, error 404 y error de red accesibles.

**Criterio de salida:** `flutter analyze`, pruebas unitarias y `flutter build web --release` pasan sin tocar `app_movil/`.

### Fase 2 — Exploración pública

1. Página inicial con propuesta de valor, monumentos destacados y llamada a descargar la app móvil para AR.
2. Catálogo paginado con búsqueda con debounce y filtros por categoría, distrito e institución.
3. Ficha de monumento con galería, ubicación descriptiva, periodo, culturas e institución.
4. Sección de instituciones y tours con enlaces profundos hacia fichas públicas.
5. URLs navegables y recargables (`/monumentos/:id`, `/instituciones/:id`, `/tours/:id`).

**Criterio de salida:** toda navegación funciona con URLs directas y con datos incompletos, sin exponer contenido oculto.

### Fase 3 — Ficha histórica y visor 3D

1. Integrar la ruta pública de fichas históricas y renderizar contenido, fuentes e imágenes de forma segura.
2. Añadir el visor 3D como componente independiente con loading/error/fallback.
3. Implementar controles de cámara, reinicio y pantalla completa opcional; no implementar AR.
4. Medir fallos de carga de modelo con eventos anónimos o logs del cliente, sujeto a la política de privacidad elegida.
5. Presentar CTA “Ver en AR desde la app móvil” sin afirmar que el navegador tiene AR.

**Criterio de salida:** un modelo disponible se visualiza y uno ausente o inválido no bloquea el resto de la ficha.

### Fase 4 — Calidad, rendimiento y accesibilidad

1. Pruebas unitarias para mapeo de DTOs, filtros, URLs firmadas expiradas y estados de error.
2. Pruebas widget para catálogo, ficha, historial y fallback del visor.
3. Pruebas de navegador en los navegadores objetivo y en pantallas pequeñas.
4. Lazy loading de rutas, imágenes y visor 3D; no descargar el modelo hasta abrir su sección.
5. Auditoría de accesibilidad: teclado, foco, contraste, texto alternativo y mensajes de error.
6. Metadatos básicos, `robots.txt`, favicon, título y descripción por ruta. La decisión de SEO con prerender/SSR queda para una fase posterior si el producto lo requiere.

### Fase 5 — CI y publicación controlada

1. Extender CI con un job de solo lectura para `app_web`: instalación bloqueada, análisis, pruebas y build release.
2. Mantener jobs separados para backend, panel, móvil y web; el fallo de la web no cambia artefactos móviles.
3. Publicar el contenido estático solo después de aprobar CI y configurar el origen final en CORS.
4. Verificar en staging URLs directas, CORS, expiración de URLs S3, carga de modelos y fallback.
5. Documentar build, variables, invalidación de caché y rollback según el proveedor elegido, sin introducirlo en este plan.

## 4. Matriz de no regresión móvil

| Riesgo | Protección obligatoria |
|---|---|
| Dependencia 3D/web afecta AR | `app_web` tiene `pubspec` separado; no se modifica el lockfile móvil |
| Cambio de API rompe móvil | DTOs y rutas públicas nuevas son aditivas; pruebas de contratos existentes siguen en backend |
| Cambio CORS bloquea la app | conservar todos los orígenes actuales y añadir el origen web explícitamente |
| Métrica AR contaminada | la web no crea visitas `experienceType: ar`; si se registra interacción 3D, usar un evento separado y explícito |
| Cambio de sesión | web pública no comparte sesión administrativa ni Bearer de Flutter |
| Regresión de build móvil | ejecutar `flutter analyze --no-pub` y `flutter test --no-pub` en `app_movil` en cada PR web |

## 5. Criterios de aceptación finales

- La web se compila independientemente y no introduce cambios requeridos en `app_movil/`.
- Un visitante anónimo puede explorar solo contenido publicado y ver modelos 3D sin AR.
- Ningún DTO público revela datos administrativos, respuestas correctas, claves S3 ni recursos ocultos.
- La expiración o fallo de una URL de modelo tiene recuperación y fallback visible.
- Backend, panel, móvil y web pasan sus respectivos checks de CI.
- No hay despliegues automáticos, cambios de infraestructura ni credenciales versionadas como parte de la implementación.

## 6. Decisiones que deben confirmarse antes de publicar

1. Dominio final de la web y orígenes CORS permitidos.
2. Si las fichas históricas requieren un estado `Disponible/Oculto` por entrada y cómo migrar datos existentes.
3. Navegadores objetivo mínimos y tamaño máximo aceptado de modelos.
4. Política de analítica, cookies y privacidad.
5. Proveedor de hosting estático, CDN y procedimiento de rollback.
