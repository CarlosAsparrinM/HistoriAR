# Configuración de Variables de Entorno - App Móvil

## Descripción

Este proyecto utiliza variables de entorno para gestionar la configuración según el ambiente (desarrollo, staging, producción).

## Archivos de Configuración

- **`.env`** - Archivo local con variables de entorno (NO incluir en git)
- **`.env.example`** - Plantilla de ejemplo para documentar las variables disponibles

## Variables Disponibles

| Variable                   | Tipo    | Descripción                                     | Ejemplo                                |
| -------------------------- | ------- | ----------------------------------------------- | -------------------------------------- |
| `API_BASE_URL`             | String  | URL base del servidor backend                   | `http://localhost:3000`                |
| `API_TIMEOUT`              | Integer | Timeout para peticiones API en ms               | `30000`                                |
| `ENVIRONMENT`              | String  | Ambiente de ejecución                           | `development`, `staging`, `production` |
| `LOCATION_UPDATE_INTERVAL` | Integer | Intervalo de actualización de ubicación en ms   | `5000`                                 |
| `LOCATION_ACCURACY`        | String  | Precisión de geolocalización                    | `best`, `high`, `medium`, `low`        |
| `AR_ENABLED`               | Boolean | Habilitar características de Realidad Aumentada | `true`, `false`                        |
| `DEBUG_MODE`               | Boolean | Modo debug activado                             | `true`, `false`                        |

## Configuración por Ambiente

### Desarrollo

```env
API_BASE_URL=http://localhost:3000
ENVIRONMENT=development
DEBUG_MODE=true
AR_ENABLED=true
```

### Emulador Android

```env
API_BASE_URL=http://10.0.2.2:3000
ENVIRONMENT=development
DEBUG_MODE=true
```

### Staging

```env
API_BASE_URL=https://staging-api.historiAR.com
ENVIRONMENT=staging
DEBUG_MODE=false
AR_ENABLED=true
```

### Producción

```env
API_BASE_URL=https://api.historiAR.com
ENVIRONMENT=production
DEBUG_MODE=false
AR_ENABLED=true
API_TIMEOUT=30000
```

## Uso en el Código

### Importar y usar las variables:

```dart
import 'package:app_movil/config/environment.dart';

// Acceder a una variable
String url = Environment.apiBaseUrl;
int timeout = Environment.apiTimeout;
bool isDebug = Environment.debugMode;

// Verificar el ambiente
if (Environment.isDevelopment()) {
  // Código solo para desarrollo
}
```

## Pasos para Configurar

1. Copia el archivo `.env.example` a `.env`:

   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con tus valores locales

3. Para diferentes ambientes, crea archivos específicos:

   ```bash
   .env.development
   .env.staging
   .env.production
   ```

4. Asegúrate que `.env` está en el `.gitignore` para no incluirlo en el repositorio

## Notas Importantes

- El archivo `.env` **NO debe ser incluido en git** (está en `.gitignore`)
- El archivo `.env.example` **SÍ debe estar en git** como referencia
- Las variables se cargan al inicio de la aplicación en `main.dart`
- Si una variable no está configurada, se usa un valor por defecto
- Para cambios de variables de entorno, reinicia la aplicación
