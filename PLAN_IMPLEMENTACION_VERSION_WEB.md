# Plan de implementación — HistoriAR Web autenticada

- **Estado:** actualizado según decisiones funcionales.
- **Rama sugerida:** `feature/public-web` desde `main`.
- **Objetivo:** plataforma cultural web para consultar monumentos, información
  histórica, instituciones, modelos 3D y quizzes educativos.
- **Regla de compatibilidad:** `app_web/` y `app_movil/` conservan proyectos,
  dependencias, pruebas y builds independientes. La web no modifica los flujos
  móviles existentes.

## 1. Límites de producto

La web es una experiencia completa para estudiar y explorar patrimonio desde
una PC, no una demo de la aplicación móvil ni una página de descarga.

### Incluido en web

1. Registro e inicio de sesión con nombre, correo y contraseña.
2. Catálogo, mapa navegable manualmente, búsqueda y filtros.
3. Fichas históricas, fuentes, imágenes, instituciones y modelos 3D.
4. Quizzes educativos vinculados al monumento consultado.
5. CTA contextual hacia la aplicación móvil para realizar tours físicos o AR.

### Excluido de web

1. Realidad aumentada, cámara, ARCore, anclajes y captura AR.
2. Tours físicos, sesiones de recorrido, paradas bloqueadas y calificaciones.
3. GPS continuo, proximidad, distancias al usuario y notificaciones cercanas.
4. Registro de visitas físicas, incluidas visitas AR.
5. Inicio de sesión, registro o SDK de Google durante esta versión.
6. Administración de contenido, cargas de archivos y despliegue automático.

El mapa web permanece, pero sirve para explorar manualmente. No centra al
usuario por GPS ni determina si está cerca de un monumento.

## 2. Autenticación de usuarios

### 2.1 Contrato existente a reutilizar

La web reutiliza los endpoints ya disponibles:

- `POST /api/auth/register` con `name`, `email`, `password` y distrito opcional.
- `POST /api/auth/login` con `email` y `password`.
- `GET /api/auth/validate` para restaurar o comprobar una sesión activa.

No se consume ni se muestra `POST /api/auth/google`. No se añade una clave,
botón, SDK ni configuración de Google.

### 2.2 Flujo web

1. La raíz muestra acceso y registro; no permite explorar sin cuenta.
2. Tras registrarse, la persona inicia sesión con correo y contraseña.
3. El token se mantiene únicamente en memoria durante la sesión de la pestaña;
   no se almacena en `localStorage`, URL, logs ni `--dart-define`.
4. Ante `401` o `403`, se elimina el token y se vuelve a la pantalla de acceso.
5. El cierre de sesión es explícito y borra el estado en memoria.

**Criterio de salida:** una persona puede registrarse, iniciar/cerrar sesión y
recuperarse de una sesión expirada sin afectar la autenticación móvil ni la del
panel administrativo.

## 3. Arquitectura de `app_web`

1. Mantener `app_web/` como Flutter Web independiente.
2. Configurar `API_BASE_URL` mediante `--dart-define`; nunca incluir secretos.
3. Crear `AuthService`, estado de sesión y guardas de navegación.
4. Mantener el cliente de lectura separado de las llamadas autenticadas.
5. Usar rutas directas y recargables: `/login`, `/registro`, `/explorar`,
   `/monumentos/:id`, `/instituciones/:id` y `/quizzes/:id`.
6. Hacer responsive la interfaz para escritorio, tableta y móvil web, sin copiar
   la barra ni los flujos propios de la app móvil.

## 4. Catálogo y ficha de monumento

1. Catálogo de monumentos publicados con búsqueda y filtros por categoría,
   cultura, distrito e institución.
2. Mapa con paneo, zoom y marcadores interactivos, sin seguimiento de posición.
3. Ficha con descripción, imágenes, periodo, cultura, institución, fuentes y
   ubicación descriptiva.
4. Visor GLB/GLTF con rotación, zoom, carga, error, reintento y fallback.
5. CTA discreto: “Para tour presencial o realidad aumentada, usa HistoriAR
   móvil”. No debe bloquear el contenido web.

