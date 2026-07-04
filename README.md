# 🏛️ HistoriAR

**Plataforma de difusión de patrimonio histórico y cultural mediante Realidad Aumentada y gamificación.**

HistoriAR es un ecosistema digital compuesto por tres componentes interconectados que permiten digitalizar, gestionar y experimentar monumentos arqueológicos en Realidad Aumentada. Los visitantes de museos e instituciones culturales pueden visualizar reconstrucciones 3D de piezas históricas, recorrer rutas guiadas geolocalizadas y evaluar sus conocimientos con trivias interactivas.

---

## 📐 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                 │
│                                                                 │
│   ┌───────────────────┐       ┌───────────────────────────┐     │
│   │  📱 App Móvil     │       │  🌐 Panel Administración  │     │
│   │  Flutter / Dart   │       │  React 19 / Vite          │     │
│   │  AR + GPS + Maps  │       │  TailwindCSS + Radix UI   │     │
│   └────────┬──────────┘       └─────────────┬─────────────┘     │
└────────────┼────────────────────────────────┼───────────────────┘
             │          HTTPS / JWT           │
             ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     🖥️ BACKEND API                              │
│              Node.js + Express (Vercel Serverless)              │
│                                                                 │
│   Auth · Monuments · Tours · Quizzes · Visits · Uploads · ...   │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
      ┌─────────────────┐      ┌────────────────────┐
      │  🍃 MongoDB     │      │  ☁️ AWS S3 Bucket  │
      │  Atlas          │      │  Imágenes + GLB    │
      │  14 colecciones │      │  Presigned URLs    │
      └─────────────────┘      └────────────────────┘
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Node.js ≥18, Express 4.19, Mongoose 8.6, JWT, bcryptjs, AWS SDK v3, Multer, Helmet, CORS |
| **Admin Panel** | React 19, Vite 7, TailwindCSS 4, Radix UI, TanStack React Query 5, Recharts, React Router 7 |
| **App Móvil** | Flutter (Dart ≥3.9), ar_flutter_plugin_plus, flutter_map, geolocator, google_sign_in, model_viewer_plus, flutter_tts |
| **Base de datos** | MongoDB Atlas (NoSQL) |
| **Storage** | AWS S3 (imágenes, modelos 3D GLB/GLTF) |
| **Despliegue** | Vercel (backend serverless + admin panel) |
| **Testing** | Vitest, Supertest |

---

## 📂 Estructura del Monorepo

```
HistoriAR/
├── backend/                    # API REST (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── app.js              # Express app + CORS + middlewares
│   │   ├── server.js           # Entry point (DB, S3, Google Auth init)
│   │   ├── config/             # DB, S3, env validation
│   │   ├── controllers/        # 16 controladores
│   │   ├── models/             # 14 modelos Mongoose
│   │   ├── routes/             # 15 grupos de rutas
│   │   ├── services/           # 16 servicios de lógica de negocio
│   │   ├── middlewares/        # JWT auth + role-based access
│   │   ├── migrations/         # Scripts de migración
│   │   └── utils/              # CRUD Factory, paginación, S3 helpers
│   ├── tests/                  # Tests unitarios e integración
│   ├── scripts/                # Scripts utilitarios (S3, CORS, indexes)
│   └── api/                    # Vercel serverless handler
│
├── admin-panel/                # Panel web de administración (React + Vite)
│   └── src/
│       ├── App.jsx             # Router + providers
│       ├── components/         # 22 componentes de gestión
│       │   ├── Dashboard.jsx
│       │   ├── MonumentsManager.jsx
│       │   ├── InstitutionsManager.jsx
│       │   ├── ARExperiencesManager.jsx
│       │   ├── QuizzesManager.jsx
│       │   ├── ToursManager.jsx
│       │   └── ui/             # Componentes Radix UI
│       ├── contexts/           # Auth, Theme, Sidebar
│       ├── hooks/              # useMonuments, useQuizzes, useTours...
│       ├── services/           # ApiService singleton
│       └── utils/              # Variantes, constantes
│
├── app_movil/                  # App móvil (Flutter / Dart)
│   └── lib/
│       ├── main.dart           # Entry point
│       ├── config/             # Variables de entorno
│       ├── controllers/        # AR controller (1040 líneas)
│       ├── models/             # Monument, Tour, User, Visit, HistoricalData
│       ├── screens/            # 11 pantallas
│       ├── services/           # 16 servicios (auth, API, GPS, TTS, offline...)
│       ├── widgets/            # 17 widgets (AR, feedback, info panels)
│       ├── styles/             # AppTheme, AppColors, design tokens
│       └── utils/              # HTTP interceptor, cache manager
│
├── MANUAL_INSTALACION.md
├── MANUAL_SISTEMA.md
├── REQUERIMIENTOS_SISTEMA.md
└── STACK_TECNOLOGICO.md
```

