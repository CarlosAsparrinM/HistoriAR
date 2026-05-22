# Checklist de Validación Manual - QA Responsive & Accesibilidad

## Instrucciones

1. Ejecutar `flutter run -d chrome` (web) o en dispositivo físico
2. Para web: usar Chrome DevTools → Device Toolbar para simular breakpoints
3. Validar cada pantalla según los criterios abajo
4. Registrar issues encontrados

---

## 🔍 PANTALLA 1: LOGIN SCREEN

### Tamaño Small (320x568 - iPhone SE)

```
[ ] Logo/branding centrado sin truncar
[ ] Email input field visible sin scroll
[ ] Password input field visible
[ ] "Iniciar sesión" botón tocable (48+ dp altura)
[ ] Links registrarse/recuperar contraseña legibles
[ ] Campos tienen labels/placeholders claros
```

### Tamaño Medium (768x1024 - iPad)

```
[ ] Contenido no ocupa pantalla completa (max-width respetado)
[ ] Campos centrados con margen lateral
[ ] Botón login tiene width cómodo (no full-width)
```

### Tamaño Large (1920x1080 - Desktop)

```
[ ] Layout horizontal si es posible (logo + form lado a lado)
[ ] Form centrada, max-width de ~400 dp
```

### Landscape (cualquier dispositivo)

```
[ ] Campos se adaptan al ancho
[ ] No hay scroll horizontal
[ ] Botón accesible sin scroll vertical
```

### ♿ Accesibilidad

```
[ ] Contraste: texto negro sobre fondo (4.5:1 WCAG AA)
[ ] Input fields: labels no invisible, placeholder no es label
[ ] Tab order: Email → Password → Botón login → Links
[ ] Tamaño texto escalable a 200% sin truncar
[ ] Icons (si hay) con semanticsLabel
```

---

## 🗺️ PANTALLA 2: EXPLORE SCREEN

### Tamaño Small (320x568)

```
[ ] Mapa ocupa 60% pantalla
[ ] FAB (ubicación actual) no oculta controles
[ ] Bottom sheet (monumento seleccionado) ocupa ~50% pantalla
[ ] Scroll fluido sin lag
[ ] Filtros accesibles (botón flotante visible)
```

### Tamaño Medium (768x1024)

```
[ ] Mapa ocupa 70% (ancho completo o casi)
[ ] Cards de monumentos en list/grid adaptada
[ ] Modal de detalles no ocupa full-width
```

### Tamaño Large (1920x1080)

```
[ ] Layout split-view: mapa izquierda, lista derecha (si aplica)
[ ] Cards con mejor spacing
```

### ♿ Accesibilidad

```
[ ] Markers markers son tocables (48+ dp)
[ ] Imágenes de monumentos con semanticsLabel
[ ] Descripciones de lugar/dirección legibles
[ ] Botones (Ver detalles, Iniciar tour) etiquetados
[ ] Colores markers distinguibles (no solo color rojo/azul)
```

---

## 🎫 PANTALLA 3: MY TOUR SCREEN

### Tamaño Small (320x568)

```
[ ] Lista de tours con scroll fluido
[ ] Cards de tour: imagen (80 dp altura min), título, lugar
[ ] Botón "Iniciar tour" sticky (siempre visible en bottom)
[ ] Empty state si no hay tours: centrado, ícono + botón retry
```

### Tamaño Medium (768x1024)

```
[ ] Grid 2 columnas posible
[ ] Cards más espaciadas
```

### Tamaño Large (1920x1080)

```
[ ] Grid 3 columnas
[ ] Cards con mejor proporción imagen-contenido
```

### ♿ Accesibilidad

```
[ ] Cards seleccionables con tab
[ ] Imágenes tours con alt-text
[ ] Titles de tours no truncados (wrap)
[ ] Loading spinner centrado, description "Cargando tours..."
[ ] Error state: claro mensaje + retry button
```

---

## 👤 PANTALLA 4: PROFILE SCREEN

### Tamaño Small (320x568)

```
[ ] Avatar circular: 80 dp sin ser muy pequeño
[ ] Nombre usuario legible (font 18+)
[ ] Email visible sin truncar
[ ] Botones (Editar, Logout) stacked verticalmente
[ ] Información adicional scrolleada
```

### Tamaño Medium (768x1024)

```
[ ] Avatar mayor si es posible (120 dp)
[ ] Contenido centrado con max-width
```

### ♿ Accesibilidad