**Criterio de salida:** la ficha continúa siendo utilizable si faltan imagen,
modelo 3D o información histórica.

## 5. Quizzes web

### 5.1 Experiencia de usuario

1. Mostrar un botón `Realizar quiz` después de la información histórica.
2. Al regresar al mapa, abrir otro monumento o salir de la ficha, presentar un
   aviso no bloqueante para realizar el quiz; nunca obligar ni interpretar eso
   como una visita física.
3. La persona puede ignorar el aviso y comenzar el quiz posteriormente.
4. Mostrar resultado, puntaje y explicación después de enviar las respuestas.
5. Un intento web se registra como actividad educativa de la cuenta, no como
   visita, parada de tour ni experiencia AR.

### 5.2 Backend y seguridad

1. Definir un DTO de lectura para quiz con preguntas y opciones, sin índices de
   respuesta correcta ni explicaciones privadas antes del envío.
2. Reutilizar o adaptar el envío autenticado para que la corrección ocurra solo
   en el servidor.
3. Validar ID, estructura, cantidad de respuestas y tiempo enviado.
4. Aplicar rate limiting específico al acceso y envío de quizzes.
5. Devolver explicaciones y respuestas correctas únicamente en el resultado de
   la persona autenticada.
6. No exponer intentos de otras personas, correos, respuestas correctas en el
   DTO inicial ni estadísticas administrativas.

**Criterio de salida:** un usuario autenticado completa un quiz desde web sin
GPS, AR, tour ni registro de visita física; un usuario no autenticado no accede
al catálogo ni al quiz.

## 6. Seguridad y privacidad

1. Conservar los límites de intentos de `register` y `login` existentes.
2. No usar cookies del panel administrativo ni rutas `/admin`.
3. Configurar CORS con el origen web exacto en producción, sin comodines.
4. Usar HTTPS para la API y la web en producción.
5. Permitir solo DTOs de contenido publicado; no devolver `createdBy`, estados
   internos, claves S3, respuestas de quiz previas al envío ni datos de otros
   usuarios.
6. Mantener URLs temporales de S3 generadas por la API; el navegador no forma
   claves de almacenamiento.
7. Configurar CSP, `frame-ancestors`, HSTS, `nosniff` y `Referrer-Policy` en el
   hosting cuando se defina el proveedor.
8. Tratar texto y URLs de API como datos no confiables; no renderizar HTML sin
   sanitizar ni abrir URLs no permitidas.

## 7. Calidad y no regresión

1. Tests backend para acceso, registro, DTO de quiz, corrección, autorización,
   rate limiting y ausencia de campos sensibles.
2. Tests Flutter Web para acceso, registro, sesión expirada, catálogo, mapa,
   ficha, historial, visor y quiz.
3. Pruebas manuales en Chrome, Edge, Firefox y Safari moderno.
4. `flutter analyze`, `flutter test` y `flutter build web --release` en CI.
5. Mantener los jobs existentes de backend, panel y `app_movil`; ningún cambio
   web debe alterar su lockfile o dependencias.

## 8. Orden de ejecución

1. Corregir el contrato y las pruebas del backend para quizzes web seguros.
2. Implementar acceso, registro y estado de sesión en `app_web` sin Google.
3. Proteger la navegación de catálogo, ficha, visor e instituciones.
4. Añadir filtros, rutas directas y experiencia de ficha.
5. Integrar el quiz posterior a la consulta del monumento.
6. Completar accesibilidad, manejo de errores, pruebas y build web.
7. Validar CORS, cabeceras y URLs firmadas en staging antes de publicar.

## 9. Criterios finales

- La web requiere cuenta local con correo y contraseña.
- La web no ofrece Google Sign-In, AR, tours físicos, GPS continuo,
  notificaciones cercanas ni registro de visitas físicas.
- La persona autenticada puede explorar contenido publicado, ver modelos 3D y
  completar quizzes educativos.
- La app móvil conserva en exclusiva AR, tours presenciales, ubicación y
  visitas.
- No se despliega nada hasta aprobar las pruebas y el build de CI.
