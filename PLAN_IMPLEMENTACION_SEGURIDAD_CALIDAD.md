# Plan de implementación de seguridad y calidad — HistoriAR

## 1. Información del plan

- **Estado:** En ejecución.
- **Rama recomendada:** `hardening/security-quality`.
- **Base de la rama:** la rama estable que el equipo defina antes de comenzar.
- **Alcance:** backend, panel administrativo, aplicación móvil, pruebas, CI/CD y documentación técnica.
- **Fuera de alcance:** creación de la versión web para visitantes y cambios funcionales de Realidad Aumentada.
- **Estado de despliegue actual:** el backend está alojado en un contenedor Docker. No se asume un proveedor de infraestructura concreto y Vercel no forma parte del despliegue.
- **Regla de inicio para la versión web:** no comenzar hasta cerrar los hallazgos P0 y P1 de este documento y completar la revisión de seguridad final.

Este documento describe el trabajo que debe realizarse en una rama independiente. Su creación no autoriza todavía cambios en producción, migraciones de datos ni rotación de credenciales.

### Avance de implementación

Actualizado el 2026-08-01 en la rama `hardening/security-quality`:

- [x] Rama de hardening creada desde `main`.
- [x] SEC-01: el registro público ignora `role` y `status` y fuerza `user`/`Activo`.
- [x] SEC-02: todas las rutas de alertas e integridad requieren rol administrador.
- [x] SEC-03: lectura, actualización y eliminación de visitas comprueban propietario o administrador.
- [x] SEC-04: detener y calificar sesiones de tour comprueba propietario o administrador.
- [x] SEC-05: rate limiting aplicado en el backend para registro, login y Google Sign-In. La implementación actual es válida para el único contenedor; deberá usar un almacén compartido si se agregan réplicas.
- [x] SEC-09: el middleware obtiene rol, estado y perfil vigentes desde MongoDB.
- [x] SEC-10: las rutas de autenticación consumen y responden los resultados de `express-validator`.
- [x] El hash de contraseña se excluye por defecto del modelo de usuario.
- [x] `backend/package-lock.json` validado contra `package.json` y habilitado para seguimiento en Git.
- [x] Checkpoint P0 creado: `98b5a69 fix(security): close critical auth and ownership gaps`.
- [x] SEC-06: los DTO públicos de trivia ya no incluyen `isCorrect` ni explicaciones; el panel usa rutas administrativas protegidas.
- [x] SEC-07: retirado el evaluador antiguo; el envío valida integridad del intento, calcula en servidor y devuelve revisión solo al finalizar.
- [x] SEC-08: monumentos, instituciones, tours y quizzes públicos filtran contenido publicado tanto en listas como por ID.
- [x] SEC-12: las claves de uploads firmados se generan en servidor; se validan recurso, ID, extensión, MIME, tamaño, firma binaria, expiración y prefijos administrados.
- [x] SEC-12: la confirmación de modelos consulta `HeadObject` y compara tamaño/MIME antes de registrar o activar una versión.
- [x] DATA-02: la ruta guardada para imágenes de monumentos coincide con la clave realmente usada por el servicio S3.
- [x] DEP-01: eliminado el entrypoint serverless obsoleto; `src/server.js` es el único bootstrap y funciona igual en desarrollo y producción.
- [x] DEP-02: Docker usa Node 20.20.2, `npm ci`, puerto 4000, usuario no-root, healthcheck y cierre ordenado por señales.
- [x] Producción exige CORS explícito y acepta rol IAM del contenedor como alternativa preferida a credenciales AWS estáticas.
- [x] MOB-01: iOS declara el permiso de cámara y obtiene los identificadores OAuth desde `Secrets.xcconfig`, excluido de Git.
- [x] MOB-02: Android release/profile bloquean cleartext; iOS bloquea cargas arbitrarias y la app exige HTTPS en release.
- [x] Flutter dejó de calcular respuestas o puntajes con datos públicos y consume la revisión emitida por el backend.
- [x] Validadores Mongoose activados en las actualizaciones de monumentos, quizzes, instituciones y tours incluidas en este bloque (avance de SEC-11).
- [x] Suite backend: 24 archivos y 131 pruebas aprobadas con Node 20.20.2.
- [x] Panel administrativo: ESLint sin errores ni advertencias en los archivos modificados y build Vite de producción aprobado.
- [x] Suite Flutter: 31 pruebas aprobadas y `flutter analyze --no-pub` sin hallazgos.
- [ ] Build real de la imagen Docker: pendiente porque Docker Desktop/daemon no está activo en el entorno local; el contrato del Dockerfile tiene pruebas automatizadas.
- [ ] Revisión y merge de los checkpoints locales.
- [ ] Hallazgos P1 y P2 restantes.

