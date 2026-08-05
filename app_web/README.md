# HistoriAR Web

Plataforma cultural autenticada de HistoriAR hecha en Flutter Web. Permitirá buscar monumentos,
explorarlos en el mapa, consultar su información histórica publicada y ver sus
modelos 3D y realizar quizzes en el navegador. Requerirá cuenta local con
correo y contraseña, sin Google Sign-In. No incorpora AR, tours físicos, GPS ni
registro de visitas: esas funciones se mantienen en la aplicación móvil.

> Estado: la base de catálogo, mapa, ficha histórica y visor 3D está en
> desarrollo. La autenticación y los quizzes descritos aquí son el siguiente
> incremento aprobado; no deben considerarse disponibles hasta que pasen CI.

## Ejecutar en desarrollo

1. Instala las dependencias:

   ```powershell
   flutter pub get
   ```

2. Arranca la web indicando la URL de la API:

   ```powershell
   flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000/api
   ```

El backend debe permitir el origen que Flutter asigne al navegador. Para un
origen distinto de los valores locales preconfigurados, añade el origen exacto
a `ALLOWED_ORIGINS` en el backend.

## Build de producción

```powershell
flutter build web --release --dart-define=API_BASE_URL=https://api.ejemplo.pe/api
```

`API_BASE_URL` debe usar HTTPS en el build de producción. No se deben incluir
credenciales, claves de S3, tokens administrativos ni archivos `.env` en el
bundle. El archivo `.env.example` solo sirve como referencia de variables.

## Contrato de lectura y sesión

- `POST /api/auth/register`: crear cuenta local.
- `POST /api/auth/login`: iniciar sesión con correo y contraseña.
- `GET /api/auth/validate`: validar la sesión restaurada desde
  `sessionStorage` después de F5.

- `GET /api/monuments`: catálogo de monumentos disponibles.
- `GET /api/monuments/:id`: detalle de un monumento disponible.
- `GET /api/monuments/:id/historical-data/public`: únicamente fichas
  históricas con estado `Disponible` y de un monumento también disponible.

La ruta de historial devuelve un DTO limitado; no expone autores, estados
internos ni claves de objetos de S3. Las URLs de archivos deben ser URLs
firmadas y temporales emitidas por la API.

Las rutas de quiz autenticado e instituciones con DTO limitado se implementan
según `PLAN_IMPLEMENTACION_VERSION_WEB.md`. La web no consume
`POST /api/auth/google` ni escribe en `Visit` o `TourSession`.

## Seguridad y operación

- Configura `ALLOWED_ORIGINS` con el dominio web final, sin comodines.
- Sirve la web y la API mediante HTTPS.
- No guardes el JWT en `localStorage`: la implementación aprobada usa
  `sessionStorage`, validación tras F5 y eliminación al cerrar sesión.
- Las rutas limpias requieren fallback del hosting hacia `index.html`.
- El historial público cuenta con rate limiting por IP; al escalar el backend,
  cambia el almacenamiento en memoria del limitador por uno compartido.
- El mapa usa teselas de OpenStreetMap con atribución. Antes de alto tráfico,
  configura un proveedor de teselas adecuado o una caché conforme a su
  política de uso.
