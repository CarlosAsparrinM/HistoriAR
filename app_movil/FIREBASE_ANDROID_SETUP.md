# Firebase Android Setup - HistoriAR

## Estado actual

El archivo `android/app/google-services.json` existente está configurado para el package name:

- `com.carlos.historiar`

Pero el proyecto Android de HistoriAR ya quedó alineado al package final:

- `com.historiar.app`

## Qué debes hacer en Firebase Console

No es posible generar un `google-services.json` válido solo editando el archivo local. Debes descargar uno nuevo desde Firebase con el package correcto.

### Pasos

1. Abre Firebase Console.
2. Entra al proyecto de HistoriAR o crea uno nuevo si hace falta.
3. Agrega una nueva app Android.
4. Usa este package name:
   - `com.historiar.app`
5. Registra el SHA-1 y SHA-256 si vas a usar Google Sign-In, Dynamic Links o notificaciones con autenticación.
6. Descarga el nuevo `google-services.json`.
7. Reemplaza este archivo en:
   - `android/app/google-services.json`

## Importante

- El `google-services.json` debe coincidir exactamente con el `applicationId` de producción.
- Si cambias el package name después, debes volver a descargar el archivo desde Firebase.
- No se debe reutilizar el archivo anterior de `com.carlos.historiar` para un build con `com.historiar.app`.

## Validación esperada

Después de reemplazar el archivo, valida con:

```powershell
cd app_movil
flutter analyze
flutter build appbundle --release
```

Si Firebase está bien configurado, el build debería continuar usando el plugin `com.google.gms.google-services` sin errores de package mismatch.
