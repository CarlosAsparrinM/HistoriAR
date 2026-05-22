# Checklist de Publicación en Google Play - HistoriAR

Fecha de revisión: 22-05-2026

## 1) Bloqueantes técnicos (deben resolverse antes de subir)

- [x] Cambiar Application ID de ejemplo
  - Estado actual: `com.historiar.app`
  - Evidencia: android/app/build.gradle.kts
  - Resultado: actualizado a un ID de producción.

- [x] Configurar firma de release (upload key / keystore)
  - Estado actual: release firma con `key.properties` + `upload-keystore.jks`.
  - Evidencia: android/app/build.gradle.kts
  - Resultado: keystore generado y firma release validada.

- [x] Agregar permiso INTERNET al manifest principal
  - Estado actual: INTERNET presente en `src/main`.
  - Evidencia: android/app/src/main/AndroidManifest.xml, android/app/src/debug/AndroidManifest.xml, android/app/src/profile/AndroidManifest.xml
  - Resultado: release ya puede consumir API.

- [ ] Definir `.env` de producción real para el build release
  - Estado actual: se carga `.env` al iniciar, y el fallback de API apunta a localhost.
  - Evidencia: lib/main.dart, lib/config/environment.dart, .env.example
  - Acción: crear `.env` productivo con API HTTPS pública y `ENVIRONMENT=production`.

## 2) Versión y compatibilidad Play

- [ ] Incrementar versión para release
  - Estado actual: `version: 1.0.0+1`
  - Evidencia: pubspec.yaml
  - Acción: subir a una versión final y reservar estrategia de incrementos (`versionCode` siempre creciente).

- [ ] Confirmar target API exigida por Google Play
  - Estado actual: se usa `flutter.targetSdkVersion` (heredado del SDK Flutter instalado).
  - Evidencia: android/app/build.gradle.kts
  - Acción: validar que el target API del artefacto final cumpla la política vigente de Play.

## 3) Calidad y release engineering

- [x] Generar App Bundle firmado
  - Estado actual: AAB generado en `build/app/outputs/bundle/release/app-release.aab`.
  - Validación: `jarsigner -verify` devuelve `jar verified`.

- [ ] Ejecutar smoke test en release
  - Estado actual: QA responsive está en progreso.
  - Evidencia: QA_VALIDACION_EJECUTADA.md, QA_VISUAL_RESPONSIVE.md, QA_MANUAL_CHECKLIST.md
  - Acción: validar login, mapa, cámara AR, geolocalización y flujo completo con backend real.

- [ ] Revisar shrink/obfuscation (opcional recomendado)
  - Estado actual: hay reglas ProGuard básicas para AR/Sceneform.
  - Evidencia: android/app/proguard-rules.pro
  - Acción: probar minificación en release y revisar logs por clases reflejadas.

## 4) Requisitos de Play Console (manuales)

- [ ] Crear ficha de Play Store
  - Título, descripción corta/larga, categoría, email de contacto.

- [ ] Preparar assets de store
  - Ícono 512x512, screenshots por tipo de dispositivo, feature graphic.

- [ ] Publicar URL de política de privacidad
  - Estado actual: no se encontró documento/URL de política en el repo.
  - Acción: crear página pública y agregarla en Play Console.

- [ ] Completar Data Safety form
  - Debes declarar uso de ubicación, cámara, identificadores/autenticación y transferencia de datos a backend.

- [ ] Completar Content Rating y App Access
  - Si hay autenticación obligatoria, preparar credenciales demo para revisión (si aplica).

## 5) Permisos y transparencia de datos

- [ ] Alinear permisos con funcionalidad y disclosure
  - Estado actual: se solicitan cámara y ubicación en manifest principal.
  - Evidencia: android/app/src/main/AndroidManifest.xml
  - Acción: justificarlos en la ficha y en Data Safety.

## 6) Lista rápida de salida (Go/No-Go)

Marca GO solo si todo esto está en verde:

- [x] Application ID de producción
- [x] Firma release real (no debug)
- [x] INTERNET en manifest main
- [ ] `.env` productivo válido (API HTTPS)
- [x] AAB firmado generado
- [ ] AAB probado en Internal testing
- [ ] Política de privacidad publicada
- [ ] Data Safety + Content Rating completados
- [ ] Capturas y assets de store listos

## Nota

Con el estado actual del proyecto, **ya se resolvieron los 3 bloqueantes técnicos Android más críticos** (Application ID, firma release e INTERNET en main).

Pendientes para subir a producción:

- Configurar `.env` productivo real (API HTTPS pública, sin localhost)
- Completar formulario Data Safety y Content Rating
- Publicar URL de política de privacidad
- Completar smoke test release en Internal Testing
