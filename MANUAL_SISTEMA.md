# 📚 Manual del Sistema - HistoriAR

**Versión 1.0** | **Última actualización: Mayo 2026**

---

## 📑 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Estructura de Carpetas](#estructura-de-carpetas)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Componentes Principales](#componentes-principales)
7. [Base de Datos](#base-de-datos)
8. [API RESTful](#api-restful)
9. [Autenticación y Seguridad](#autenticación-y-seguridad)
10. [Guías de Uso](#guías-de-uso)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción General

### ¿Qué es HistoriAR?

HistoriAR es un **sistema integral de gestión y visualización de monumentos históricos con realidad aumentada**. Permite a usuarios finales explorar monumentos históricos mediante una aplicación móvil, mientras que administradores pueden gestionar el contenido a través de un panel web administrativo.

### Características Principales

- 🏛️ **Gestión de Monumentos**: Crear, editar, eliminar monumentos con información detallada
- 🏫 **Gestión de Instituciones**: Administración de museos, universidades y organizaciones afines
- 🗺️ **Geolocalización**: Detectar ubicación del usuario y mostrar monumentos cercanos
- 🎮 **Realidad Aumentada**: Visualizar modelos 3D de monumentos en AR
- 📚 **Tours Guiados**: Crear rutas temáticas con múltiples monumentos
- 🧩 **Sistema de Quizzes**: Tests educativos asociados a monumentos
- 📊 **Analytics**: Dashboard con estadísticas de uso y visitas
- 🔐 **Control de Roles**: Diferenciación entre usuarios normales y administradores

### Público Objetivo

- **Usuarios Móviles**: Visitantes que desean explorar monumentos históricos
- **Administradores**: Personal de museos e instituciones que gestiona contenido
- **Instituciones**: Museos, universidades y organizaciones culturales

---

## 💻 Stack Tecnológico

### Backend API

```
Runtime & Lenguaje
├── Node.js >= 18.0.0
└── JavaScript ES6+

Framework & Base de Datos
├── Express.js ^4.19.2
├── MongoDB 6.0+
└── Mongoose ^8.6.0 (ODM)

Almacenamiento en la Nube
├── AWS S3 / Google Cloud Storage
└── @aws-sdk/client-s3 ^3.946.0

Autenticación & Seguridad
├── jsonwebtoken ^9.0.2
├── bcryptjs ^2.4.3
├── helmet ^7.1.0
├── cors ^2.8.5
└── express-validator ^7.2.1

Utilerías
├── dotenv ^16.4.5
├── multer ^1.4.5-lts.1
├── uuid ^13.0.0
├── morgan ^1.10.0
└── nodemon ^3.1.0

Testing
├── Vitest ^1.0.0
├── @vitest/ui ^1.0.0
└── supertest ^6.3.3
```

### Admin Panel (Frontend Web)

```
Framework & Build
├── React ^19.1.1
└── Vite ^7.1.7

Enrutamiento & Estado
├── React Router DOM ^7.10.1
└── Context API (estado global)

Estilos & UI
├── Tailwind CSS ^4.1.14
├── Radix UI (componentes accesibles)
├── Lucide React ^0.546.0 (iconos)
└── Recharts ^3.3.0 (gráficos)

Utilerías
├── clsx ^2.1.1
├── tailwind-merge ^3.3.1
├── sonner ^2.0.7 (notificaciones)
└── next-themes ^0.4.6 (tema oscuro/claro)
```

### App Móvil (Flutter)

```
Framework
├── Flutter SDK >= 3.9.2

Dependencias Principales
├── http ^1.6.0 (peticiones HTTP)
├── flutter_map ^8.2.2 (mapas)
├── geolocator ^14.0.2 (ubicación)
├── ar_flutter_plugin_plus ^1.0.0 (AR)
├── shared_preferences ^2.2.0 (almacenamiento local)
└── flutter_launcher_icons ^0.14.4 (iconos)
```

---

## 🏗️ Arquitectura del Sistema

### Diagrama General

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIOS FINALES                      │
└──────────────┬──────────────────┬──────────────────────────┘
               │                  │
         ┌─────▼─────┐      ┌─────▼──────┐
         │  APP MÓVIL │      │  ADMIN PANEL │
         │  (Flutter) │      │  (React/Vite)│
         └─────┬─────┘      └─────┬──────┘
               │                  │
               └──────────┬───────┘
                          │
                 ┌────────▼────────┐
                 │  BACKEND API    │
                 │ (Node/Express)  │
                 └────────┬────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    ┌───▼───┐       ┌────▼─────┐    ┌─────▼──┐
    │MongoDB │       │  AWS S3  │    │ Cloud  │
    │        │       │  / GCS   │    │Storage │
    └────────┘       └──────────┘    └────────┘
```

### Patrones Arquitectónicos

1. **MVC** (Backend): Modelos, Controladores, Vistas
2. **REST API**: Comunicación via HTTP/JSON
3. **JWT**: Autenticación stateless
4. **Middleware Pipeline**: Validación, autenticación, logging
5. **ODM (Mongoose)**: Mapeo objeto-documento

---

## 📁 Estructura de Carpetas

### Backend

```
backend/
├── src/
│   ├── config/              # Configuraciones globales
│   │   ├── db.js           # Conexión MongoDB
│   │   ├── s3.js           # Configuración AWS S3
│   │   └── validateEnv.js  # Validación de variables
│   │
│   ├── controllers/         # Lógica de rutas
│   │   ├── authController.js
│   │   ├── monumentsController.js
│   │   ├── institutionsController.js
│   │   ├── categoriesController.js
│   │   ├── toursController.js
│   │   ├── quizzesController.js
│   │   ├── usersController.js
│   │   ├── locationController.js
│   │   └── historicalDataController.js
│   │
│   ├── models/              # Esquemas Mongoose
│   │   ├── User.js
│   │   ├── Monument.js
│   │   ├── Institution.js
│   │   ├── Category.js
│   │   ├── Tour.js
│   │   ├── Quiz.js
│   │   ├── QuizAttempt.js
│   │   ├── Visit.js
│   │   ├── ModelVersion.js
│   │   ├── HistoricalData.js
│   │   └── UserPreferences.js
│   │
│   ├── routes/              # Definición de endpoints
│   │   ├── auth.routes.js
│   │   ├── monuments.routes.js
│   │   ├── institutions.routes.js
│   │   ├── categories.routes.js
│   │   ├── tours.routes.js
│   │   ├── quizzes.routes.js
│   │   ├── users.routes.js
│   │   ├── location.routes.js
│   │   ├── uploads.routes.js
│   │   ├── visits.routes.js
│   │   ├── historicalData.routes.js
│   │   └── health.routes.js
│   │
│   ├── middlewares/         # Middlewares personalizados
│   │   ├── auth.js         # Verificación JWT
│   │   ├── roleCheck.js    # Verificación de roles
│   │   ├── upload.js       # Configuración Multer
│   │   └── errorHandler.js # Manejo de errores
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── s3Service.js    # Operaciones S3
│   │   ├── tourService.js
│   │   ├── quizService.js
│   │   ├── locationService.js
│   │   └── tiles3DService.js
│   │
│   ├── migrations/          # Scripts de migración
│   │   ├── addLocationToInstitutions.js
│   │   ├── migrateQuizStructure.js
│   │   └── migrateGCSStructure.js
│   │
│   ├── utils/               # Funciones auxiliares
│   │   ├── haversine.js    # Cálculo de distancias
│   │   └── validators.js
│   │
│   ├── app.js              # Configuración Express
│   └── server.js           # Punto de entrada
│
├── api/
│   └── index.js            # Entry point para Vercel
│
├── scripts/                # Scripts de utilidad
│   ├── verifyConfig.js
│   ├── runMigrations.js
│   ├── createIndexes.js
│   ├── configureCORS.js
│   └── testS3Upload.js
│
├── tests/                  # Tests automatizados
│   ├── setup.js
│   └── routes/
│
├── package.json
├── vitest.config.js
└── README.md
```

### Admin Panel

```
admin-panel/
├── src/
│   ├── components/          # Componentes React
│   │   ├── LoginForm.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AppSidebar.jsx
│   │   ├── MonumentsManager.jsx
│   │   ├── InstitutionsManager.jsx
│   │   ├── CategoriesManager.jsx
│   │   ├── ToursManager.jsx
│   │   ├── QuizzesManager.jsx
│   │   ├── UsersManager.jsx
│   │   ├── ARExperiencesManager.jsx
│   │   ├── AnalyticsView.jsx
│   │   ├── HistoricalDataManager.jsx
│   │   └── ui/             # Componentes shadcn/ui
│   │
│   ├── contexts/            # Context API
│   │   └── AuthContext.jsx
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.js
│   │   └── useApi.js
│   │
│   ├── services/            # Servicios API
│   │   ├── authService.js
│   │   ├── monumentService.js
│   │   ├── institutionService.js
│   │   ├── categoryService.js
│   │   ├── tourService.js
│   │   ├── quizService.js
│   │   └── userService.js
│   │
│   ├── utils/               # Utilidades
│   │   └── api.js          # Cliente HTTP
│   │
│   ├── styles/              # Estilos CSS/Tailwind
│   │   └── globals.css
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── public/
├── package.json
├── vite.config.js
├── vercel.json
└── eslint.config.js
```

### App Móvil

```
app_movil/
├── lib/
│   ├── main.dart           # Punto de entrada
│   │
│   ├── screens/            # Pantallas
│   │   ├── login_screen.dart
│   │   ├── auth_gate.dart
│   │   ├── main_scaffold.dart
│   │   ├── explore_screen.dart
│   │   ├── ar_camera_screen.dart
│   │   ├── profile_screen.dart
│   │   ├── configuration_screen.dart
│   │   ├── my_tour_screen.dart
│   │   └── quiz_screen.dart
│   │
│   ├── services/           # Servicios API
│   │   ├── api_config.dart
│   │   ├── auth_service.dart
│   │   ├── user_service.dart
│   │   ├── monuments_service.dart
│   │   ├── tours_service.dart
│   │   ├── quiz_service.dart
│   │   ├── location_service.dart
│   │   ├── visits_service.dart
│   │   └── preferences_service.dart
│   │
│   ├── models/             # Modelos de datos
│   │   ├── user.dart
│   │   ├── user_preferences.dart
│   │   ├── monument.dart
│   │   ├── tour.dart
│   │   ├── quiz.dart
│   │   └── historical_data.dart
│   │
│   ├── widgets/            # Componentes reutilizables
│   │   ├── custom_widgets.dart
│   │   └── ar_viewer.dart
│   │
│   ├── contexts/           # Contextos de estado
│   │   └── user_context.dart
│   │
│   └── utils/              # Utilidades
│       └── constants.dart
│
├── assets/
│   └── icon/               # Iconos de la app
│
├── android/                # Configuración Android
├── ios/                    # Configuración iOS
├── windows/                # Configuración Windows
├── macos/                  # Configuración macOS
├── linux/                  # Configuración Linux
├── web/                    # Configuración Web
│
├── test/
│   └── widget_test.dart
│
├── pubspec.yaml
├── analysis_options.yaml
├── flutter_launcher_icons.yaml
└── README.md
```

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** o **yarn**
- **MongoDB** 6.0+ (local o Atlas)
- **Flutter SDK** >= 3.9.2 (para la app móvil)
- **Git**
- **Credenciales AWS** (para S3 u otra solución de almacenamiento)

### Backend

#### 1. Instalación

```bash
cd backend
npm install
```

#### 2. Configuración de Variables de Entorno

Crear archivo `.env`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/historiar

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=nombre-tu-bucket

# Server
PORT=4000
NODE_ENV=development

# Almacenamiento (opcional)
STORAGE_TYPE=s3  # s3 o gcs

# Email (opcional)
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_app

# Google Cloud Storage (opcional)
GCS_PROJECT_ID=tu_proyecto
GCS_BUCKET_NAME=tu_bucket
GCS_CREDENTIALS=/ruta/a/credentials.json
```

#### 3. Iniciar Base de Datos

```bash
# Crear índices
npm run indexes

# Ejecutar migraciones
npm run migrate

# Verificar configuración
npm run verify
```

#### 4. Iniciar el Servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run start
```

El servidor estará disponible en `http://localhost:4000`

### Admin Panel

#### 1. Instalación

```bash
cd admin-panel
npm install
```

#### 2. Configuración de Variables de Entorno

Crear archivo `.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_NODE_ENV=development
```

#### 3. Iniciar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

#### 4. Build para Producción

```bash
npm run build
npm run preview
```

### App Móvil

#### 1. Instalación

```bash
cd app_movil
flutter pub get
```

#### 2. Configuración de Ubicación

**Android** (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**iOS** (`ios/Runner/Info.plist`):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para mostrarte el mapa.</string>
```

#### 3. Configuración de API

Editar `lib/services/api_config.dart`:

```dart
const String baseUrl = 'http://localhost:4000/api';
```

#### 4. Iniciar la Aplicación

```bash
# Android
flutter run -d android

# iOS
flutter run -d ios

# Web
flutter run -d web
```

---

## 📊 Componentes Principales

### Backend

#### Controllers

Los controladores manejan la lógica de las solicitudes HTTP:

- **AuthController**: Registro, login, refresh token
- **MonumentsController**: CRUD de monumentos
- **InstitutionsController**: Gestión de instituciones
- **CategoriesController**: Categorías de monumentos
- **ToursController**: Rutas temáticas
- **QuizzesController**: Tests educativos
- **UsersController**: Gestión de usuarios
- **LocationController**: Geolocalización

#### Services

Capas de lógica de negocio:

- **S3Service**: Operaciones de almacenamiento en la nube
- **TourService**: Lógica de tours
- **QuizService**: Cálculo de puntajes
- **LocationService**: Cálculos de distancia y geolocalización

### Admin Panel

#### Componentes Principales

- **LoginForm**: Autenticación de administradores
- **Dashboard**: Página principal con analíticas
- **MonumentsManager**: Gestión CRUD de monumentos
- **InstitutionsManager**: Administración de instituciones
- **CategoriesManager**: Gestión de categorías
- **ToursManager**: Creación y edición de tours
- **QuizzesManager**: Gestión de quizzes
- **UsersManager**: Administración de usuarios
- **AnalyticsView**: Estadísticas y reportes

#### Contexts

- **AuthContext**: Manejo de autenticación y usuario actual

#### Services

- **authService**: Login, logout, validación de tokens
- **monumentService**: API de monumentos
- **tourService**: API de tours
- **quizService**: API de quizzes

### App Móvil

#### Pantallas Principales

- **LoginScreen**: Autenticación
- **ExploreScreen**: Mapa y exploración
- **ARCameraScreen**: Visualización en realidad aumentada
- **ProfileScreen**: Perfil del usuario
- **ConfigurationScreen**: Preferencias
- **MyTourScreen**: Tours guardados
- **QuizScreen**: Quizzes

#### Services

- **UserService**: Datos del perfil
- **MonumentsService**: Listado de monumentos
- **ToursService**: Rutas disponibles
- **QuizService**: Quizzes
- **PreferencesService**: Preferencias del usuario

---

## 🗄️ Base de Datos

### Modelos Principales

#### User

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hasheado),
  role: String enum ['user', 'admin'],
  avatarUrl: String,
  district: String,
  status: String enum ['Activo', 'Suspendido', 'Eliminado'],
  createdAt: Date,
  updatedAt: Date
}
```

#### Monument

```javascript
{
  _id: ObjectId,
  name: String,
  description: String (indexado para búsqueda de texto),
  categoryId: ObjectId (ref: Category),
  location: {
    lat: Number,
    lng: Number,
    address: String,
    district: String
  },
  period: {
    name: String,
    isIdentified: Boolean,
    startYear: Number,
    endYear: Number
  },
  discovery: {
    isDateKnown: Boolean,
    discoveredAt: Date,
    isDiscovererKnown: Boolean,
    discovererName: String
  },
  culture: String,
  imageUrl: String,
  s3ImageKey: String,
  model3DUrl: String,
  s3ModelKey: String,
  institutionId: ObjectId (ref: Institution),
  status: String enum ['Disponible', 'Oculto', 'Borrado'],
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

#### Institution

```javascript
{
  _id: ObjectId,
  name: String,
  type: String enum ['Museo', 'Universidad', 'Municipalidad', 'Otro'],
  description: String,
  imageUrl: String,
  contact: {
    email: String,
    phone: String,
    website: String
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    district: String
  },
  coverageRadius: Number (en metros),
  schedule: {
    lunes: { open: String, close: String },
    martes: { open: String, close: String },
    // ... resto de días
  },
  status: String enum ['Disponible', 'Oculto', 'Borrado'],
  createdAt: Date,
  updatedAt: Date
}
```

#### Tour

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  institutionId: ObjectId (ref: Institution),
  type: String enum ['Recomendado', 'Cronológico', 'Temático', ...],
  monuments: [
    {
      monumentId: ObjectId,
      order: Number,
      description: String
    }
  ],
  estimatedDurationMinutes: Number,
  status: String enum ['Activo', 'Inactivo'],
  createdAt: Date,
  updatedAt: Date
}
```

#### Quiz

```javascript
{
  _id: ObjectId,
  monumentId: ObjectId (ref: Monument),
  title: String,
  description: String,
  questions: [
    {
      text: String,
      options: [
        {
          text: String,
          isCorrect: Boolean,
          explanation: String
        }
      ]
    }
  ],
  status: String enum ['Activo', 'Inactivo'],
  createdAt: Date,
  updatedAt: Date
}
```

#### Visit

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  monumentId: ObjectId (ref: Monument),
  timestamp: Date,
  duration: Number (segundos),
  createdAt: Date
}
```

### Índices

Se han creado índices para optimizar consultas frecuentes:

```javascript
// Monument
db.monuments.createIndex({ name: 'text', description: 'text' });
db.monuments.createIndex({ status: 1, categoryId: 1 });
db.monuments.createIndex({ status: 1, 'location.district': 1 });
db.monuments.createIndex({ status: 1, institutionId: 1 });

// User
db.users.createIndex({ email: 1 });

// Tour
db.tours.createIndex({ institutionId: 1, status: 1 });

// Quiz
db.quizzes.createIndex({ monumentId: 1 });

// Visit
db.visits.createIndex({ userId: 1, monumentId: 1 });
db.visits.createIndex({ createdAt: 1 });
```

---

## 🔌 API RESTful

### Autenticación

```
POST   /api/auth/register       # Registro de usuario
POST   /api/auth/login          # Inicio de sesión
POST   /api/auth/refresh        # Refresh token
POST   /api/auth/logout         # Cierre de sesión
```

### Monumentos

```
GET    /api/monuments           # Listar monumentos
POST   /api/monuments           # Crear monumento (admin)
GET    /api/monuments/:id       # Obtener detalle
PUT    /api/monuments/:id       # Actualizar (admin)
DELETE /api/monuments/:id       # Eliminar (admin)
GET    /api/monuments/search    # Búsqueda de texto
```

### Instituciones

```
GET    /api/institutions        # Listar instituciones
POST   /api/institutions        # Crear institución (admin)
GET    /api/institutions/:id    # Obtener detalle
PUT    /api/institutions/:id    # Actualizar (admin)
DELETE /api/institutions/:id    # Eliminar (admin)
```

### Categorías

```
GET    /api/categories          # Listar categorías
POST   /api/categories          # Crear categoría (admin)
PUT    /api/categories/:id      # Actualizar (admin)
DELETE /api/categories/:id      # Eliminar (admin)
```

### Tours

```
GET    /api/tours               # Listar tours
POST   /api/tours               # Crear tour (admin)
GET    /api/tours/:id           # Obtener detalle
PUT    /api/tours/:id           # Actualizar (admin)
DELETE /api/tours/:id           # Eliminar (admin)
GET    /api/tours/institution/:id # Tours por institución
```

### Quizzes

```
GET    /api/quizzes             # Listar quizzes
POST   /api/quizzes             # Crear quiz (admin)
GET    /api/quizzes/:id         # Obtener detalle
PUT    /api/quizzes/:id         # Actualizar (admin)
DELETE /api/quizzes/:id         # Eliminar (admin)
POST   /api/quizzes/:id/attempt # Registrar intento
GET    /api/quizzes/:id/stats   # Estadísticas
```

### Usuarios

```
GET    /api/users               # Listar usuarios (admin)
GET    /api/users/me            # Obtener perfil actual
GET    /api/users/:id           # Obtener usuario (admin)
PUT    /api/users/:id           # Actualizar perfil
GET    /api/users/:id/preferences # Obtener preferencias
PUT    /api/users/:id/preferences # Actualizar preferencias
```

### Ubicación & Geolocalización

```
GET    /api/location/nearest-institution  # Institución más cercana
GET    /api/location/nearby-monuments     # Monumentos cercanos
GET    /api/location/nearby-tours         # Tours disponibles
```

### Carga de Archivos

```
POST   /api/uploads/image       # Subir imagen
POST   /api/uploads/model3d     # Subir modelo 3D
DELETE /api/uploads/image/:key  # Eliminar imagen
DELETE /api/uploads/model3d/:key # Eliminar modelo 3D
```

### Visitas

```
POST   /api/visits              # Registrar visita
GET    /api/visits/user/:userId # Historial de visitas
GET    /api/visits/monument/:monumentId # Estadísticas de visitas
```

---

## 🔐 Autenticación y Seguridad

### Flujo de Autenticación

#### Registro

```
1. Usuario envía: { name, email, password }
2. Backend valida datos
3. Contraseña se encripta con bcryptjs
4. Usuario se guarda en MongoDB
5. Response: { userId, token }
```

#### Login

```
1. Usuario envía: { email, password }
2. Backend busca usuario por email
3. Se compara contraseña con bcryptjs
4. Se genera JWT token (válido 7 días)
5. Response: { userId, token, user }
```

#### Validación de Tokens

```
1. Cliente envía token en header: Authorization: Bearer <token>
2. Middleware verifica firma del token
3. Si válido, se extrae userId y se continúa
4. Si inválido, responde 401 Unauthorized
```

### Niveles de Seguridad

#### 1. Validación de Entrada

```javascript
// express-validator
check('email').isEmail();
check('password').isLength({ min: 8 });
check('name').trim().notEmpty();
```

#### 2. Encriptación de Contraseñas

```javascript
// bcryptjs
const hashedPassword = await bcrypt.hash(password, 10);
```

#### 3. JWT Tokens

```javascript
// jsonwebtoken
const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
  expiresIn: '7d',
});
```

#### 4. CORS (Cross-Origin Resource Sharing)

```javascript
cors({
  origin: ['http://localhost:5173', 'https://admin.historiar.com'],
  credentials: true,
});
```

#### 5. Helmet (Seguridad HTTP Headers)

```javascript
helmet(); // Añade headers de seguridad
```

#### 6. Rate Limiting (Admin Panel)

```
Máximo: 5 intentos de login
Bloqueo: 5 minutos después de 5 fallos
```

#### 7. Control de Roles

```javascript
// Solo admin puede crear monumentos
POST /api/monuments → requireAuth → requireAdmin → crear
```

#### 8. Soft Delete

```javascript
// No se eliminan datos, se marcan como "Borrado"
status: 'Borrado'; // No se muestran en consultas normales
```

### Mejores Prácticas Implementadas

✅ Hash de contraseñas con bcryptjs
✅ JWT para autenticación stateless
✅ CORS configurado restrictivamente
✅ Helmet para headers HTTP seguros
✅ Validación en servidor (express-validator)
✅ Rate limiting en login del admin
✅ Tokens con expiración
✅ Control de roles (user vs admin)
✅ Variables de entorno para secretos
✅ Soft delete para datos

### Pendiente (Para Producción)

⏳ Implementar Refresh Tokens
⏳ HTTPS obligatorio
⏳ Almacenamiento seguro de tokens (flutter_secure_storage)
⏳ 2FA (Two-Factor Authentication)
⏳ OAuth2 (Google, Facebook)
⏳ IP Whitelisting

---

## 📖 Guías de Uso

### 1. Crear un Monumento

#### Vía Admin Panel

1. Navegar a **Gestión > Monumentos**
2. Hacer clic en **+ Nuevo Monumento**
3. Llenar formulario:
   - Nombre
   - Descripción
   - Categoría
   - Ubicación (lat/lng)
   - Período histórico
   - Cultura
4. Subir imagen y modelo 3D
5. Asociar institución
6. Hacer clic en **Guardar**

#### Vía API

```bash
curl -X POST http://localhost:4000/api/monuments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Machu Picchu",
    "description": "Ciudad inca antigua",
    "categoryId": "507f1f77bcf86cd799439011",
    "location": {
      "lat": -13.1631,
      "lng": -72.5450,
      "district": "Cusco"
    },
    "period": { "name": "Siglo XV" },
    "culture": "Inca",
    "institutionId": "507f1f77bcf86cd799439012"
  }'
```

### 2. Crear un Tour

#### Vía Admin Panel

1. Navegar a **Gestión > Tours**
2. Hacer clic en **+ Nuevo Tour**
3. Llenar información básica:
   - Nombre
   - Tipo (Cronológico, Temático, etc.)
   - Institución
4. Añadir monumentos en orden
5. Opcionalmente agregar descripciones personalizadas
6. Hacer clic en **Guardar**

#### Vía API

```bash
curl -X POST http://localhost:4000/api/tours \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tour del Centro Histórico",
    "description": "Recorrido por monumentos coloniales",
    "institutionId": "507f1f77bcf86cd799439012",
    "type": "Cronológico",
    "monuments": [
      { "monumentId": "507f1f77bcf86cd799439013", "order": 1 },
      { "monumentId": "507f1f77bcf86cd799439014", "order": 2 }
    ],
    "estimatedDurationMinutes": 90
  }'
