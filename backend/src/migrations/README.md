# Scripts de Migración

Este directorio contiene scripts de migración para actualizar la estructura de datos y archivos del sistema.

## migrateGCSStructure.js

Script para migrar modelos 3D existentes a la nueva estructura de carpetas basada en `monumentId`.

### Estructura de Archivos

**Antigua estructura:**
```
/models/{uuid}.glb
```

**Nueva estructura:**
```
/models/monuments/{monumentId}/{timestamp}_{filename}.glb
```

### Características

- ✅ Copia archivos a nueva ubicación sin eliminar los antiguos
- ✅ Crea registros `ModelVersion` para cada modelo
- ✅ Actualiza referencias en `Monument` (model3DUrl, s3ModelFileName)
- ✅ Maneja errores y continúa con el siguiente monumento
- ✅ Incluye función de rollback para revertir cambios

### Uso

#### Ejecutar Migración

```bash
# Desde el directorio backend
node src/migrations/migrateGCSStructure.js
```

#### Ejecutar Rollback

Si la migración falla o necesitas revertir los cambios:

```bash
node src/migrations/migrateGCSStructure.js --rollback
```

⚠️ **IMPORTANTE:** El rollback elimina los archivos nuevos y registros ModelVersion, pero NO restaura automáticamente las referencias antiguas en Monument. Asegúrate de tener un backup de la base de datos antes de ejecutar la migración.

### Proceso de Migración

1. **Preparación:**
   - Asegúrate de tener un backup de la base de datos
   - Verifica que las credenciales de AWS estén configuradas correctamente
   - Revisa que el archivo `.env` tenga `MONGODB_URI` configurado

2. **Ejecución:**
   ```bash
   node src/migrations/migrateGCSStructure.js
   ```

3. **Verificación:**
   - Revisa los logs de la migración
   - Verifica que los monumentos tengan los modelos correctos en la aplicación
   - Comprueba que los archivos nuevos existan en S3

4. **Limpieza (Opcional):**
   - Una vez verificado que todo funciona correctamente
   - Puedes eliminar manualmente los archivos antiguos de `/models/{uuid}.glb`
   - O mantenerlos como backup

### Salida del Script

El script muestra información detallada durante la ejecución:

```
✓ Conectado a MongoDB

Encontrados 15 monumentos con modelos 3D

  → Copiado: abc123.glb → models/monuments/507f1f77bcf86cd799439011/2024-01-15T10-30-00-000Z_model.glb
✓ Migrado: Machu Picchu (25.50 MB)
⊘ Saltado (ya migrado): Sacsayhuamán
...

✓ Migración completada:
  - 12 monumentos migrados
  - 3 monumentos saltados
  - 0 errores

⚠️  IMPORTANTE: Los archivos antiguos NO han sido eliminados
   Verifica que todo funcione correctamente antes de eliminarlos manualmente
```

### Casos Especiales

#### Monumentos ya migrados
El script detecta automáticamente si un monumento ya tiene un `ModelVersion` activo y lo salta.

#### Archivos no encontrados en S3
Si un archivo referenciado en Monument no existe en S3, el script crea un registro ModelVersion con la URL existente pero no intenta copiar el archivo.

#### Errores durante la migración
Si ocurre un error con un monumento específico, el script lo registra y continúa con el siguiente. Al final muestra un resumen con el número de errores.

### Troubleshooting

**Error: "Cannot connect to MongoDB"**
- Verifica que `MONGODB_URI` esté configurado en `.env`
- Asegúrate de que la base de datos esté accesible

**Error: "AWS credentials not found"**
- Verifica que `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION` estén configurados

**Error: "File not found in S3"**
- El archivo referenciado en Monument no existe en S3
- El script creará un registro con la URL existente
- Revisa manualmente estos casos después de la migración

### Otros Scripts de Migración

- `migrateQuizStructure.js` - Migra estructura de quizzes
- `addLocationToInstitutions.js` - Agrega campos de ubicación a instituciones

## Notas Importantes

- Siempre haz backup de la base de datos antes de ejecutar migraciones
- Prueba las migraciones en un ambiente de desarrollo primero
- Los scripts de migración son idempotentes (pueden ejecutarse múltiples veces)
- Revisa los logs cuidadosamente después de cada migración