---

## 🚀 Inicio Rápido

### Requisitos previos

- **Node.js** ≥ 18.0.0
- **Flutter** SDK ≥ 3.9.2
- **MongoDB Atlas** (cuenta y cluster configurado)
- **AWS S3** (bucket y credenciales IAM)
- **Google Cloud Console** (OAuth Client ID)

### 1. Backend

```bash
cd backend
cp .env.example .env           # Configurar variables de entorno
npm install
npm run dev                    # Inicia en http://localhost:4000
```

Variables de entorno requeridas:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<secreto_seguro>
JWT_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=us-east-1
S3_BUCKET=historiar-storage
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_CLIENT_ID=<google_client_id>
```

Scripts disponibles:

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot-reload (nodemon) |
| `npm start` | Servidor en producción |
| `npm test` | Ejecutar tests con Vitest |
| `npm run migrate` | Ejecutar migraciones |
| `npm run indexes` | Crear índices en MongoDB |
| `npm run deploy:prepare` | Check env + verify + migrate + indexes |
| `npm run setup:s3` | Configurar bucket S3 |

### 2. Admin Panel

```bash
cd admin-panel
cp .env.example .env           # Configurar URL del backend
npm install
npm run dev                    # Abre en http://localhost:5173
```

Variables de entorno:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_NODE_ENV=development
```

> ⚠️ Solo usuarios con rol `admin` pueden acceder al panel.

### 3. App Móvil

```bash
cd app_movil
cp .env.example .env           # Configurar URL del backend
flutter pub get
flutter run                    # Ejecutar en dispositivo/emulador
```

Variables de entorno:

```env
API_BASE_URL=http://localhost:4000
API_TIMEOUT=30000
ENVIRONMENT=development
AR_ENABLED=true
LOCATION_UPDATE_INTERVAL=5000
LOCATION_ACCURACY=best
GOOGLE_CLIENT_ID=<google_web_client_id>
```