## 2. Objetivos

1. Eliminar las vulnerabilidades de autenticación y autorización identificadas.
2. Evitar la exposición de contenido privado, respuestas de trivias y datos internos.
3. Hacer que validaciones, modelos y contratos API sean consistentes.
4. Unificar el arranque del backend en desarrollo local y en el contenedor Docker productivo.
5. Incorporar pruebas automatizadas de seguridad y regresión.
6. Reducir deuda técnica sin cambiar innecesariamente la experiencia actual.
7. Establecer una base segura y mantenible para desarrollar posteriormente Flutter Web.

## 3. Principios de ejecución

- Denegar acceso por defecto y concederlo explícitamente.
- No confiar en roles, IDs de usuario ni estados enviados por clientes.
- Aplicar listas permitidas de campos en todas las entradas.
- No devolver modelos Mongoose directamente en endpoints públicos cuando contengan campos internos.
- Mantener la compatibilidad móvil mediante contratos documentados y pruebas.
- Separar cada corrección crítica en cambios pequeños y revisables.
- No introducir secretos, credenciales de prueba ni contraseñas predeterminadas en Git.
- No ejecutar migraciones destructivas automáticamente durante el despliegue.

## 4. Inventario priorizado de hallazgos

| ID | Prioridad | Hallazgo | Resultado esperado |
|---|---|---|---|
| SEC-01 | P0 | El registro público acepta `role` y `status` | Todo registro público crea exclusivamente usuarios `user` y `Activo` |
| SEC-02 | P0 | Las rutas de alertas no requieren autenticación | Solo administradores pueden consultar o modificar alertas e integridad |
| SEC-03 | P0 | Visitas pueden consultarse, modificarse o borrarse por ID sin comprobar propietario | Usuario limitado a sus visitas; administrador con acceso explícito |
| SEC-04 | P0 | Sesiones de tour pueden detenerse o calificarse sin comprobar propietario | Operaciones restringidas al propietario o administrador |
| SEC-05 | P0 | No existe rate limiting real en autenticación | Límites aplicados en el backend, independientes del navegador |
| SEC-06 | P1 | Las rutas públicas de trivia exponen `isCorrect` | DTO público sin respuestas; DTO administrativo protegido |
| SEC-07 | P1 | El evaluador antiguo usa un contrato incompatible | Un único flujo de evaluación validado y probado |
| SEC-08 | P1 | Endpoints públicos pueden devolver contenido oculto o inactivo | Solo contenido publicado se expone sin autenticación |
| SEC-09 | P1 | El JWT conserva el rol incluido al emitirse aunque cambie en base de datos | Rol y estado vigentes comprobados en cada solicitud protegida |
| SEC-10 | P1 | Validadores de `express-validator` no consumen `validationResult` | Entradas inválidas rechazadas antes de llegar al servicio |
| SEC-11 | P1 | Actualizaciones Mongoose no ejecutan validadores | Todas las actualizaciones relevantes usan validación y listas permitidas |
| SEC-12 | P1 | URLs firmadas y confirmación de uploads aceptan claves poco restringidas | Claves, prefijos, tamaño, tipo y expiración controlados por servidor |
| SEC-13 | P1 | Tokens del panel se guardan en `localStorage` | Sesión administrativa protegida contra robo persistente por XSS |
| DEP-01 | P1 | Existen varios entrypoints y Google Auth no se inicializa de forma consistente | Inicialización común para ejecución local y Docker; entrypoints no utilizados identificados |
| DEP-02 | P1 | Docker es el runtime desplegado, pero el puerto, el modo producción y el arranque no están alineados explícitamente | Imagen reproducible y contenedor verificado con `NODE_ENV=production` |
| DATA-01 | P1 | La métrica `isAR` consulta un campo inexistente | Evento o campo AR definido de extremo a extremo |
| DATA-02 | P2 | Clave almacenada y ruta real de imagen de monumento no coinciden | Upload y eliminación utilizan la misma clave S3 |
| MOB-01 | P1 | Configuración iOS incompleta para cámara y Google Sign-In | Permisos y OAuth válidos por ambiente |
| MOB-02 | P1 | Android/iOS permiten tráfico inseguro en release | HTTP permitido solo en desarrollo cuando sea necesario |
| QA-01 | P1 | El panel no tiene pruebas automatizadas | Pruebas de autenticación, rutas y operaciones críticas |
| QA-02 | P1 | No existe CI | Lint, análisis, pruebas y builds ejecutados por pull request |
| MAINT-01 | P2 | Pantallas y controladores excesivamente grandes | Responsabilidades separadas en módulos comprobables |
| DOC-01 | P2 | Documentación, puertos y enlaces están desactualizados | Documentación consistente con el repositorio |

