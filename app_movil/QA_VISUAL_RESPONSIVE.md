# Plan de QA Visual Responsive - HistoriAR Mobile

## Objetivo

Validar que todas las pantallas de la app móvil tengan un diseño coherente, adaptable y accesible en diferentes tamaños de pantalla.

---

## 1. Dispositivos de Testing

### 1.1 Dispositivos Disponibles

- **Motorola Edge 60 Pro** (6.7" FHD+, ~394 ppi) - Android 16
  - Tamaño: ~2400 x 1080 px (portrait)
  - Caso de uso: flagship Android

### 1.2 Breakpoints a Validar en Web (Flutter Web)

- **Small (Mobile)**: 320x568 (iPhone SE)
- **Medium (Tablet)**: 768x1024 (iPad)
- **Large (Desktop)**: 1920x1080

### 1.3 Emuladores Recomendados (Crear si es necesario)

- Pixel 4 (5.7" FHD, ~440 ppi)
- Pixel 6 Pro (6.7" QHD, ~512 ppi)
- Nexus 7 (7" tablet)

---

## 2. Criterios de Validación por Pantalla

### 2.1 **Login Screen**

- [ ] Logo/branding centrado en portrait
- [ ] Campos de entrada (email, password) completamente visibles
- [ ] Botón "Iniciar sesión" accesible sin scroll
- [ ] Links (registrarse, recuperar contraseña) visibles
- [ ] Social login buttons (Google, Facebook) alineados
- [ ] Modo landscape: no overflow, botones legibles
- **Accesibilidad**:
  - [ ] Contraste de texto >= WCAG AA (4.5:1)
  - [ ] Campos etiquetados con semanticsLabel
  - [ ] Tab order: email → password → botón

### 2.2 **Explore Screen**

- [ ] Mapa ocupa el 60-70% de la pantalla
- [ ] Filtros/botones flotantes (FAB) no ocultan contenido
- [ ] Cardtitle con monumento texto legible
- [ ] En tablet: mostrar sidebar con lista + mapa
- [ ] Modal de detalles llena 80-90% altura (no full screen)
- **Accesibilidad**:
  - [ ] Markers son tocables (min 48x48 dp)
  - [ ] Lista de monumentos scrolleada accesible
  - [ ] Descripciones de imágenes con semanticsLabel

### 2.3 **My Tour Screen**

- [ ] Lista de tours con scroll fluido
- [ ] Cards de tour: imagen, título, lugar, puntos
- [ ] Botón "Iniciar tour" siempre visible o sticky
- [ ] Estado vacío: centrado, ícono + botón retry
- [ ] Loading state: spinner centrado, sin bloquear UI
- **Accesibilidad**:
  - [ ] Tour cards son botones (seleccionables con tab)
  - [ ] Imágenes tienen alt-text
  - [ ] Texto de lugar no corta

### 2.4 **Profile Screen**

- [ ] Avatar circular: 80-100 dp
- [ ] Nombre de usuario legible (no truncado)
- [ ] Email/datos no solapan en portrait
- [ ] Botón editar/logout accesibles
- [ ] Modal de edición: campos etiquetados
- [ ] Confirmación eliminar cuenta: clear, prominent
- **Accesibilidad**:
  - [ ] Avatar tiene description
  - [ ] Botones etiquetados (Edit, Logout, Delete)
  - [ ] Contraste suficiente en todos los textos

### 2.5 **Quiz Screen**

- [ ] Barra de progreso clara
- [ ] Pregunta legible (font >= 16pt)
- [ ] Opciones de respuesta con hit target >= 48pt
- [ ] Feedback visual immediate (indicador correcto/incorrecto)
- [ ] Explicación expandible
- [ ] Botón siguiente/finalizar siempre visible
- **Accesibilidad**:
  - [ ] Opciones son radio buttons semánticamente
  - [ ] Feedback colores + iconos (no solo color)
  - [ ] Explicación con font readable

### 2.6 **Configuration Screen**

- [ ] Lista de opciones no truncada
- [ ] Toggles/switches de fácil toque (48+ dp)
- [ ] Secciones claramente separadas
- [ ] Botón logout prominent (rojo, bottom)
- **Accesibilidad**:
  - [ ] Switches etiquetados
  - [ ] Descripción de cada opción legible
  - [ ] Destructive actions (logout) confirmación

### 2.7 **AR Camera Screen**

- [ ] Viewfinder ocupa 80-100% pantalla
- [ ] Botones de control (captura, volver) no solapan
- [ ] Overlay markers visibles y distinguibles
- **Accesibilidad**:
  - [ ] Botones grandes (56+ dp)
  - [ ] Feedback de captura claro

---

## 3. Validación de Accesibilidad Global

### 3.1 WCAG 2.1 Level AA

- [ ] **Contraste**: Texto normal >= 4.5:1, Large text >= 3:1
- [ ] **Tamaño mínimo**: Touch targets 48x48 dp
- [ ] **Zoom**: Ampliable a 200% sin pérdida de funcionalidad
- [ ] **Foco visible**: Todos los elementos interactivos tienen focus ring
- [ ] **Color no es única indicación**: Iconos + etiquetas, no solo color

### 3.2 Semantic Accessibility

- [ ] Cada imagen tiene `semanticsLabel`
- [ ] Botones etiquetados con `Semantics(label: ...)`
- [ ] Jerarquía de headings correcta (H1 > H2 > H3)
- [ ] Listas con `Semantics.list`

### 3.3 Motion & Animation

- [ ] Transiciones smooth (duraciones consistentes de `AppDurations`)
- [ ] No hay movimiento forzado (respetar `prefers-reduced-motion`)
- [ ] Animaciones no distraen (< 5 segundos)

---

## 4. Plan de Ejecución

### Fase 1: Validación Manual en Dispositivos Reales (Hoy)

1. Ejecutar en Motorola Edge 60 Pro
2. Revisar cada pantalla en portrait y landscape
3. Documentar issues encontrados
4. Tomar screenshots

### Fase 2: Validación en Web (Responsiveness)

```bash
flutter run -d chrome
# En Chrome DevTools, simular distintos breakpoints:
# - iPhone SE (375x667)
# - iPad (768x1024)
# - Desktop (1920x1080)
```

### Fase 3: Pruebas Automáticas (Integration Testing)

```bash
flutter test integration_test/
```

### Fase 4: Validación de Accesibilidad

- [ ] Ejecutar `flutter analyze --suggestions` (linter de a11y)
- [ ] Revisar contraste con herramientas de accesibilidad
- [ ] Test manual con screen reader (TalkBack en Android)

---

## 5. Issues y Fixes

| Pantalla       | Issue | Severidad | Fix |
| -------------- | ----- | --------- | --- |
| (Por rellenar) |       |           |     |

---

## 6. Sign-off

- [ ] QA visual responsive completado
- [ ] Accesibilidad validada (WCAG AA)
- [ ] Screenshots documentados
- [ ] Pronto para producción

---

**Fecha inicio**: 21 de mayo, 2026
**Responsable**: Equipo de desarrollo
**Estado**: En progreso
