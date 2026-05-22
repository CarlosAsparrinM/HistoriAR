# Auditoría de APIs Tours - Backend ↔ Mobile

**Fecha**: 21 de mayo, 2026
**Status**: Análisis completado

---

## 1. Estructura de Tours (Backend)

### 1.1 Modelo Tour

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: enum['Recomendado', 'Cronológico', 'Temático', 'Arquitectónico', 'Familiar', 'Experto', 'Rápido', 'Completo'],
  monuments: [
    {
      monumentId: ObjectId (ref: Monument),
      order: Number,
      description: String (opcional, descripción específica del parada en este tour)
    }
  ],
  estimatedDuration: Number (minutos),
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: User),
  institutionId: ObjectId (ref: Institution),
  createdAt: Date,
  updatedAt: Date
}
```

### 1.2 Rutas API Backend

| Método | Endpoint                                | Auth  | Descripción                                                        |
| ------ | --------------------------------------- | ----- | ------------------------------------------------------------------ |
| GET    | `/api/tours`                            | No    | Listar todos los tours (con filtros isActive, type, institutionId) |
| GET    | `/api/tours/:id`                        | No    | Obtener tour por ID (incluye monuments poblados)                   |
| GET    | `/api/tours/institution/:institutionId` | No    | Listar tours de una institución (default: activos)                 |
| POST   | `/api/tours`                            | Admin | Crear nuevo tour                                                   |
| PUT    | `/api/tours/:id`                        | Admin | Actualizar tour                                                    |
| DELETE | `/api/tours/:id`                        | Admin | Eliminar tour                                                      |

---

## 2. Implementación Mobile (Flutter)

### 2.1 Modelo Tour

```dart
class TourItem {
  final String id;
  final String name;
  final String description;
  final String type;
  final int estimatedDuration;
  final bool isActive;
  final TourInstitution? institution;
  final List<TourStop> stops;  // monuments ordenados

  List<TourStop> get orderedStops =>
    List.from(stops)..sort((a, b) => a.order.compareTo(b.order));
}

class TourStop {
  final int order;
  final String? description;  // Descripción para esta parada
  final Monument monument;
}
```

### 2.2 ToursService (Flutter)

```dart
Future<TourContextResponse> getContextForLocation({
  required double latitude,
  required double longitude,
})
// Endpoint: GET /api/location/context?lat=...&lng=...

Future<List<TourItem>> getAllTours({ bool activeOnly = true })
// Endpoint: GET /api/tours?isActive=true

Future<List<TourItem>> getToursByInstitution(
  String institutionId,
  { bool activeOnly = true }
)
// Endpoint: GET /api/tours/institution/:id?activeOnly=true
```

### 2.3 MyTourScreen (Flutter)

**Flujo actual:**

1. Obtiene ubicación actual con Geolocator
2. Llama `getContextForLocation()` → obtiene tours cercanos + institución
3. Si falla o no hay tours, llama `getAllTours()`
4. Muestra lista de tours, permite seleccionar uno
5. Para cada parada (TourStop):
   - Botón AR Camera → abre `ArCameraScreen`
   - Botón Quiz → abre `QuizScreen`
   - Búsqueda por nombre/descripción

---

## 3. Comparativa & Issues Encontrados

| Aspecto                   | Backend                              | Mobile                                  | Status      | Issue                                            |
| ------------------------- | ------------------------------------ | --------------------------------------- | ----------- | ------------------------------------------------ |
| **Listar tours**          | ✅ GET /api/tours                    | ✅ ToursService.getAllTours()           | OK          | -                                                |
| **Tours por institución** | ✅ GET /api/tours/institution/:id    | ✅ ToursService.getToursByInstitution() | OK          | -                                                |
| **Tours por ubicación**   | ✅ GET /api/location/context         | ✅ ToursService.getContextForLocation() | OK          | -                                                |
| **Obtener tour detalles** | ✅ GET /api/tours/:id                | ❌ No implementado                      | **MISSING** | No hay método para obtener detalles de un tour   |
| **Obtener tour detalles** | ✅ GET /api/tours/:id                | ✅ `ToursService.getTourById()`         | OK          | Detalles completos disponibles                   |
| **Iniciar tour**          | ✅ POST /api/tours/:id/start         | ✅ UI + API                             | OK          | Se creó `TourSession` y botón iniciar en móvil   |
| **Tour progress**         | ✅ `TourSession` + visits sync       | ✅ Parcial (UI no mostrada aún)         | PARTIAL     | Paradas se registran en `TourSession` al visitar |
| **Finalizar tour**        | ✅ POST /api/tours/sessions/:id/stop | ✅ UI (botón finalizar)                 | OK          | Se puede finalizar sesión y calcular duración    |
| **Tour rating**           | ✅ POST /api/tours/sessions/:id/rate | ✅ API, UI pendiente                    | PARTIAL     | Backend permite calificar, móvil sin formulario  |
| **Visit tracking**        | ✅ POST /api/visits                  | ✅ Usado indirectamente                 | PARTIAL     | Se registra visita de monumento, pero no de tour |

---

## 4. Gaps & Recomendaciones

### 4.1 Gap 1: Falta obtener detalles de un tour

**Problema:** Mobile puede mostrar lista de tours pero no puede obtener detalles completos.

**Recomendación:**

```javascript
// Backend: Ya existe GET /api/tours/:id - retorna tour completo con monumentos poblados
// Mobile: Crear método en ToursService
Future<TourItem> getTourById(String tourId) async {
  final uri = Uri.parse('${Environment.apiBaseUrl}/api/tours/$tourId');
  final response = await http.get(uri);
  // ...
  return TourItem.fromJson(data);
}
```

### 4.2 Gap 2: No hay tracking de "inicio de tour"

**Problema:** No se sabe cuándo un usuario comienza a seguir un tour.

**Recomendación (2 opciones):**

**Opción A: Crear modelo TourSession (completo)**

```javascript
// Backend - Nuevo modelo TourSession
{
  _id: ObjectId,
  userId: ObjectId,
  tourId: ObjectId,
  institutionId: ObjectId,
  startedAt: Date,
  completedAt: Date (null si activo),
  stopsVisited: [
    {
      monumentId: ObjectId,
      visitedAt: Date,
      duration: Number (minutos)
    }
  ],
  totalDuration: Number (minutos),
  rating: Number (1-5)
}

