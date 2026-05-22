# Validación de Responsive Design - HistoriAR Mobile

**Fecha**: 21 de mayo, 2026
**Estado**: En Progreso
**Responsable**: Equipo de Desarrollo

---

## Resumen Ejecutivo

Se ha iniciado el proceso de validación de QA visual y responsive design para todas las pantallas de HistoriAR Mobile. Se han creado herramientas y documentación para facilitar testing en múltiples tamaños de pantalla y validación de accesibilidad WCAG AA.

### Dispositivos Disponibles para Testing

- ✅ **Motorola Edge 60 Pro** (6.7" FHD+) - Android 16
- ✅ **Chrome DevTools** (web responsive, breakpoints simulados)
- ✅ **Edge DevTools** (web responsive, breakpoints simulados)
- ❌ Emuladores Android: Disponibles en Android Studio (no listados aún)

---

## 1. Validación Estructural (Code Review)

### ✅ Login Screen

- [x] Layout responsive: `SafeArea` + `SingleChildScrollView` + `ConstrainedBox(maxWidth: 500)`
- [x] Padding adaptativo: `horizontal: 24, vertical: 32`
- [x] Formularios centrados y limitados en ancho
- [x] TabBar para Iniciar Sesión / Registrarse
- [ ] **⚠️ Issue**: Height fijo `500` para TabBarView puede ser problematico en pantallas muy pequeñas

### ✅ Explore Screen (Mapa)

- [x] Layout responsive: `Expanded` para mapa, ocupa espacio disponible
- [x] SafeArea implementado
- [x] Header con padding fijo pero proporcionado
- [x] Stack con marcadores adaptativos (68x68 dp)
- [x] Bottom sheet dinámico para monumento seleccionado
- [x] Botones flotantes (+/-) bien posicionados

### ✅ My Tour Screen

- [x] ListView con scroll dinámico
- [x] AppLoadingState / AppEmptyState implementados
- [x] AppFadeSwitcher para transiciones smooth

### ✅ Profile Screen

- [x] Avatar circular escalable (80-100 dp)
- [x] Contenido scrolleado si es necesario
- [x] Confirmación para eliminar cuenta

### ✅ Quiz Screen

- [x] Barra de progreso clara
- [x] Preguntas y opciones con scroll dinámico
- [x] Botón Siguiente/Finalizar siempre accesible

### ✅ Configuration Screen

- [x] Lista scrolleada de opciones
- [x] Toggles/switches bien espaciados
- [x] Logout prominente (rojo)

### ✅ AR Camera Screen

- [x] Fullscreen viewfinder
- [x] Controles flotantes

---

## 2. Herramientas Creadas

### 📄 Documentación

1. **`QA_VISUAL_RESPONSIVE.md`** - Plan general de testing
   - Criterios por pantalla
   - Breakpoints clave (Small 320x568, Medium 768x1024, Large 1920x1080)
   - Validación WCAG AA

2. **`QA_MANUAL_CHECKLIST.md`** - Checklist detallado
   - Paso a paso para cada pantalla
   - Criterios de accesibilidad
   - Template para reportar issues

### 🛠️ Utilidades

3. **`lib/utils/responsive_helper.dart`** - Helper responsive design
   - `ResponsiveHelper` - detección de tamaño pantalla
   - `ScreenSize` enum - Small/Medium/Large
   - `ResponsiveContainer` - widget wrapper
   - `AccessibleText` - texto con soporte bold/high-contrast
   - `AccessibilityInfo` - información de accesibilidad del usuario

**Uso**:

```dart
import '../utils/responsive_helper.dart';

// En un widget
final screenSize = ResponsiveHelper.getScreenSize(context);
if (screenSize == ScreenSize.small) {
  // Layout para móvil
} else if (screenSize == ScreenSize.medium) {
  // Layout para tablet
}

// Padding adaptativo
final padding = ResponsiveHelper.getAdaptivePadding(context);

// Información accesibilidad
final a11y = ResponsiveHelper.getAccessibilityInfo(context);
if (a11y.hasAccessibilityNeeds()) {
  // Aplicar ajustes para accesibilidad
}
```

---

## 3. Análisis de Flutter (`flutter analyze`)

### ✅ Completado

- [x] Eliminada clase no usada `_EmptyTourState`
- [x] Añadidas llaves en control flow (profile_screen, quiz_screen)
- [x] Protegidos accesos a `context` con `mounted` checks

### 📊 Resultados Finales

```
Antes: 37 issues
Después: 33 issues (100% info, 0% warnings/errors)
```

**Issues Restantes** (todos no-críticos):

- 28 × Deprecations (`withOpacity` → `.withValues()`, `scale`, `desiredAccuracy`)
- 5 × BuildContext checks (en builders, falsos positivos posibles)

---

## 4. Plan de Testing Manual

### Fase 1: Dispositivo Real (Motorola Edge 60 Pro)

```
[ ] Landscape orientation: sin scroll horizontal
[ ] Portrait orientation: contenido accesible
[ ] Transiciones smooth
[ ] Imágenes (avatar, monumento) cargan correctamente
[ ] Botones responsive (hit target >= 48 dp)
```

### Fase 2: Web Responsive (Chrome DevTools)

1. Abrir `flutter run -d chrome`
2. Activar Device Toolbar (`Ctrl+Shift+M`)
3. Simular breakpoints:
   - iPhone SE (375x667)
   - iPad (768x1024)
   - Desktop (1920x1080)

```
[ ] Logo/headers escalados correctamente
[ ] Inputs legibles sin truncar
[ ] Mapas responsive (FlutterMap adapts)
[ ] Cards en grid 1/2/3 columnas
[ ] Botones siempre tocables
```

### Fase 3: Accesibilidad

- [ ] Contraste verificado (4.5:1 WCAG AA)
- [ ] Touch targets >= 48x48 dp
- [ ] Zoom 200% sin pérdida de funcionalidad
- [ ] Screen reader (TalkBack): etiquetas semánticas
- [ ] Tab order correcto (keyboard navigation)

---

## 5. Issues Encontrados & Status

| ID  | Pantalla | Issue                                              | Severidad | Status    | Fix ETA |
| --- | -------- | -------------------------------------------------- | --------- | --------- | ------- |
| 001 | Login    | Height fijo TabBarView (500) en pantallas pequeñas | Medium    | Pendiente | v1.1    |
| 002 | All      | Deprecations: `withOpacity` → `.withValues()`      | Low       | Pendiente | v1.1    |
| 003 | All      | `desiredAccuracy` deprecated en Geolocator         | Low       | Pendiente | v1.1    |
|     |          |                                                    |           |           |         |

---

## 6. Siguiente Pasos (Immediate)

### ✅ Completado

- [x] Crear plan de QA visual responsive
- [x] Crear checklist manual detallado
- [x] Crear helper utilities para responsive design
- [x] Code review de layouts (verificar ResponsiveDesign)
- [x] Ejecutar `flutter analyze` y corregir issues críticos

### 🔄 En Progreso

- [ ] Testing manual en dispositivo real (Motorola Edge)
- [ ] Testing en web (Chrome breakpoints)
- [ ] Validación de accesibilidad WCAG AA

### 📋 Pendiente

- [ ] Corregir deprecations (opcional para v1.1)
- [ ] Crear tests de integración para responsive layouts
- [ ] Documentar screenshots de cada pantalla en breakpoints clave
- [ ] Sign-off final de QA

---

## 7. Herramientas & Comandos Útiles

### Ejecutar app en web (responsive)

```bash
flutter run -d chrome
```

### Linter analysis detallado

```bash
flutter analyze --suggestions
```

### Testing específico

```bash
flutter test integration_test/responsive_test.dart
```

### Validar accesibilidad (manual)

```bash
# En Android:
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
```

---

## 8. Notas Importantes

1. **Responsive Design Strategy**: Usar `MediaQuery` + breakpoints en `ResponsiveHelper`
2. **Accesibilidad**: WCAG 2.1 Level AA como estándar mínimo
3. **Motion**: Respetar `prefers-reduced-motion` en futuras animaciones
4. **Testing Device**: El Motorola Edge 60 Pro es flagship Android (buen baseline)
5. **Web Testing**: Chrome DevTools Device Toolbar simula bien breakpoints

---

## 9. Sign-Off

| Rol           | Nombre      | Firma | Fecha            |
| ------------- | ----------- | ----- | ---------------- |
| Développeur   | [Tu nombre] | [ ]   | 21/05/2026       |
| QA Lead       | [TBD]       | [ ]   | **_/_**/\_\_\_\_ |
| Product Owner | [TBD]       | [ ]   | **_/_**/\_\_\_\_ |

---

**Documento generado**: 21 de mayo, 2026
**Versión**: 1.0
**Siguiente revisión**: 28 de mayo, 2026
