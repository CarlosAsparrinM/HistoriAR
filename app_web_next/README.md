# HistoriAR Web (Next.js)

Aplicación web oficial de HistoriAR, construida con Next.js App Router y TypeScript. Sustituye a la implementación anterior de Flutter Web.

## Qué incluye

- Catálogo público paginado y buscable con estado de búsqueda en la URL.
- Rutas compartibles para fichas (`/monumentos/:id`) y cuestionarios (`/monumentos/:id/quiz`).
- Renderizado del catálogo y la ficha en servidor, sin almacenar respuestas que incluyen URLs firmadas de S3.
- Mapa Leaflet, visor `model-viewer` y síntesis de voz como componentes de cliente cargados solo donde se necesitan.
- Evaluación de cuestionario directa del navegador al backend. No existe un proxy Next.js para no agrupar límites por IP.
- Contratos Zod, pruebas Vitest y base de Playwright.

La autenticación no se activa en este corte: el catálogo Flutter ejecutable tampoco la exige y el contrato de validación de sesión todavía debe alinearse con el backend. `NEXT_PUBLIC_AUTH_ENABLED` queda reservado para ese incremento posterior.

## Desarrollo

1. Copia `.env.example` a `.env.local` y configura ambas URLs de la API.
2. Instala las dependencias reproducibles con `npm ci`.
3. Ejecuta `npm run dev`. La aplicación se inicia siempre en `http://localhost:3005`.

Para que las llamadas de búsqueda y quiz desde el navegador funcionen, el backend debe permitir el origen exacto de Next.js en `ALLOWED_ORIGINS` (por ejemplo, `http://localhost:3005`).

## Validación

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` espera un servidor ya disponible en `PLAYWRIGHT_BASE_URL` (por defecto `http://127.0.0.1:3005`) y datos de API utilizables.

## Despliegue

En Vercel configura `app_web_next` como Root Directory. Define `HISTORIAR_API_BASE_URL` solo para el servidor y `NEXT_PUBLIC_API_BASE_URL` para el navegador. Ninguna variable de AWS, MongoDB, JWT o secreto OAuth debe estar en este proyecto. No configures rewrites de medios: las imágenes y modelos firmados deben descargarse desde S3 directamente.

Define también `NEXT_PUBLIC_SITE_URL` con el dominio público canónico (por ejemplo, `https://historiar.pe`). Esta variable se usa para `robots.txt`, `sitemap.xml`, URLs canónicas, Open Graph y datos estructurados; no debe apuntar a una URL de preview.

Después de publicar, registra `/sitemap.xml` en Google Search Console y Bing Webmaster Tools. El sitemap incorpora automáticamente las fichas públicas disponibles en la API y omite búsquedas y quizzes para evitar contenido duplicado o de poco valor indexable.