## 5. Estrategia de rama y entregas

### 5.1 Creación de la rama

Ejecutar cuando el equipo haya elegido y actualizado la rama base:

```bash
git switch <rama-base>
git pull --ff-only
git switch -c hardening/security-quality
```

Antes de comenzar se debe confirmar:

- árbol de trabajo limpio;
- respaldo o snapshot de la base usada en pruebas;
- entorno de pruebas separado de producción;
- variables necesarias disponibles fuera del repositorio;
- versiones instaladas de Node.js y Flutter compatibles con los manifiestos.

### 5.2 Pull requests recomendados

Aunque el trabajo se desarrolle en una rama principal de hardening, conviene dividirlo en PR o commits revisables:

1. `test: establish security regression baseline`
2. `fix(auth): prevent privilege escalation and enforce validation`
3. `fix(authz): protect alerts visits and tour sessions`
4. `fix(api): separate public and admin content contracts`
5. `fix(storage): constrain uploads and normalize s3 keys`
6. `fix(runtime): unify local and docker bootstrap`
7. `fix(clients): harden admin and mobile configuration`
8. `refactor: modularize critical oversized components`
9. `ci: add automated quality and security gates`
10. `docs: align security deployment and API documentation`

No mezclar refactorizaciones visuales grandes con correcciones P0. Esto facilita revisar y revertir cada cambio.

## 6. Fase 0 — Línea base reproducible

### Tareas

1. Instalar y registrar las versiones reales de Node.js, npm, Flutter y Dart usadas por el proyecto.
2. Versionar `backend/package-lock.json` y dejar de ignorarlo.
3. Sustituir `npm install` por `npm ci` en CI y Docker.
4. Crear una configuración de pruebas que no pueda apuntar accidentalmente a MongoDB o S3 de producción.
5. Ejecutar y guardar la línea base:
   - backend: tests y reporte de cobertura;
   - panel: lint y build;
   - Flutter: `flutter analyze`, `flutter test` y build Android de prueba.
6. Retirar del control de versiones reportes generados dentro de `app_movil/android/build`.
7. Documentar fallos preexistentes antes de modificar funcionalidad.

### Criterios de aceptación

- Una instalación limpia produce las mismas dependencias.
- Ninguna prueba utiliza servicios productivos.
- Los comandos de validación están documentados y devuelven códigos de salida confiables.
- El repositorio no contiene artefactos de build ni secretos.

## 7. Fase 1 — Autenticación y escalada de privilegios

### 7.1 Registro público seguro

Archivos principales:

- `backend/src/routes/auth.routes.js`
- `backend/src/controllers/authController.js`
- `backend/src/services/authService.js`
- `backend/src/models/User.js`

Tareas:

