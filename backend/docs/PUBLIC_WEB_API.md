# API pública para HistoriAR Web

Este contrato solo sirve contenido de consulta. No requiere sesión, cookie,
token ni cabecera CSRF. La interfaz web no debe llamar rutas administrativas ni
enviar credenciales.

## Historial de un monumento

`GET /api/monuments/:monumentId/historical-data/public`

Devuelve `404` si el ID no es válido, el monumento no existe o no tiene estado
`Disponible`. Solo incluye entradas históricas con estado `Disponible`, en
orden ascendente.

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

## Publicar una ficha histórica

Las nuevas fichas se crean con `status: Oculto` de forma intencional. Para
hacer una visible en la web, un administrador debe editarla en el panel y
seleccionar **Disponible (web pública)**. El endpoint administrativo de edición
acepta exclusivamente `Oculto` o `Disponible`.

Las fichas existentes sin `status` se tratan como ocultas. No se ejecuta una
migración automática porque podría publicar contenido no revisado. El rollback
operativo es editar las fichas publicadas y devolverlas a `Oculto`; no hace
falta borrar datos ni objetos de S3.

## Catálogo y detalle

- `GET /api/monuments` lista únicamente monumentos `Disponible`.
- `GET /api/monuments/:id` devuelve solo un monumento `Disponible` o `404`.

Para producción, el origen web exacto debe estar en `ALLOWED_ORIGINS`, la API
debe servir HTTPS y no se deben habilitar comodines CORS.
