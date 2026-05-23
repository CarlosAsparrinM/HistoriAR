# Resumen de Cambios y Refactorización de la Aplicación Móvil (`app_movil`)

Este documento detalla todas las modificaciones, eliminaciones de código muerto, centralización de constantes y optimizaciones realizadas en la aplicación móvil `app_movil` para mejorar la mantenibilidad, seguridad y rendimiento del código.

---

## 1. Eliminación de Código Muerto (Clean Code)
Se identificaron y eliminaron componentes, clases y métodos que no estaban en uso en ninguna parte de la aplicación, reduciendo el ruido visual y el tamaño general del código.

### Archivos Eliminados por Completo
- [user_preferences.dart](file:///D:/HistoriAR/app_movil/lib/models/user_preferences.dart): Modelo de datos obsoleto que ya no se utilizaba en el flujo de la aplicación.
- [preferences_service.dart](file:///D:/HistoriAR/app_movil/lib/services/preferences_service.dart): Servicio antiguo para la persistencia local de configuración. Fue reemplazado por la implementación del [AppSettingsService](file:///D:/HistoriAR/app_movil/lib/services/app_settings_service.dart).
- [responsive_helper.dart](file:///D:/HistoriAR/app_movil/lib/utils/responsive_helper.dart): Clase auxiliar para responsividad que no estaba integrada con el sistema de UI y representaba código muerto.

### Limpieza en Modelos Existentes
- [visit.dart](file:///D:/HistoriAR/app_movil/lib/models/visit.dart): Eliminación de los métodos `copyWith` y `toJson` que no eran invocados en el flujo actual de la aplicación.
- [user.dart](file:///D:/HistoriAR/app_movil/lib/models/user.dart): Eliminación de los métodos `copyWith` y `toJson` sin referencias en el proyecto.

---

## 2. Centralización de Claves de Caché (`SharedPreferences`)
Anteriormente, las claves de caché como `'authToken'` y `'userId'` estaban hardcodeadas en múltiples partes del código, lo que aumentaba el riesgo de errores tipográficos y dificultaba el mantenimiento futuro si estas claves cambiaran.

- **Solución**: Se crearon las variables estáticas `tokenKey` y `userIdKey` en la clase [AuthState](file:///D:/HistoriAR/app_movil/lib/contexts/auth_state.dart).
- **Archivos Modificados**:
  - [auth_gate.dart](file:///D:/HistoriAR/app_movil/lib/services/auth_gate.dart)
  - [login_screen.dart](file:///D:/HistoriAR/app_movil/lib/screens/login_screen.dart)
  - [profile_screen.dart](file:///D:/HistoriAR/app_movil/lib/screens/profile_screen.dart)
  - [explore_screen.dart](file:///D:/HistoriAR/app_movil/lib/screens/explore_screen.dart)
  - [my_tour_screen.dart](file:///D:/HistoriAR/app_movil/lib/screens/my_tour_screen.dart)
  - [http_interceptor.dart](file:///D:/HistoriAR/app_movil/lib/services/http_interceptor.dart)
  - [app_settings_service.dart](file:///D:/HistoriAR/app_movil/lib/services/app_settings_service.dart)

---

## 3. Optimización en la Pantalla Mi Tour (`MyTourScreen`)
Se realizó una auditoría y optimización del rendimiento en la pantalla de tours del usuario para mejorar la velocidad de carga y eliminar redundancias de UI.

- **Peticiones HTTP Redundantes**: Se eliminó la llamada duplicada a `monumentsService.fetchMonuments()`. Las paradas (monumentos) ya se encontraban adjuntas en la consulta del Tour respectivo, por lo que el segundo fetch era innecesario y ralentizaba la pantalla.
- **Simplificación del Estado**: Se removió el estado local `_allMonuments` en [MyTourScreen](file:///D:/HistoriAR/app_movil/lib/screens/my_tour_screen.dart). Se implementó un acumulador en base a los tours activos para calcular y desplegar las estadísticas correspondientes.
- **Unificación de Componentes de Error**: Se eliminó el widget privado y duplicado `_ErrorCard` dentro de la pantalla, reemplazándolo por el widget global prediseñado [AppErrorState](file:///D:/HistoriAR/app_movil/lib/widgets/app_states.dart).

---

## 4. Corrección de Advertencias del Linter y Errores en Hot Reload
Se llevó a cabo una sesión de depuración general para corregir todas las advertencias detectadas por `flutter analyze` y asegurar la estabilidad de la app.

- **Imports no utilizados**: Se removieron todos los imports huérfanos que generaban advertencias del linter.
- **Variables Huérfanas y Errores de Referencia**: 
  - Se corrigió la asignación de `_activeSessionTourId = null` en [ExploreScreen](file:///D:/HistoriAR/app_movil/lib/screens/explore_screen.dart) después de que la variable fuera eliminada del estado principal, previniendo fallos de compilación durante el hot reload.
  - Ajustes de sintaxis de Dart, agregando llaves faltantes y resolviendo propiedades en desuso en el dropdown de configuración.

---

### Resumen de Estado de la Aplicación
- **Compilación**: Exitosa y limpia.
- **Linter**: 0 advertencias o errores detectados por `flutter analyze`.