1. Construir el payload público mediante lista permitida: `name`, `email`, `password` y, si corresponde, `district`.
2. Forzar en servidor `role: 'user'` y `status: 'Activo'`.
3. Reservar la creación de administradores para un flujo administrativo autenticado o un comando seguro fuera de la API pública.
4. Normalizar email antes de buscar o guardar.
5. Crear middleware común que ejecute `validationResult` y produzca errores 400 estructurados.
6. Validar nombre, email, contraseña y longitudes máximas.
7. Responder login fallido con 401 y mensaje uniforme para no revelar si una cuenta existe.

### 7.2 Estado y rol vigentes

1. En `verifyToken`, cargar `status`, `role`, `name` y `email` desde MongoDB.
2. Utilizar el token para identificar al usuario, no como autoridad permanente del rol.
3. Invalidar de inmediato privilegios después de suspender, eliminar o degradar un administrador.
4. Definir estrategia futura de revocación mediante `tokenVersion` o sesiones, si el riesgo lo requiere.

### 7.3 Rate limiting

1. Agregar limitador en servidor para login, registro y Google Sign-In.
2. Usar límites diferenciados por IP y, cuando corresponda, por identidad normalizada.
3. Mantener `trust proxy` desactivado en local y configurarlo en Docker únicamente de acuerdo con el proxy o ingress real que exista delante del contenedor.
4. No usar el bloqueo en `localStorage` como control de seguridad; puede conservarse solo como ayuda visual.
5. Registrar eventos de abuso sin guardar contraseñas, tokens ni cuerpos sensibles.

### 7.4 Usuarios y contraseñas

1. Declarar el hash de contraseña con `select: false` en el modelo.
2. Solicitarlo explícitamente solo durante login o cambio de contraseña.
3. Eliminar `admin123` y otras contraseñas fijas de seeds y logs.
4. Obtener credenciales iniciales desde variables de entorno de un solo uso o crear un comando interactivo seguro.
5. Revisar la política actual que solo permite letras y números; permitir frases largas y caracteres especiales sin imponer reglas que reduzcan entropía.

### Pruebas obligatorias

- Registro con `role: admin` termina como `user`.
- Registro con `status: Suspendido` termina como `Activo`.
- Payload con operadores u objetos donde se espera texto es rechazado.
- Usuario suspendido no puede reutilizar un token vigente.
- Administrador degradado pierde acceso con el token anterior.
- Rate limiting responde 429 después del umbral definido.
- Login no revela si el email existe.

## 8. Fase 2 — Autorización por recurso

### 8.1 Alertas e integridad

1. Aplicar `verifyToken` y `requireRole('admin')` a todo `alerts.routes.js`.
2. Proteger también `integrity-check`, `integrity-summary` y limpieza de caché.
3. Eliminar la ruta duplicada `GET /:id`.
4. Limitar paginación y frecuencia del análisis de integridad.

### 8.2 Visitas

1. Para usuarios normales, consultar por `{ _id: visitId, userId: req.user.id }`.
2. Permitir a administradores acceso transversal de forma explícita.
3. Restringir actualización del usuario a campos permitidos, por ejemplo `duration` y `rating`.
4. Impedir que un usuario cambie `userId`, `monumentId`, `tourId` o identificadores de idempotencia después de crear la visita.
5. Mantener el `userId` del token como única fuente al crear visitas normales.

### 8.3 Sesiones de tour

1. Pasar `req.user.id` a `stopSession` y `rateSession`.
2. Buscar la sesión por ID y propietario en una sola operación.
3. Definir acceso administrativo explícito si es necesario.
4. Rechazar ratings fuera de 1–5 antes de acceder a MongoDB.
5. Evitar carreras al iniciar dos sesiones concurrentes mediante índice o actualización atómica.

### 8.4 Matriz de autorización

Crear `backend/docs/AUTHORIZATION_MATRIX.md` con, como mínimo:

| Recurso | Público | Usuario propietario | Administrador |
|---|---:|---:|---:|
| Monumento disponible | Leer | Leer | CRUD |
| Monumento oculto | No | No | CRUD |
| Trivia activa sin respuestas | Leer | Leer | CRUD completo |
| Intentos de trivia | No | Propios | Todos |
| Visita | No | Propia | Todas |
| Sesión de tour | No | Propia | Según política |
| Alertas e integridad | No | No | CRUD |
| Preferencias | No | Propias | Según política |