Permisos requeridos en Android (`AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 🗄️ Modelo de Datos

El backend opera con **14 colecciones** en MongoDB:

| Modelo | Campos clave | Propósito |
|--------|-------------|-----------|
| **User** | name, email, password, role, status | Usuarios de la app y admins |
| **Monument** | name, location, categoryId, imageUrl, model3DUrl | Monumentos históricos con coordenadas GPS |
| **Institution** | name, type, location, schedule | Museos, universidades y sitios culturales |
| **Category** | name, icon, color | Clasificación de monumentos |
| **Culture** | name | Culturas históricas (Moche, Inca, etc.) |
| **Tour** | name, institutionId, monuments[], type | Recorridos guiados con paradas ordenadas |
| **TourSession** | userId, tourId, stopsVisited[] | Sesiones de tour en progreso |
| **Quiz** | monumentId, title, questions[] | Trivias de 3-5 preguntas por monumento |
| **QuizAttempt** | userId, quizId, answers[], percentageScore | Intentos de quiz con puntaje |
| **HistoricalData** | monumentId, title, description, imageUrl | Fichas históricas detalladas |
| **Visit** | userId, monumentId, tourId, rating | Registro de visitas a monumentos |
| **ModelVersion** | monumentId, url, s3Key, isActive, fileSize | Versiones de modelos 3D |
| **Alert** | type, severity, title, message | Alertas de integridad de datos |
| **UserPreferences** | userId, settings | Preferencias del usuario |

---

## 🔐 Autenticación y Seguridad

### Flujo de autenticación

```
┌──────────┐     POST /auth/login      ┌───────────┐
│  Cliente  │ ───────────────────────▶  │  Backend  │
│ (App/Web) │     { email, password }   │           │
│           │ ◀─────────────────────── │  bcrypt   │
│           │     { token, user }       │  verify   │
└──────────┘                           └───────────┘

┌──────────┐     POST /auth/google     ┌───────────┐     ┌──────────┐
│  Cliente  │ ───────────────────────▶  │  Backend  │ ──▶ │  Google  │
│           │     { idToken }           │           │     │  OAuth2  │
│           │ ◀─────────────────────── │  verify   │ ◀── │  verify  │
│           │     { token, user }       │  + JWT    │     │  idToken │
└──────────┘                           └───────────┘     └──────────┘
```

| Característica | Detalle |
|---------------|---------|
| Hash de passwords | bcrypt con 10 rounds |
| Tokens | JWT con expiración configurable (default 7d) |
| Login social | Google OAuth2 (verificación de idToken en servidor) |
| Middleware | `verifyToken` verifica JWT + estado del usuario en cada request |
| Roles | `user` y `admin` con middleware `requireRole(...)` |
| Estados de cuenta | Activo, Suspendido (403), Eliminado (401) |
| Seguridad HTTP | Helmet (headers), CORS configurado por orígenes |

---

## 📡 API REST — Endpoints Principales

| Ruta Base | Recurso | Operaciones |
|-----------|---------|-------------|
| `/api/auth` | Autenticación | `POST /login`, `POST /register`, `POST /google`, `GET /validate` |
| `/api/monuments` | Monumentos | CRUD + `GET /search` + `GET /stats` + model-versions |
| `/api/institutions` | Instituciones | CRUD + `GET /stats` |
| `/api/categories` | Categorías | CRUD + `GET /stats` |
| `/api/cultures` | Culturas | CRUD + `GET /stats` |
| `/api/tours` | Tours | CRUD + `GET /institution/:id` |
| `/api/quizzes` | Quizzes | CRUD + attempts |
| `/api/visits` | Visitas | `POST /` + `GET /` (historial) |
| `/api/uploads` | Media S3 | `POST /signed-url` (presigned uploads) |
| `/api/users` | Usuarios | CRUD + gestión de estados |
| `/api/location` | Ubicación | `GET /nearby` + `GET /detect-institution` |
| `/api/alerts` | Alertas | `GET /generate` + `PATCH /:id/dismiss` |
| `/api/stats` | Estadísticas | Dashboard stats |
| `/api/health` | Salud | Health check detallado |

---

## 📱 Funcionalidades de la App Móvil

### Pantallas principales

| Pantalla | Funcionalidad |
|----------|---------------|
| **Explorar** | Mapa interactivo con monumentos geolocalizados, búsqueda, filtros por distrito y cultura |
| **Cámara AR** | Visualización de modelos 3D en Realidad Aumentada con gestos de rotación, escala y fichas flotantes |
| **Mis Tours** | Tours guiados con progreso, paradas visitadas y detección automática de institución por GPS |
| **Quizzes** | Trivias interactivas con temporizador, animaciones y puntaje |
| **Perfil** | Estadísticas de visitas, historial y logros del usuario |
| **Configuración** | Preferencias de notificaciones, distancia de detección, idioma TTS, gestión de caché |

### Características AR (Realidad Aumentada)

- **Motor AR**: ARCore (Android) via `ar_flutter_plugin_plus`
- **Modelos 3D**: Carga de archivos GLB/GLTF desde AWS S3 con caché local
- **Hit Testing**: Detección de superficies reales para anclar modelos
- **Gestos**: Rotación con un dedo, escala con dos dedos (pinch)
- **Modo libre**: Colocación de modelos sin necesidad de detectar superficie
- **Fichas flotantes**: Cards de información histórica superpuestas en AR
- **Fallback**: Visor 3D alternativo para dispositivos sin soporte AR

### Soporte Offline

- Cola de visitas pendientes con auto-sincronización
- Sesión persistente en `flutter_secure_storage`
- Caché local de modelos 3D descargados

---

## 🌐 Panel de Administración

### Módulos de gestión

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Métricas de usuarios, visitas, sesiones AR y gráficos de tendencias |
| **Monumentos** | CRUD completo + subida de imágenes y modelos 3D + coordenadas GPS |
| **Instituciones** | Gestión con horarios, ubicación con radio de detección, estados |
| **Experiencias AR** | Versionado de modelos 3D por monumento con activación/desactivación |
| **Tours** | Creación de recorridos con paradas ordenadas y duración estimada |
| **Quizzes** | Editor de trivias con 3-5 preguntas y 2-4 opciones por pregunta |
| **Fichas Históricas** | Contenido detallado por monumento con imágenes y fuentes |
| **Usuarios** | Control de estados (activo/suspendido/eliminado), filtros por rol |
| **Alertas** | Panel de integridad de datos con 9 verificaciones automáticas |

### Sistema de alertas de integridad

El backend ejecuta 9 verificaciones automáticas de calidad de datos:

| Verificación | Severidad | Qué detecta |
|-------------|-----------|-------------|
| Monumentos sin GPS | 🔴 Crítica | Esencial para AR |
| Monumentos sin categoría | 🔴 Crítica | Campo requerido |
| Monumentos sin imagen | 🔴 Crítica | Sin referencia visual |
| Monumentos sin modelo 3D | 🔴 Crítica | Limita experiencia AR |
| Instituciones sin imagen | 🔴 Crítica | Sin referencia visual |
| Monumentos sin ficha histórica | 🟡 Warning | Contenido incompleto |
| Monumentos sin quizzes | 🔵 Info | Reduce engagement |
| Instituciones sin tours | 🔵 Info | Sin recorridos organizados |
| Usuarios inactivos (>80%) | 🟡 Warning | Anomalía de retención |

---

## 🧩 Patrones de Diseño Destacados

### CRUD Controller Factory

El `crudControllerFactory.js` genera controladores CRUD completos a partir de un servicio, eliminando duplicación de código en 6+ controladores:

```javascript
const crudController = createCrudController({
  service: categoryService,
  entityName: 'Categoría',
  hydrateMedia: null,
  beforeDelete: cleanupS3Files,
});
```

Incluye paginación automática, filtros por query params, hidratación de media (URLs S3), hooks pre-delete y manejo genérico de errores.

### Presigned URL Upload Flow

```
Admin/App  ──POST /uploads/signed-url──▶  Backend  ──genera──▶  Presigned URL
    │                                                               │
    │◀──────────── { presignedUrl, key } ◀──────────────────────────┘
    │
    └──── PUT directamente a S3 ──────────────────────────▶  AWS S3 Bucket
    │
    └──── Confirma upload al Backend (guarda URL y key en MongoDB)
```

---

## 🧪 Testing

```bash
# Backend — ejecutar tests
cd backend
npm test                    # Vitest run
npm run test:watch          # Vitest en modo watch
npm run test:ui             # Vitest con interfaz web

# Backend — verificar configuración
npm run check:env           # Verificar variables de entorno
npm run verify              # Verificar configuración general
npm run test:health         # Test del endpoint de salud
npm run test:s3             # Test de conexión S3
```

---

## 🚢 Despliegue

### Backend (Vercel Serverless)

```bash
cd backend
npm run deploy:prepare      # check:env + verify + migrate + indexes
# Deploy automático via Git push a Vercel
```

El archivo `api/` contiene el handler serverless. En producción, la conexión a DB se inicializa en el primer request.

### Admin Panel (Vercel)

```bash
cd admin-panel
npm run build               # Genera dist/
# Deploy automático via Git push a Vercel
```

Configuración en `vercel.json` con rewrites para SPA routing.

### App Móvil (Android)

```bash
cd app_movil
flutter build apk --release
# O para bundle de Play Store:
flutter build appbundle --release
```


---

## 👤 Autor

**Carlos Asparrín**

**Hector Perez**

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