// APIs
POST /api/tours/:id/start → crear TourSession
POST /api/tours/sessions/:sessionId/stop → finalizar TourSession
POST /api/tours/sessions/:sessionId/rate → calificar tour
GET /api/users/me/tour-sessions → historial de tours del usuario
```

**Opción B: Extender Visit model (simple)**

```javascript
// Actual Visit model
{
  userId, monumentId, date, duration, rating, device
}

// Extendido
{
  userId, monumentId, tourId (new), date, duration, rating, device
}
// Así cada visita registra si fue parte de un tour o no
```

**Recomendación:** Opción A (completo tracking de tours) es mejor para analytics y gamificación.

### 4.3 Gap 3: No hay tour progress (cuántas paradas completadas)

**Problema:** Mobile no sabe cuántas paradas del tour ha visitado el usuario.

**Recomendación:**

```dart
// Mobile: Extender TourItem con método
class TourItem {
  // ... existing fields

  // Obtener paradas visitadas desde backend
  Future<int> getVisitedStopsCount(String token) async {
    final response = await http.get(
      Uri.parse('${apiUrl}/api/users/me/visits?tourId=$id'),
      headers: {'Authorization': 'Bearer $token'}
    );
    // Contar monumentos del tour que están en respuesta
  }

  // Calcular progreso
  double get progress {
    if (stops.isEmpty) return 0;
    // visitedStopsCount / stops.length
  }
}
```

### 4.4 Gap 4: Tour completion & stats

**Problema:** No hay registro de cuándo se completa un tour ni estadísticas.

**Recomendación:**

```javascript
// Backend: Nueva ruta
GET /api/users/me/tour-stats → retorna:
{
  toursStarted: 5,
  toursCompleted: 3,
  totalToursPoints: 250,
  recentTours: [
    {
      tourId, tourName, completedAt, rating, stopsVisited
    }
  ]
}
```

---

## 5. Plan de Implementación Recomendado

### Fase 1: Mejoras Rápidas (Esta semana)

- [x] Auditar (completado)
- [x] **1.1** Implementar `getTourById()` en Mobile ToursService ✅
- [x] **1.2** Pasar tourId al crear Visit (si se visita desde un tour) ✅
- [x] **1.3** Extender ArCameraScreen para recibir tourId ✅
- [x] **1.4** Actualizar MyTourScreen para pasar tourId ✅

**Cambios implementados:**

1. **Backend**: Extendido Visit model con campo `tourId` (opcional)
   - Agregados índices para queries: `tourId`, `userId+tourId`
   - Compatible con visitas sin tour (tourId = null)

2. **Mobile ToursService**: Nuevo método `getTourById(String tourId)`
   - Obtiene detalles completos de un tour desde `/api/tours/:id`

3. **Mobile VisitsService**: Extendido `registerVisit()` con parámetro `tourId`
   - Parámetro opcional, backward compatible
   - Enviado al backend al crear visita

4. **Mobile ArCameraScreen**: Nuevo parámetro `tourId`
   - Opcional, recibido desde MyTourScreen
   - Pasado a VisitsService al registrar visita

5. **Mobile MyTourScreen**: Actualizado para pasar `tourId` a ArCameraScreen
   - Obtiene tourId de `_selectedTour?.id`
   - Registra visitas con contexto de tour

### Fase 2: Tracking Completo (implementado)

- [x] **2.1** Crear modelo `TourSession` en backend ✅
- [x] **2.2** APIs para `start/stop/rate` tour ✅
- [x] **2.3** Implementar en Mobile (botón "Iniciar Tour" → crea session) ✅
- [ ] **2.4** Mostrar "Completar Tour" cuando todas paradas visitadas (pendiente)

**Cambios implementados Fase 2:**

- ✅ `backend/src/models/TourSession.js` - Nuevo modelo para tracking de sesiones de tour
- ✅ `backend/src/services/tourSessionService.js` - Lógica de inicio/fin/calificación de sesiones
- ✅ `backend/src/controllers/tourSessionsController.js` - Endpoints: start/stop/rate/getUserSessions
- ✅ `backend/src/routes/tours.routes.js` - Rutas protegidas para sesiones
- ✅ `app_movil/lib/services/sessions_service.dart` - Cliente móvil para sesiones (start/stop/rate/getMySessions)
- ✅ `app_movil/lib/screens/my_tour_screen.dart` - Botón iniciar/finalizar sesión en UI
- ✅ `backend/src/services/visitService.js` - Al crear una `Visit` con `tourId`, ahora se añade automáticamente la parada a la `TourSession` activa (si existe)

La integración permite ahora rastrear cuándo un usuario inicia y finaliza un tour, y las paradas visitadas se agregan automáticamente a la sesión cuando se registra una `Visit` con `tourId`.

### Fase 3: Analytics & Gamificación (Post-MVP)

- [ ] **3.1** Tour stats endpoint
- [ ] **3.2** Mostrar estadísticas en ProfileScreen
- [ ] **3.3** Badges/achievements por tours completados

---

## 6. Código Propuesto (Fase 1)

### Backend: Extender Visit model

```javascript
// backend/src/models/Visit.js
const VisitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monument', required: true },
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' }, // NEW - opcional
    date: { type: Date, default: Date.now },
    duration: { type: Number },
    rating: { type: Number, min: 1, max: 5 },
    device: { type: String },
  },
  { timestamps: true },
);