### Pruebas obligatorias

- Usuario A no puede leer, actualizar ni borrar una visita de B.
- Usuario A no puede detener ni calificar una sesión de B.
- Petición anónima a cualquier ruta de alertas devuelve 401.
- Usuario normal en alertas devuelve 403.
- Administrador conserva las operaciones autorizadas.

## 9. Fase 3 — Contratos públicos y protección de datos

### 9.1 Trivias

1. Crear DTO público que elimine `isCorrect`, resultados internos y campos administrativos.
2. Crear DTO administrativo completo, disponible solo tras autorización.
3. Filtrar públicamente `isActive: true`.
4. Validar que cada respuesta incluya índices enteros dentro de rango.
5. Rechazar preguntas duplicadas, omitidas o índices repetidos según las reglas del producto.
6. Unificar `/evaluate` y `/submit`, o retirar el endpoint antiguo después de verificar que ningún cliente lo utiliza.
7. Calcular siempre el resultado en el servidor.

### 9.2 Contenido publicado

1. Aplicar por defecto los siguientes filtros públicos:
   - monumentos: `status: 'Disponible'`;
   - instituciones: `status: 'Disponible'`;
   - tours: `isActive: true` y relaciones disponibles;
   - quizzes: `isActive: true`.
2. Crear endpoints o parámetros administrativos protegidos para consultar borradores y ocultos.
3. Aplicar el mismo filtro a endpoints por ID, estadísticas públicas, búsquedas y opciones de filtros.
4. Evitar devolver `createdBy`, claves internas S3, hashes, estados internos o datos de contacto que no sean públicos.

### 9.3 Serialización segura

1. Definir funciones o DTOs explícitos para respuestas públicas, de usuario y administrativas.
2. No realizar `populate('createdBy')` sin una selección segura.
3. Agregar una transformación global defensiva que nunca serialice `password`.
4. Revisar todos los mensajes 500 para no devolver detalles de MongoDB, AWS o rutas internas.

### Pruebas obligatorias

- JSON público de trivia no contiene `isCorrect` en ninguna profundidad.
- Monumentos, instituciones y tours ocultos no se obtienen por lista, búsqueda ni ID público.
- Respuestas fuera de rango no producen 500.
- Ninguna respuesta API contiene `password` ni hashes.
- El panel administrativo sigue recibiendo el contrato necesario tras autenticarse.

## 10. Fase 4 — Validación, persistencia y almacenamiento

### 10.1 Validación y mass assignment

1. Centralizar validadores por recurso.
2. Validar `ObjectId` antes de consultar MongoDB.
3. Aplicar límites de longitud a búsquedas, textos, URLs y listas.
4. Construir manualmente los objetos de creación y actualización; no pasar `req.body` completo a Mongoose.
5. Agregar `{ new: true, runValidators: true, context: 'query' }` a actualizaciones.
6. Convertir errores de cast, duplicidad y validación en respuestas 400/409 consistentes.

### 10.2 Uploads y S3

1. Permitir solo prefijos generados por el servidor para cada recurso.
2. No aceptar una clave S3 arbitraria proporcionada íntegramente por el cliente.
3. Limitar expiración de URLs firmadas a un máximo definido por configuración.
4. Validar extensión, MIME y firma real del archivo cuando sea viable; no confiar únicamente en `mimetype` u `originalname`.
5. Antes de confirmar un upload directo, ejecutar `HeadObject` y verificar clave, tamaño y tipo.
6. Normalizar nombres para impedir separadores, traversal o caracteres problemáticos.
7. Corregir la discrepancia entre la clave guardada y la ruta real de imágenes de monumentos.
8. Asegurar que la eliminación solo opere dentro de prefijos administrados por HistoriAR.
9. Definir compensación cuando S3 se actualiza y MongoDB falla, o viceversa.

### 10.3 Integridad de métricas

1. Decidir si una visita representa siempre una sesión AR o agregar un campo explícito como `experienceType: 'ar' | '3d' | 'information'`.
2. Actualizar modelo, app móvil, sincronización offline, índices y dashboard en la misma entrega.
3. Crear migración no destructiva para registros existentes, documentando el valor predeterminado.
4. Validar fechas personalizadas y rechazar rangos inválidos en estadísticas.

