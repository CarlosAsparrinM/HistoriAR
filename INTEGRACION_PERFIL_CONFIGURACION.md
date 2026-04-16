# 📱 Integración de Perfil y Configuración - App Móvil

## ✅ Cambios Realizados

### 1. **Modelos de Datos Creados**

#### `lib/models/user.dart`
Modelo completo de usuario con campos:
- Información básica: `id`, `name`, `email`, `profileImage`
- Estadísticas: `level`, `totalPoints`, `monumentsVisited`, `arScans`
- Datos temporales: `timeSpent`, `joinDate`, `achievements`, `badges`
- Métodos: `fromJson()`, `toJson()`, `copyWith()`

#### `lib/models/user_preferences.dart`
Modelo de preferencias con campos:
- **Notificaciones**: `notifications`, `location`
- **Realidad Aumentada**: `arEffects`, `highQuality`
- **Audio**: `sound`
- **Datos**: `offlineMode`, `dataUsage`, `language`, `theme`

### 2. **Servicios API Creados**

#### `lib/services/user_service.dart`
Servicio para gestionar el perfil del usuario:
- `getMyProfile(token)` - Obtiene el perfil del usuario autenticado
- `getUser(userId, token)` - Obtiene datos de otro usuario (admin)
- `updateProfile(...)` - Actualiza información del perfil
- `listUsers(token)` - Lista todos los usuarios (admin)

#### `lib/services/preferences_service.dart`
Servicio para gestionar las preferencias:
- `getUserPreferences(userId, token)` - Obtiene las preferencias del usuario
- `updateUserPreferences(...)` - Actualiza todas las preferencias
- `partialUpdatePreferences(...)` - Actualiza solo campos específicos

### 3. **Pantallas Actualizadas**

#### `lib/screens/profile_screen.dart`
- ✅ Conectada con `UserService` para obtener datos reales del backend
- ✅ Muestra perfil del usuario autenticado
- ✅ Carga datos: nombre, email, nivel, puntos, logros, insignias
- ✅ Maneja errores de carga y reconexión
- ✅ Implementa logout con limpieza de token

#### `lib/screens/configuration_screen.dart`
- ✅ Conectada con `PreferencesService` para obtener/actualizar preferencias
- ✅ Carga preferencias guardadas en el backend
- ✅ Actualización en tiempo real al cambiar switches
- ✅ Sincronización con el servidor en cada cambio
- ✅ Manejo de errores con mensajes al usuario

## 🔌 Endpoints Utilizados

### Perfil del Usuario
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/me` | Obtener perfil autenticado |
| GET | `/api/users/:id` | Obtener usuario por ID |
| PUT | `/api/users/:id` | Actualizar perfil |

### Preferencias
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/:id/preferences` | Obtener preferencias |
| PUT | `/api/users/:id/preferences` | Actualizar preferencias |

## 📋 Requisitos Previos

1. **SharedPreferences** - para almacenar token y userId
2. **http** - para realizar peticiones HTTP
3. Token de autenticación guardado en `authToken`
4. UserId guardado en `userId`

## 🚀 Cómo Usar

### En el `login_screen.dart` o después de login:

```dart
// Después de obtener el token
final prefs = await SharedPreferences.getInstance();
await prefs.setString('authToken', token);
await prefs.setString('userId', userId); // Obtener del backend en login
```

### En cualquier pantalla que necesite datos del usuario:

```dart
import '../services/user_service.dart';
import '../models/user.dart';

class MyScreen extends StatefulWidget {
  @override
  State<MyScreen> createState() => _MyScreenState();
}

class _MyScreenState extends State<MyScreen> {
  final UserService _userService = UserService();
  
  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');
    if (token != null) {
      final user = await _userService.getMyProfile(token);
      // Usar user...
    }
  }
}
```

### Para actualizar preferencias:

```dart
import '../services/preferences_service.dart';

final preferencesService = PreferencesService();

// Actualización parcial
await preferencesService.partialUpdatePreferences(
  userId: userId,
  token: token,
  notifications: false,
  arEffects: true,
);
```

## 📁 Estructura de Archivos Creados

```
lib/
├── models/
│   ├── user.dart (nuevo)
│   └── user_preferences.dart (nuevo)
├── services/
│   ├── user_service.dart (nuevo)
│   └── preferences_service.dart (nuevo)
└── screens/
    ├── profile_screen.dart (actualizado)
    └── configuration_screen.dart (actualizado)
```

## ⚙️ Configuración Adicional Necesaria

Si aún no lo has hecho, asegúrate de tener en `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  shared_preferences: ^2.2.0
```

Luego ejecuta:
```bash
flutter pub get
```

## 🔄 Flujo de Datos

```
Login Screen
    ↓
[Token guardado en SharedPreferences]
    ↓
Profile Screen / Configuration Screen
    ↓
UserService / PreferencesService
    ↓
Backend API
    ↓
MongoDB (datos persistidos)
```

## 🧪 Testing

Para probar localmente sin backend:

1. Asegúrate que el backend esté corriendo en `http://localhost:4000`
2. En `lib/services/api_config.dart`, ajusta la URL si es necesario
3. Usa las pantallas normalmente - deberían conectar y mostrar datos reales

## 📝 Notas Importantes

- Los tokens se guardan en `SharedPreferences` (cambiar a almacenamiento seguro en producción)
- Todas las peticiones incluyen el token en el header `Authorization: Bearer <token>`
- Los cambios de preferencias se sincronizan automáticamente con el backend
- Los errores de red se muestran al usuario mediante `SnackBar`
- Implementar refresh token cuando expire el token actual

## 🔒 Seguridad

Para producción, considera:

1. **Almacenamiento seguro de tokens** - usar `flutter_secure_storage` en lugar de `SharedPreferences`
2. **Validación de entrada** - validar datos antes de enviar
3. **HTTPS** - usar certificados válidos
4. **Refresh tokens** - implementar expiración y renovación de tokens
5. **CORS** - configurar correctamente en el backend

## 📞 Soporte

Si encuentras errores:

1. Verifica que el backend esté corriendo
2. Comprueba que los tokens sean válidos
3. Revisa los logs del backend y la app
4. Asegúrate que la URL de API sea correcta en `api_config.dart`
