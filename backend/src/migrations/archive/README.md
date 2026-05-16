# Migraciones Archivadas

Esta carpeta contiene migraciones one-shot que ya fueron ejecutadas en producción y se mantienen como referencia histórica.

## Migraciones Completadas

### addLocationToInstitutions.js
Agregó campos de ubicación (latitude, longitude) al esquema de instituciones.

### checkInstitutions.js
Script de verificación de integridad de datos de instituciones.

### migrateQuizStructure.js
Migró la estructura de quizzes al nuevo formato con soporte para múltiples opciones.

### migrateS3Structure.js
Reorganizó la estructura de archivos en S3 al nuevo formato de carpetas.

### updateInstitutionSchema.js
Actualizó el esquema de instituciones con nuevos campos requeridos.

## Nota

Estas migraciones NO deben ejecutarse nuevamente. Se mantienen aquí solo como referencia histórica y documentación de cambios en el esquema de datos.