### Pruebas obligatorias

- Actualizaciones con enums o ratings inválidos devuelven 400.
- Confirmar una clave S3 ajena al recurso es rechazado.
- Expiraciones excesivas se limitan o rechazan.
- Un archivo no permitido no llega a S3.
- La métrica AR devuelve datos correctos con registros de prueba.

## 11. Fase 5 — Endurecimiento de clientes

### 11.1 Panel administrativo

1. Diseñar la sesión administrativa mediante cookie `HttpOnly`, `Secure` y `SameSite`, manteniendo Bearer token para la app móvil.
2. Si panel y API están en orígenes distintos, definir dominios, CORS con credenciales y protección CSRF antes de implementar cookies.
3. Evitar conservar tokens administrativos persistentes en `localStorage`.
4. Centralizar el cliente HTTP y el manejo de 401/403 sin recargar toda la página.
5. Configurar una Content Security Policy compatible con Vite, estilos y recursos realmente utilizados.
6. Revisar cualquier uso de `dangerouslySetInnerHTML` y garantizar que solo reciba valores controlados.
7. Mantener la comprobación visual del rol, pero considerar al backend como única autoridad.

### 11.2 Aplicación móvil

1. Mantener JWT en `flutter_secure_storage`; no retroceder a `SharedPreferences`.
2. Deshabilitar `usesCleartextTraffic` para builds release de Android.
3. Retirar `NSAllowsArbitraryLoads` del release iOS y conservar excepciones locales solo para debug.
4. Añadir `NSCameraUsageDescription` y revisar requisitos de ARKit.
5. Sustituir el esquema placeholder de Google Sign-In mediante configuración por ambiente.
6. Verificar que `.env` móvil solo contenga valores públicos; ningún secreto debe empaquetarse en Flutter.
7. Conservar el interceptor de sesión, agregando pruebas para 401, suspensión y errores 403 no relacionados con suspensión.

### Pruebas obligatorias

- El panel no puede leer el token desde JavaScript tras migrar a cookies.
- Las peticiones administrativas legítimas funcionan con CORS/CSRF configurados.
- Build release Android no permite tráfico HTTP arbitrario.
- iOS contiene permiso de cámara y esquema OAuth válido.
- La app móvil conserva login, Google Sign-In y cierre de sesión.

## 12. Fase 6 — Bootstrap local y despliegue Docker

### Tareas

1. Crear una función común de inicialización que:
   - cargue y valide entorno;
   - inicialice Google Auth;
   - configure S3 de forma perezosa o explícita;
   - garantice conexión MongoDB reutilizable;
   - funcione desde el mismo proceso Node en local y dentro del contenedor Docker.
2. Separar claramente `createApp`, `initializeServices` y `listen`.
3. Hacer que `server.js` abra el puerto cuando se ejecute como proceso Node con `NODE_ENV=production`; no depender de que esa variable esté ausente para que el contenedor funcione.
4. Alinear `PORT`, `EXPOSE`, `.env.example`, el comando de arranque y la configuración real del contenedor.
5. Cambiar el Dockerfile a una construcción reproducible con imagen Node fijada, `npm ci`, usuario no root y exclusión correcta mediante `.dockerignore`.
6. Verificar señales de terminación, cierre ordenado de conexiones y política de reinicio del contenedor.
7. Añadir un `HEALTHCHECK` compatible con `/health` o documentar el health check configurado externamente para el contenedor.
8. Mantener `/health` mínimo; proteger o reducir información detallada de S3 y dependencias.
9. Configurar CORS con los orígenes reales de los clientes y configurar `trust proxy` solo si el contenedor está detrás de un proxy conocido.
10. Probar Google Auth, MongoDB y S3 desde el contenedor, no solamente desde ejecución local.
11. Tratar `backend/api/index.js`, `admin-panel/vercel.json` y `.vercelignore` como artefactos no utilizados: documentarlos como inactivos o eliminarlos después de confirmar que no tienen consumidores.
12. Crear `backend/docs/DEPLOYMENT_DOCKER.md` con build, variables, puertos, health check, logs, actualización y rollback, sin inventar detalles del proveedor donde se aloja el contenedor.

