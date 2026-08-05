# Plan de implementación — HistoriAR Web autenticada

- **Estado:** actualizado según decisiones funcionales.
- **Rama sugerida:** `feature/public-web` desde `main`.
- **Objetivo:** plataforma cultural web para consultar monumentos, información
  histórica, instituciones, modelos 3D y quizzes educativos.
- **Regla de compatibilidad:** `app_web/` y `app_movil/` conservan proyectos,
  dependencias, pruebas y builds independientes. La migración móvil se limita a
  adjuntar autenticación en servicios de red; no cambia AR, tours ni UX móvil.

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
3. El token se conserva en `sessionStorage`: sobrevive a F5, pero se elimina al
   cerrar la pestaña. No se almacena en `localStorage`, URL, logs ni
   `--dart-define`. Esta decisión se acompaña de CSP estricta y revisión XSS.
4. Al iniciar la aplicación o recargarla, se lee el token de `sessionStorage` y
   se valida mediante `GET /api/auth/validate` antes de mostrar contenido.
5. Ante `401` o `403`, se elimina el token y se vuelve a la pantalla de acceso.
6. El cierre de sesión es explícito y limpia memoria y `sessionStorage`.

**Criterio de salida:** una persona puede registrarse, iniciar/cerrar sesión y
recuperarse de una sesión expirada sin afectar la autenticación móvil ni la del
panel administrativo.

### 2.3 Política compartida de acceso a la API

Después del login, web y móvil deben enviar `Authorization: Bearer <token>` en
todas las consultas. No se crean copias permanentes bajo `/api/web`; ambos
clientes comparten contratos de usuario autenticado.

| Acceso | Rutas o capacidades |
|---|---|
| Sin autenticación | registro, login y health check mínimo |
| Usuario autenticado | monumentos, instituciones, fichas publicadas, modelos 3D, quizzes, intentos propios, perfil, visitas y tours |
| Administrador | contenido oculto, CRUD, cargas, estadísticas internas e intentos de otros usuarios |

Autenticar una ruta no sustituye la autorización: las consultas de usuario
siguen filtrando `Disponible`, aplican DTO con allowlist y verifican propiedad
de los datos personales.

## 3. Arquitectura de `app_web`

1. Mantener `app_web/` como Flutter Web independiente.
2. Configurar `API_BASE_URL` mediante `--dart-define`; nunca incluir secretos.
3. Crear `AuthService`, estado de sesión y guardas de navegación.
4. Centralizar las llamadas posteriores al login en un cliente autenticado que
   adjunte Bearer, trate `401/403` y nunca envíe el token a otro origen.
5. Usar rutas directas y recargables: `/login`, `/registro`, `/explorar`,
   `/monumentos/:id`, `/instituciones/:id` y `/quizzes/:id`.
6. Hacer responsive la interfaz para escritorio, tableta y móvil web, sin copiar
   la barra ni los flujos propios de la app móvil.
7. Activar `usePathUrlStrategy()` para URLs limpias sin `#`. El hosting debe
   reescribir toda ruta desconocida de la SPA hacia `index.html`, conservando
   archivos estáticos y respuestas de API fuera de esa regla.
8. Aplicar guardas de ruta antes de cargar datos. La protección real también se
   aplica en Express con `verifyToken`; una guarda Flutter por sí sola no cuenta
   como control de acceso.

## 4. Catálogo y ficha de monumento

1. Catálogo de monumentos publicados con búsqueda y filtros por categoría,
   cultura, distrito e institución.
2. Mapa con paneo, zoom y marcadores interactivos, sin seguimiento de posición.
3. Ficha con descripción, imágenes, periodo, cultura, institución, fuentes y
   ubicación descriptiva.
4. Visor GLB/GLTF con rotación, zoom, carga, error, reintento y fallback.
5. CTA discreto: “Para tour presencial o realidad aumentada, usa HistoriAR
   móvil”. No debe bloquear el contenido web.
