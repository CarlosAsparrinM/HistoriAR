# Manual de Instalación — HistoriAR

**Versión:** 1.0
**Última actualización:** 16 de mayo de 2026

---

## Descripción

Este documento explica paso a paso cómo instalar y poner en marcha todo el sistema HistoriAR: backend (Node.js + MongoDB), Admin Panel (React/Vite) y App Móvil (Flutter). Incluye requisitos, configuración de entorno, ejecución en desarrollo y notas de despliegue.

---

## Requisitos Previos

- Sistema operativo: Windows / macOS / Linux actualizado
- Git
- Node.js >= 18 y `npm` o `yarn`
- MongoDB >= 6.0 (local o Atlas)
- Flutter SDK >= 3.9.2 (para la app móvil)
- Android Studio + Android SDK (para Android)
- Xcode (para builds iOS, solo macOS)
- Credenciales cloud (AWS S3 o Google Cloud Storage) para uploads

Recomendación: ejecutar `git`, `node`, `npm` y `flutter doctor` para comprobar el entorno.

```bash
# Comprobaciones rápidas
git --version
node --version
npm --version
flutter doctor
```

---

## Clonar el repositorio

```bash
git clone https://github.com/CarlosAsparrinM/HistoriAR.git
cd HistoriAR
```

---

## Backend (carpeta: `backend`)

1. Instalar dependencias

```bash
cd backend
npm install
```

2. Variables de entorno

Crear un archivo `.env` en `backend/` con al menos las siguientes variables:

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
PORT=4000
NODE_ENV=development
STORAGE_TYPE=s3
```

3. Índices y migraciones

```bash
npm run indexes
npm run migrate
npm run verify
```

4. Ejecutar en desarrollo

```bash
npm run dev
# Servidor: http://localhost:4000
```

5. Ejecutar en producción (opcional)

Usar PM2, systemd o Docker. Ejemplo con PM2:

```bash
npm run build   # si el proyecto lo soporta
pm2 start npm --name historiar -- run start
```

6. Tests

```bash
npm run test
```

7. Comprobaciones rápidas

```bash
curl http://localhost:4000/health
```

---

## Admin Panel (carpeta: `admin-panel`)

1. Instalar dependencias

```bash
cd admin-panel
npm install
```

2. Variables de entorno

Crear `.env` en `admin-panel/`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_NODE_ENV=development
```

3. Ejecutar en desarrollo

```bash
npm run dev
# Abrir: http://localhost:5173
```

4. Build para producción

```bash
npm run build
npm run preview
```

5. Despliegue

Desplegar el build estático en Vercel, Netlify o un bucket/CDN. Configurar la variable de entorno `VITE_API_BASE_URL` en el servicio.

---

## App Móvil (carpeta: `app_movil`)

1. Instalar dependencias de Flutter

```bash
cd app_movil
flutter pub get
```

2. Configurar `api_config`

Editar `lib/services/api_config.dart`:

```dart
const String baseUrl = 'http://<BACKEND_HOST>:4000/api';
```

3. Permisos Android

Agregar en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

4. Permisos iOS

Agregar en `ios/Runner/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para mostrarte el mapa.</string>
```

5. Ejecutar en emulador o dispositivo

```bash
# Android
flutter run -d android
# iOS (macOS)
flutter run -d ios
# Web
flutter run -d web
```

6. Builds release

```bash
flutter build apk
flutter build appbundle
flutter build ios   # requiere macOS y configuración de certificados
```

---

## Almacenamiento en la nube (S3 / GCS)

- Crear bucket S3 o GCS y configurar permisos
- Añadir credenciales al `.env` del backend
- Configurar CORS para permitir orígenes del Admin Panel
- Probar subida con el endpoint `POST /api/uploads/*` o con `scripts/testS3Upload.js`

---

## Despliegue recomendado

- Backend: Docker + Docker Compose o VPS con process manager (PM2) detrás de Nginx (HTTPS)
- Admin Panel: Vercel / Netlify / CDN
- App Móvil: Play Store / App Store (gestionar signing keys / certificados)
- CI: GitHub Actions para tests y despliegues automatizados

---

## Seguridad y Operaciones

- Forzar HTTPS en producción
- Guardar secretos en gestores seguros (AWS Secrets Manager, Vault)
- Rotar `JWT_SECRET` y credenciales periódicamente
- Backups regulares de MongoDB
- Logs centralizados (CloudWatch/ELK)

---

## Troubleshooting rápido

- `ECONNREFUSED` a MongoDB: comprobar `MONGODB_URI` y que Mongo esté en ejecución
- `AccessDenied` S3: revisar IAM policy
- 401/Invalid token: comprobar `JWT_SECRET` y expiración
- Admin no conecta: verificar `VITE_API_BASE_URL` y CORS

---

## Comandos útiles (resumen)

```bash
# Clonar
git clone https://github.com/CarlosAsparrinM/HistoriAR.git

# Backend
cd backend
npm install
npm run dev

# Admin Panel
cd admin-panel
npm install
npm run dev

# App móvil
cd app_movil
flutter pub get
flutter run -d android
```

---

## Siguientes pasos

¿Necesitas que incluya además un archivo `.env.example` para cada subproyecto o que agregue instrucciones de Docker/Docker Compose?

**Autor:** Equipo HistoriAR