### Matriz de verificación

| Entorno | Arranque | MongoDB | S3 | Google Auth | Health | Cierre correcto |
|---|---:|---:|---:|---:|---:|---:|
| Desarrollo local | Obligatorio | Entorno de desarrollo | Verificado o simulado | Verificado | 200 | Obligatorio |
| Docker local de validación | Obligatorio con `NODE_ENV=production` | Entorno aislado | Verificado o simulado | Verificado | 200 | Sí |
| Docker alojado | Obligatorio | Configuración real | Configuración real | Verificado | 200 | Sí |
| Test automatizado | En memoria/mocks | Nunca producción | Mock | Mock | Probado | Obligatorio |

## 13. Fase 7 — Buenas prácticas y mantenibilidad

### Backend

1. Introducir un manejador central de errores y eliminar bloques repetidos que exponen `err.message`.
2. Estandarizar respuestas: `code`, `message`, `details` solo cuando sean seguras.
3. Mantener controladores delgados y reglas de negocio en servicios.
4. Dividir `monumentsController.js` por CRUD, medios y versiones 3D.
5. Sustituir imports dinámicos usados como solución estructural por dependencias explícitas cuando no sean necesarios.
6. Agregar logging estructurado, ID de solicitud y niveles por ambiente.
7. No registrar tokens, credenciales, cuerpos de login ni URLs firmadas completas.

### Panel administrativo

1. Dividir managers grandes en página, tabla, filtros, formulario y hooks de mutación.
2. Evitar duplicar manejo de errores entre componentes y hooks.
3. Separar estado de servidor, estado de formulario y estado visual.
4. Crear tipos o esquemas de contrato; considerar migración incremental a TypeScript.
5. Eliminar recursos de plantilla no utilizados (`react.svg`, `vite.svg`) si se confirma que no tienen consumidores.

### Flutter

1. Dividir `explore_screen.dart`, `my_tour_screen.dart`, `profile_screen.dart`, pantallas AR y configuración.
2. Extraer controladores de presentación y estados comprobables fuera de widgets.
3. Definir repositorios o clientes API consistentes para reducir lógica HTTP repetida.
4. Mantener widgets adaptables como preparación técnica para Flutter Web, sin implementar todavía la web.
5. No mezclar esta refactorización con cambios visuales no solicitados.

### Criterios de aceptación

- Ningún nuevo controlador o pantalla concentra múltiples responsabilidades críticas.
- La lógica extraída cuenta con pruebas unitarias.
- No se altera el flujo visible salvo donde una corrección de seguridad lo requiera.
- Lint y análisis estático no incorporan nuevas advertencias.

## 14. Fase 8 — Estrategia de pruebas y CI

### Backend

Agregar pruebas de integración reales para:

- registro, login, suspensión y cambio de rol;
- matriz completa de autorización;
- DTO público y administrativo de quizzes;
- publicación/ocultamiento de contenido;
- validación de uploads y claves S3;
- inicialización común del entrypoint utilizado en local y Docker, con detección de artefactos alternativos no activados;
- errores de MongoDB y AWS sin fuga de información.

Objetivo inicial de cobertura:

- 100 % de ramas críticas de autenticación y autorización;
- al menos 80 % en servicios modificados;
- no reducir la cobertura total existente.

### Panel

Incorporar Vitest, Testing Library y mocks de red para:

- login y logout;
- sesión expirada;
- acceso denegado;
- render de rutas protegidas;
- CRUD crítico y tratamiento de errores;
- ausencia de respuestas correctas en contratos públicos.

### Flutter

Ampliar pruebas para:

- manejo global de 401/403;
- sincronización offline e idempotencia;
- contratos de quiz sin `isCorrect`;
- registro de tipo de experiencia AR/3D;
- configuración específica de debug y release;
- navegación de AR y fallback 3D.

### CI

Crear workflows separados o un workflow con jobs paralelos:

1. **Backend:** `npm ci`, lint, tests, cobertura y build/arranque controlado.
2. **Admin:** `npm ci`, lint, tests y `npm run build`.
3. **Flutter:** `flutter pub get`, format check, analyze y tests.
4. **Seguridad:** auditoría de dependencias, detección de secretos y revisión del Dockerfile y sus configuraciones asociadas.
5. **Documentación:** validación básica de enlaces y archivos referenciados.

Los jobs obligatorios deben bloquear el merge. Las auditorías de dependencias deben tener una política explícita para evitar que resultados no revisados se ignoren permanentemente.

## 15. Fase 9 — Documentación y revisión final

### Documentos a actualizar o crear

- `README_TECHNICAL.md`
- README de cada componente
- `.env.example` de cada componente
- matriz de autorización
- contrato de endpoints públicos y administrativos
- guía de ejecución local y despliegue Docker
- procedimiento de creación y recuperación de administradores
- modelo de amenazas resumido
- procedimiento de respuesta y rotación de secretos

### Revisión final de seguridad

1. Ejecutar todas las suites desde una instalación limpia.
2. Probar manualmente abuso de registro y acceso horizontal entre dos usuarios.
3. Inspeccionar respuestas públicas buscando `password`, `isCorrect`, claves S3 y estados ocultos.
4. Verificar rate limiting detrás del proxy real.
5. Construir y probar Docker con `NODE_ENV=production` en un entorno aislado antes de actualizar el contenedor alojado.
6. Probar Google Login, MongoDB, S3 y `/health` mediante el contenedor.
7. Verificar puerto publicado, proxy, CORS, señales de terminación y política de reinicio.
8. Revisar los artefactos de Vercel como código no utilizado y documentar su retiro o conservación sin tratarlos como despliegue activo.
9. Verificar builds release de Android e iOS.
10. Ejecutar auditoría de dependencias y revisar cada resultado aplicable.
11. Confirmar que logs e imágenes del contenedor no contienen secretos.
12. Obtener revisión de código por una segunda persona antes del merge.

## 16. Definición global de terminado

El plan se considera implementado cuando:

- todos los hallazgos P0 están corregidos y tienen pruebas de regresión;
- todos los hallazgos P1 están corregidos o existe una excepción documentada y aprobada;
- la matriz de autorización coincide con código y pruebas;
- ningún endpoint público devuelve respuestas de trivia, contenido oculto o datos internos;
- desarrollo local, Docker con `NODE_ENV=production` y tests pasan su matriz de arranque;
- el procedimiento de build, actualización y rollback del contenedor está documentado sin asumir un proveedor de alojamiento no confirmado;
- backend, panel y Flutter pasan CI desde una instalación limpia;
- no hay secretos ni contraseñas fijas versionadas;
- las migraciones necesarias tienen respaldo, ejecución y rollback documentados;
- documentación y `.env.example` coinciden con la implementación;
- el árbol de trabajo queda limpio después de ejecutar pruebas y builds;
- la revisión de seguridad final queda aprobada.

Solo después de cumplir esta definición se recomienda abrir la rama destinada a la versión web.

## 17. Orden resumido de ejecución

```text
Línea base reproducible
        ↓
Autenticación y escalada de privilegios
        ↓
Autorización por propietario y rol
        ↓
Contratos públicos y protección de datos
        ↓
Validación, S3 e integridad de métricas
        ↓
Clientes y configuración móvil
        ↓
Bootstrap local y despliegue Docker
        ↓
Refactorización mantenible
        ↓
CI, documentación y revisión final
        ↓
Habilitación para comenzar Flutter Web
```

## 18. Checklist de arranque de la futura ejecución

- [ ] Elegir rama base y responsable de la rama de hardening.
- [ ] Crear `hardening/security-quality`.
- [ ] Confirmar entorno de pruebas aislado.
- [ ] Obtener línea base de tests y builds.
- [ ] Crear issues con los IDs de este documento.
- [ ] Implementar primero SEC-01 a SEC-05.
- [ ] Solicitar revisión antes de avanzar a refactorizaciones.
- [ ] No iniciar trabajo web mientras existan P0 o P1 de seguridad abiertos.