6. En escritorio desde 1080 px usar Split-View: mapa a la izquierda y catálogo
   o ficha a la derecha. En tablet usar panel plegable y en móvil web apilar
   mapa y contenido sin copiar la navegación de la app móvil.
7. Cargar el visor y el GLB solo al entrar en su sección, mostrar progreso y no
   bloquear la ficha. Si WebGL o la aceleración gráfica no están disponibles,
   mostrar imagen, texto histórico y un mensaje de compatibilidad.
8. Definir un DTO de institución con allowlist: `id`, `name`, `type`,
   `description`, `website`, `imageUrl`, dirección pública y horarios. Excluir
   `s3ImageKey`, `status`, timestamps internos, radio de proximidad y cualquier
   vínculo administrativo o alerta interna.

**Criterio de salida:** la ficha continúa siendo utilizable si faltan imagen,
modelo 3D o información histórica.

## 5. Quizzes web

### 5.1 Experiencia de usuario

1. Mostrar un botón `Realizar quiz` después de la información histórica.
2. Al regresar al mapa, abrir otro monumento o salir de la ficha, presentar un
   `SnackBar` o banner flotante no modal para realizar el quiz; nunca obligar ni
   interpretar eso como una visita física.
3. La persona puede ignorar el aviso y comenzar el quiz posteriormente.
   Si lo descarta, no se vuelve a mostrar para ese monumento durante la misma
   sesión de pestaña.
4. Mostrar resultado, puntaje y explicación después de enviar las respuestas.
5. Un intento web se registra como actividad educativa de la cuenta, no como
   visita, parada de tour ni experiencia AR.

### 5.2 Backend y seguridad

1. Definir un DTO de lectura para quiz con preguntas y opciones, sin índices de
   respuesta correcta ni explicaciones privadas antes del envío.
2. Reutilizar o adaptar el envío autenticado para que la corrección ocurra solo
   en el servidor.
3. Validar ID, estructura, cantidad de respuestas y tiempo enviado.
4. Aplicar rate limiting específico: máximo 5 envíos por minuto por combinación
   de usuario e IP para `POST /api/quizzes/:id/submit`, con `429`,
   `Retry-After` y límites ajustables por variables de entorno.
5. Devolver explicaciones y respuestas correctas únicamente en el resultado de
   la persona autenticada.
6. No exponer intentos de otras personas, correos, respuestas correctas en el
   DTO inicial ni estadísticas administrativas.
7. Añadir `GET /api/quizzes/my-attempts` antes de la ruta `/:id`. Debe usar el
   usuario del token, paginar resultados y devolver solo `quizId`, monumento,
   puntaje, porcentaje, fecha y duración; nunca aceptar `userId` del cliente.
8. La web escribe exclusivamente en `QuizAttempt`. No crea ni actualiza
   documentos `Visit`, `TourSession` ni progreso de paradas.

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
9. No habilitar `Cross-Origin-Embedder-Policy: require-corp` ni
   `Cross-Origin-Opener-Policy: same-origin` por defecto. Primero se validará que
   S3, el visor 3D y las teselas del mapa entreguen CORS/CORP compatibles; solo
   se activarán si el renderer elegido realmente necesita aislamiento.
10. El proveedor de hosting se decide antes de staging. Debe soportar fallback
    SPA, HTTPS, cabeceras configurables, rollback e invalidación de caché; el
    plan no presupone Vercel ni cambia el contenedor backend.
11. Añadir `verifyToken` a todas las lecturas posteriores al login y
    `requireRole('admin')` a las operaciones administrativas. Las pruebas deben
    cubrir `401` sin token, `403` sin rol y acceso permitido con token válido.
12. Sustituir la ruta histórica pública por un contrato autenticado de contenido
    publicado. La ruta de usuario filtra `status: Disponible` y elimina
    `createdBy`, claves S3 y estado interno; la vista administrativa conserva
    una ruta separada con rol admin.

### 6.1 Migración coordinada sin romper aplicaciones instaladas

