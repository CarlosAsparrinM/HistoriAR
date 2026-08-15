# Contratos de API para HistoriAR Web

Las rutas de contenido descritas abajo son los contratos de lectura existentes.
La interfaz HistoriAR Web adoptará acceso obligatorio con cuenta local y
guardas de navegación. Móvil y web compartirán los mismos contratos protegidos
después de una migración coordinada a Bearer; hasta activar `verifyToken` ruta
por ruta no debe afirmarse que las lecturas existentes están protegidas.

La web no llama rutas administrativas, no usa Google Sign-In y no comparte la
cookie del panel.

## Sesión local de usuario

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/validate`

El cliente web restaurará el JWT desde `sessionStorage` tras F5 y lo eliminará
al cerrar la pestaña, cerrar sesión o recibir `401/403`. No se utiliza
`localStorage`.

## Historial de un monumento

`GET /api/monuments/:monumentId/historical-data/public`

Devuelve `404` si el ID no es válido, el monumento no existe o no tiene estado
`Disponible`. Incluye todas sus entradas históricas en orden ascendente, porque
las fichas se publican desde el momento en que se crean.

Ejemplo de respuesta:

```json
[
  {
    "id": "507f1f77bcf86cd799439012",
    "title": "Fundación",
    "description": "Texto revisado para visitantes.",
    "imageUrl": "https://...url-firmada-temporal...",
    "discoveryInfo": "",
    "activities": [],
    "sources": [],
    "order": 0
  }
]
```

El DTO no incluye `createdBy`, correo electrónico, `status`, claves S3,
metadatos de carga ni otros campos administrativos. Las URLs de medios son
temporales y las genera la API; el navegador nunca forma una clave S3.

La ruta tiene un límite de 120 solicitudes por IP cada 15 minutos. En una
instalación con más de una instancia de backend, el limitador en memoria debe
reemplazarse por almacenamiento compartido antes de publicar la web.

## Publicación de fichas históricas

Las fichas históricas no manejan un estado de publicación independiente. Una
ficha queda visible en la web inmediatamente después de crearla. Su exposición
pública depende únicamente de que el monumento asociado esté `Disponible`.

## Catálogo y detalle

- `GET /api/monuments` lista únicamente monumentos `Disponible`.
- `GET /api/monuments/:id` devuelve solo un monumento `Disponible` o `404`.

Para producción, el origen web exacto debe estar en `ALLOWED_ORIGINS`, la API
debe servir HTTPS y no se deben habilitar comodines CORS.

## Contratos pendientes aprobados

### Instituciones

El DTO web devolverá solo `id`, nombre, tipo, descripción, sitio web, imagen
firmada, dirección pública y horarios. No devolverá `s3ImageKey`, estado
interno, radio de proximidad, timestamps administrativos ni alertas.

### Quizzes

La web permite responder quizzes de forma anónima. Obtiene las preguntas con
`GET /api/quizzes?monumentId=:id` y las evalúa con
`POST /api/quizzes/:id/evaluate`. La evaluación no crea un `QuizAttempt`, no
requiere token y está limitada a 5 solicitudes por minuto por IP. Solo devuelve
puntaje y retroalimentación; las respuestas correctas no se incluyen antes de
evaluar.

Las reglas siguientes sobre `submit` e intentos corresponden a la app móvil
autenticada, no a la experiencia web pública.

- El DTO inicial incluye preguntas y opciones, pero nunca `isCorrect`, índices
  correctos ni explicaciones antes de responder.
- `POST /api/quizzes/:id/submit` corrige en servidor y tendrá un máximo inicial
  de 5 envíos por minuto por usuario e IP.
- `GET /api/quizzes/my-attempts` obtiene del token al usuario y devuelve una
  lista paginada de sus puntajes; no acepta `userId` enviado por el cliente.
- Los intentos web se guardan exclusivamente en `QuizAttempt`. Nunca crean
  `Visit`, `TourSession` ni progreso de tours.