```
[ ] Avatar tiene description "Avatar de [nombre]"
[ ] Botones: "Editar perfil", "Cambiar contraseña", "Cerrar sesión"
[ ] Contraste email text >= 4.5:1
[ ] Confirmación "Eliminar cuenta" - dialog with Cancel/Confirm
[ ] Botón logout rojo pero también con icono (no solo color)
```

---

## 📝 PANTALLA 5: QUIZ SCREEN

### Tamaño Small (320x568)

```
[ ] Barra progreso visible y clara
[ ] Pregunta: font >= 16 pt, legible
[ ] Opciones respuesta: cada una >= 48 dp altura, tocable
[ ] Feedback visual: check/X ícono + color
[ ] Explicación debajo, readable
[ ] Botón "Siguiente" siempre visible (bottom)
```

### Tamaño Medium (768x1024)

```
[ ] Pregunta más grande (font 20+)
[ ] Opciones con mejor spacing
```

### ♿ Accesibilidad

```
[ ] Pregunta con puntos en badge secundario (no solo texto)
[ ] Opciones como radio buttons (semantically)
[ ] Feedback: color + ícono (no solo color)
[ ] Explicación con font legible, alto contraste
[ ] Botón "Finalizar quiz" destacado (color different)
[ ] Progress bar con % hablado (screen reader)
```

---

## ⚙️ PANTALLA 6: CONFIGURATION SCREEN

### Tamaño Small (320x568)

```
[ ] Lista de opciones sin scroll horizontal
[ ] Switches/toggles: 48+ dp altura
[ ] Secciones claramente separadas (padding vertical)
[ ] Botón logout bottom, rojo, prominente
```

### Tamaño Medium (768x1024)

```
[ ] Contenido centrado, max-width ~600 dp
[ ] Opciones con mejor descripción (no truncada)
```

### ♿ Accesibilidad

```
[ ] Cada toggle: label + description
[ ] Labels flotantes o inline claros
[ ] Botón logout con confirmation dialog
[ ] Color rojo del logout + ícono de warning
[ ] Switches accesibles via keyboard (tab + espacio)
```

---

## 🔬 VALIDACIÓN GLOBAL

### Animaciones & Motion

```
[ ] Transiciones smooth (duración consistente)
[ ] No hay flashing (< 3 flashes/segundo)
[ ] Gestos intuitivos (swipe, tap, long-press claros)
```

### Tipografía

```
[ ] Font base: 14-16 pt en mobile
[ ] Headings: 20-28 pt
[ ] Cuerpo texto: >= 14 pt
[ ] Line height: >= 1.4 (spacing vertical)
```

### Colores & Contraste

```
[ ] Texto negro/gris oscuro sobre blanco: >= 4.5:1 (WCAG AA)
[ ] Texto primario: verificar contraste mínimo
[ ] Botones: color distintivo
[ ] Error states: rojo + ícono
[ ] Success states: verde + ícono
```

### Touch & Interaction

```
[ ] Todos botones: >= 48x48 dp
[ ] Spacing entre botones: >= 8 dp
[ ] Focus states: visible (outline o background)
[ ] Tap feedback: ripple o cambio visual
```

---

## 📱 Cómo Simular Breakpoints en Chrome

1. Abre Chrome DevTools (`F12`)
2. Click en Device Toolbar (móvil icon, o `Ctrl+Shift+M`)
3. Selecciona dispositivo en dropdown (iPhone SE, iPad, etc.)
4. Rotate (Ctrl+Shift+M otra vez) para landscape
5. Click "..." → "Device pixel ratio" para zoom si es necesario

---

## 🐛 Issues Template

```markdown
### [PANTALLA]: [ISSUE TITLE]

**Tamaño afectado**: Small / Medium / Large / Landscape
**Severidad**: Critical / High / Medium / Low
**Descripción**:
[Describe qué está mal]

**Pasos para reproducir**:

1. ...
2. ...

**Resultado esperado**: [Qué debería pasar]
**Resultado actual**: [Qué está pasando]

**Screenshot**: [Adjuntar si es posible]
```

---

## ✅ Sign-off

Cuando todo está validado:

- [ ] Todas las pantallas pasaron QA en breakpoints clave
- [ ] Accesibilidad WCAG AA validada
- [ ] Issues críticos resueltos
- [ ] App lista para testing en dispositivos reales
- [ ] Documentación actualizada

**Fecha completado**: **\*\***\_\_\_**\*\***
**Responsable**: **\*\***\_\_\_**\*\***
**Observaciones**: **\*\***\_\_\_**\*\***