1. Inventariar todas las rutas consumidas después del login por móvil, web y
   panel, indicando si hoy envían Bearer y qué DTO reciben.
2. Actualizar primero `app_movil` para que su cliente HTTP adjunte Bearer en
   monumentos, instituciones, fichas, quizzes, tours y demás lecturas de
   usuario. No cambiar todavía la exigencia del backend.
3. Añadir pruebas móviles que fallen si una llamada posterior al login sale sin
   `Authorization` y pruebas de sesión expirada ante `401/403`.
4. Publicar y validar esa versión móvil antes de exigir token en las rutas
   compartidas. Definir versión mínima soportada o una ventana de transición
   para instalaciones antiguas.
5. Implementar `verifyToken` en backend solo después de la compatibilidad del
   cliente; activar ruta por ruta con pruebas de regresión.
6. Actualizar `app_web` para consumir las mismas rutas protegidas y eliminar
   cualquier fallback anónimo.
7. Retirar las rutas públicas heredadas cuando la versión mínima móvil ya envíe
   Bearer. Documentar fecha, métricas y rollback de cada activación.

Si no puede imponerse una versión mínima móvil, usar temporalmente una versión
de API compartida (`/api/v2`) para web y móvil actualizado, con fecha de retiro
de la versión anterior. No mantener dos contratos indefinidamente.

## 7. Calidad y no regresión

1. Tests backend para acceso, registro, DTO de quiz, corrección, autorización,
   rate limiting y ausencia de campos sensibles.
2. Tests Flutter Web para acceso, registro, sesión expirada, catálogo, mapa,
   ficha, historial, visor y quiz.
3. Pruebas manuales en Chrome, Edge, Firefox y Safari moderno.
4. `flutter analyze`, `flutter test` y `flutter build web --release` en CI.
5. Mantener los jobs existentes de backend, panel y `app_movil`; ningún cambio
   web debe alterar su lockfile o dependencias.
6. Mantener el job `Flutter web quality` ya presente en
   `.github/workflows/ci.yml`; no añadir despliegue al CI en esta fase.
7. Verificar teclado completo con Tab/Shift+Tab/Enter/Escape, foco visible,
   contraste WCAG 2.1 AA, texto escalable y `Semantics` para mapa, formularios,
   visor, resultados y mensajes de error.
8. Añadir una matriz automatizada por ruta: sin token=`401`, usuario sin
   permiso=`403`, usuario válido=DTO publicado y admin=contrato administrativo.

## 8. Orden de ejecución

1. Crear la matriz de acceso y auditar qué servicios móviles no envían Bearer.
2. Actualizar y probar primero el cliente móvil autenticado, sin activar aún la
   obligatoriedad en el backend.
3. Corregir DTOs de usuario: contenido publicado, instituciones y quizzes sin
   campos administrativos ni respuestas correctas anticipadas.
4. Separar el historial publicado del historial administrativo y añadir
   `GET /api/quizzes/my-attempts`.
5. Implementar acceso, registro, estado de sesión y cliente Bearer en `app_web`
   sin Google.
6. Tras la ventana de compatibilidad móvil, activar `verifyToken` ruta por ruta
   y validar `401/403` en backend, móvil y web.
7. Completar catálogo, filtros, rutas directas, ficha, visor y quiz web.
8. Completar accesibilidad, manejo de errores, pruebas y build web.
9. Validar CORS, cabeceras y URLs firmadas en staging antes de publicar.

## 9. Criterios finales

- La web requiere cuenta local con correo y contraseña.
- La web no ofrece Google Sign-In, AR, tours físicos, GPS continuo,
  notificaciones cercanas ni registro de visitas físicas.
- La persona autenticada puede explorar contenido publicado, ver modelos 3D y
  completar quizzes educativos.
- Ninguna ruta de contenido posterior al login responde sin token válido; las
  únicas excepciones son registro, login y health check documentado.
- La app móvil conserva en exclusiva AR, tours presenciales, ubicación y
  visitas.
- No se despliega nada hasta aprobar las pruebas y el build de CI.
