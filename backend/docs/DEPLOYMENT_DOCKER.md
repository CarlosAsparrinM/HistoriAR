# Operación del backend en Docker

Este documento describe la operación del backend de HistoriAR en contenedor. No
presupone proveedor, orquestador ni registro de imágenes.

## Antes de construir

1. Usar Node 20 y mantener `backend/package-lock.json` sincronizado.
2. Preparar un archivo de variables fuera de Git. En producción se requieren
   `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AWS_REGION`, `S3_BUCKET` y
   `ALLOWED_ORIGINS`. Puede usarse un rol IAM del runtime en lugar de claves AWS.
3. Configurar `NODE_ENV=production`, un `JWT_SECRET` aleatorio de al menos 32
   caracteres y los orígenes exactos del panel y de los clientes permitidos.
4. Si el panel y la API están en orígenes distintos, usar HTTPS y revisar
   `ADMIN_COOKIE_SAME_SITE` junto con CORS/CSRF.

## Build local de verificación

Con Docker Desktop o el daemon activo, desde la raíz del repositorio:

```bash
docker build -t historiar-backend:local ./backend
```

Esto crea una imagen local; no inicia, publica ni actualiza ningún contenedor.

## Arranque local opcional

Solo con credenciales y servicios de prueba:

```bash
docker run --rm --name historiar-backend-local \
  --env-file backend/.env.test \
  -p 4000:4000 historiar-backend:local
```

En otra terminal, comprobar el proceso con `curl http://localhost:4000/health`.
No reutilizar un archivo de variables de producción para esta comprobación.

## Actualización controlada

1. Ejecutar CI y revisar la imagen en un entorno no productivo.
2. Respaldar la base de datos antes de una migración; las migraciones no se
   ejecutan al arrancar la imagen.
3. Publicar la imagen con el mecanismo del proveedor elegido por el equipo.
4. Verificar `/health`, logs y conectividad de MongoDB/S3.
5. Ante un fallo, volver a la etiqueta de imagen anterior y restaurar datos
   solo si una migración aprobada lo requiere.

## Diagnóstico

- Un `HEALTHCHECK` fallido suele indicar que el proceso no escucha en `PORT`
  (por defecto 4000) o que falló su inicialización.
- Errores de S3 deben revisarse con el rol IAM/credenciales, región y bucket;
  no incluir claves en logs ni en la imagen.
- Para despliegues detrás de proxy, configurar `TRUST_PROXY_HOPS` únicamente
  con el número real de saltos de confianza.