// Índice para queries de user + tour
VisitSchema.index({ userId: 1, tourId: 1 });
```

### Mobile: Extender ToursService

```dart
// lib/services/tours_service.dart - agregar método
Future<TourItem> getTourById(String tourId) async {
  final uri = Uri.parse(
    '${Environment.apiBaseUrl}/api/tours/$tourId',
  );

  final response = await http.get(uri);
  final data = _decodeMapResponse(response, 'Error al obtener tour');

  return TourItem.fromJson(data);
}
```

### Mobile: Extender VisitsService

```dart
// lib/services/visits_service.dart - agregar parámetro tourId
Future<void> recordMonumentVisit({
  required String monumentId,
  required String? tourId,  // NEW
  required String token,
}) async {
  final prefs = await SharedPreferences.getInstance();
  final userId = prefs.getString('userId') ?? '';

  final body = jsonEncode({
    'monumentId': monumentId,
    if (tourId != null) 'tourId': tourId,
    'userId': userId,
  });

  final response = await http.post(
    Uri.parse('${Environment.apiBaseUrl}/api/visits'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: body,
  );
  // ... handle response
}
```

---

## 7. Testing Recomendado

### Backend Tests

```javascript
// tests/routes/tours.test.js
test('GET /api/tours/:id returns tour with monuments populated');
test('GET /api/tours with activeOnly=true filters correctly');
test('POST /api/visits with tourId records tour participation');
```

### Mobile Tests

```dart
// test/services/tours_service_test.dart
test('getTourById returns tour with all stops');
test('AllTours are ordered by createdAt descending');
test('TourStop order is respected');
```

---

## 8. Sign-Off

| Aspecto                  | Status                  | Detalles                                       |
| ------------------------ | ----------------------- | ---------------------------------------------- |
| ✅ Auditoría API Tours   | Completado              | Comparativa Backend ↔ Mobile realizada         |
| ✅ Gaps identificados    | 4 principales           | Documentados con recomendaciones               |
| ✅ Plan Fase 1           | Definido & Implementado | 4 mejoras rápidas completadas (~2-3 horas)     |
| ✅ Código de ejemplo     | Implementado            | Listo y en uso                                 |
| ✅ Implementación Fase 1 | ✅ COMPLETADA           | Backend Visit model + Mobile integraciones     |
| ⏳ Fase 2                | Pendiente               | Tracking completo de tours (TourSession model) |
| ⏳ Fase 3                | Pendiente               | Analytics & gamificación                       |

**Cambios implementados Fase 1:**

- ✅ `backend/src/models/Visit.js` - Extendido con tourId
- ✅ `app_movil/lib/services/tours_service.dart` - Nuevo método getTourById()
- ✅ `app_movil/lib/services/visits_service.dart` - Parámetro tourId en registerVisit()
- ✅ `app_movil/lib/screens/ar_camera_screen.dart` - Recibe y pasa tourId
- ✅ `app_movil/lib/screens/my_tour_screen.dart` - Pasa tourId a ArCameraScreen

**Próximo paso:** Implementar Fase 2 (modelo TourSession, tracking completo de tours)