```

### 3. Crear un Quiz

#### Vía Admin Panel

1. Navegar a **Gestión > Quizzes**
2. Hacer clic en **+ Nuevo Quiz**
3. Seleccionar monumento asociado
4. Agregar 3-5 preguntas:
   - Texto de pregunta
   - 2-4 opciones
   - Marcar opción correcta
   - Agregar explicación (opcional)
5. Hacer clic en **Guardar**

#### Estructura de Quiz

```javascript
{
  "monumentId": "507f1f77bcf86cd799439013",
  "title": "Quiz Machu Picchu",
  "questions": [
    {
      "text": "¿En qué siglo fue construido?",
      "options": [
        { "text": "Siglo XIV", "isCorrect": false },
        { "text": "Siglo XV", "isCorrect": true, "explanation": "Construido aprox. 1450" },
        { "text": "Siglo XVI", "isCorrect": false }
      ]
    }
  ]
}
```

### 4. Gestionar Usuarios (Admin)

#### Operaciones

- **Listar usuarios**: `GET /api/users`
- **Cambiar estado**: `PUT /api/users/:id` → `status: 'Suspendido'`
- **Ver estadísticas**: `GET /api/users/:id/stats`

#### Estados Disponibles

- `Activo`: Usuario puede usar la aplicación
- `Suspendido`: Usuario no puede acceder
- `Eliminado`: Soft delete, no visible

### 5. Usar la App Móvil

#### Login

```
1. Abrir app
2. Ingresar email y contraseña
3. Tocarse "Iniciar Sesión"
4. La app redirige a Explorar
```

#### Explorar Monumentos

```
1. En "Explorar" se muestra un mapa de Lima
2. Iconos azules = monumentos disponibles
3. Tocar un monumento para ver detalles
4. Botón "Ver en AR" abre la cámara
```

#### Ver en Realidad Aumentada

```
1. La app abre la cámara del dispositivo
2. El modelo 3D aparece en la pantalla
3. Se puede rotar con gestos
4. Acercarse/alejarse con pellizco
```

#### Hacer un Quiz

```
1. En detalles del monumento, sección "Quiz"
2. Leer preguntas y seleccionar respuestas
3. Ver puntaje al finalizar
4. Opcionalmente repetir
```

#### Guardar Tours

```
1. En "Mis Tours" ver tours disponibles
2. Tocar uno para ver monumentos
3. Seguir la ruta indicada
4. Visitas se registran automáticamente
```

---

## ⚠️ Troubleshooting

### Backend no conecta a MongoDB

**Error**: `MongooseError: connection refused`

**Solución**:

1. Verificar MongoDB está ejecutándose: `mongosh`
2. Revisar `MONGODB_URI` en `.env`
3. Verificar credenciales y red
4. Para Atlas: permitir IP en firewall

```bash
# Verificar conexión
npm run verify
```

### AWS S3 - Acceso denegado

**Error**: `AccessDenied: User: arn:aws:iam::... is not authorized`

**Solución**:

1. Verificar `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`
2. Revisar permisos IAM en AWS Console
3. Verificar bucket CORS está configurado

```bash
# Verificar S3
npm run test:s3
npm run cors:check
```

### Admin Panel no conecta al Backend

**Error**: `Network error: ECONNREFUSED 127.0.0.1:4000`

**Solución**:

1. Verificar backend está corriendo: `npm run dev` en carpeta backend
2. Revisar `VITE_API_BASE_URL` en `.env` del admin panel
3. Asegurarse CORS está habilitado en backend

```bash
# Verificar endpoints
curl http://localhost:4000/api/health
```

### App móvil no obtiene ubicación

**Error**: `Location permission denied` o `No location updates`

**Solución (Android)**:

1. Ir a Configuración > Permisos > Ubicación
2. Permitir para "HistoriAR"
3. En emulador: Android Studio > Extended Controls > Location

**Solución (iOS)**:

1. Ir a Configuración > Privacidad > Ubicación
2. Permitir "HistoriAR"
3. En simulador: Simulador > Features > Location > Custom

### Modelo 3D no carga en AR

**Error**: `Failed to load model` o modelo no aparece

**Solución**:

1. Verificar archivo GLB/GLTF es válido
2. Comprobar URL en S3 está accesible
3. Revisar que modelo3DUrl existe en monumento
4. Probar en navegador: pegar URL en buscador

### Login devuelve 401 Unauthorized

**Error**: `JWT token invalid` o `Invalid credentials`

**Solución**:

1. Verificar `JWT_SECRET` es igual en servidor y cliente
2. Revisar token no está expirado
3. Borrar cache/cookies del navegador
4. Probar credenciales en Base de Datos

```javascript
// Verificar token en backend
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log(decoded);
```

### Migraciones fallan

**Error**: `Migration failed` o `Index creation failed`

**Solución**:

1. Verificar MongoDB está conectado
2. Borrar colecciones antiguas si es necesario
3. Ejecutar manualmente en orden

```bash
npm run migrate
npm run migrate:institutions
npm run migrate:quizzes
npm run indexes
```

### App móvil lenta o se congela

**Causas comunes**:

- API del backend lenta
- Modelo 3D muy pesado
- Muchas consultas a la vez

**Soluciones**:

1. Optimizar modelo 3D (reducir polígonos)
2. Implementar paginación en listas
3. Cachear respuestas con SharedPreferences
4. Usar lazy loading

### Tests fallan

```bash
# Ejecutar tests con más verbosidad
npm run test -- --reporter=verbose

# Ver UI interactiva
npm run test:ui
```

---

## 📞 Soporte y Contacto

Para reportar problemas o sugerencias:

- **GitHub Issues**: [Crear issue](https://github.com/CarlosAsparrinM/HistoriAR/issues)
- **Email**: carlos.asparrin@example.com
- **Documentación**: Ver carpeta `docs/`

---

## 📝 Changelog

### Versión 1.0 (Mayo 2026)

- ✅ Backend API completo
- ✅ Admin Panel funcional
- ✅ App Móvil con AR
- ✅ Integración completa
- ✅ Documentación sistema

---

## 📄 Licencia

Este proyecto está bajo licencia **MIT**. Ver archivo `LICENSE` para más detalles.

---

## 👥 Equipo

- **Desarrollador Principal**: Carlos Asparrín
- **Documentación**: Sistema HistoriAR
- **Fecha**: Mayo 2026

---

**Última actualización**: 10 de Mayo de 2026
