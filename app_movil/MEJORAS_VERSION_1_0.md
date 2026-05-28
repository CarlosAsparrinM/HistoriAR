# MEJORAS PENDIENTES PARA LA VERSION ESTABLE 1.0

**Proyecto:** HistoriAR Mobile
**Fecha:** Mayo de 2026
**Objetivo:** Consolidar los pendientes funcionales, visuales, de rendimiento y de salida a produccion para considerar la aplicacion como version estable 1.0.

---

## 1. Objetivo del documento

Este documento resume todo lo que aun falta o conviene mejorar antes de declarar HistoriAR Mobile como una version 1.0 estable.

La lista separa lo que es realmente bloqueante de lo que es una mejora importante o una optimizacion que puede planificarse para una version posterior.

---

## 2. Estado general actual

La aplicacion ya tiene base funcional en estas areas:

- Inicio de sesion y registro.
- Mapa y visualizacion de monumentos.
- Tours con sesiones activas.
- Realidad aumentada.
- Quiz por monumento.
- Perfil y configuracion.
- Persistencia local basica con SharedPreferences.
- Carga de contexto y caché parcial en memoria.

Sin embargo, todavia faltan elementos de madurez de producto para una version estable:

- Sistema de mensajes mas completo y consistente.
- Validacion de contraseñas mas fuerte.
- Mejoras visuales en marcadores y recorrido de tours.
- Algoritmo o estrategia formal para rutas mas cortas.
- Mejor soporte offline y caché persistente.
- QA final, accesibilidad y pruebas de integracion.
- Configuracion de produccion lista para publicacion.

---

## 3. Bloqueantes para una version 1.0 estable

### 3.1 Mensajes y feedback unificados

La app no deberia limitarse a mostrar errores.

Hace falta un sistema de feedback con diferentes tipos de mensajes:

- Exito.
- Informacion.
- Advertencia.
- Carga.
- Error.
- Confirmacion.

Esto aplica a:

- Inicio de sesion.
- Registro.
- Inicio y fin de tours.
- Confirmacion de terminos y condiciones.
- Guardado de configuracion.
- Errores de red.
- Acciones sobre perfil.
- Acciones en AR y quiz.

### 3.2 Diseño de mensajes

Los mensajes actuales funcionan, pero son basicos.

Se necesita:

- Un componente visual uniforme para mensajes.
- Iconos segun el tipo de mensaje.
- Colores consistentes.
- Titulo y descripcion en los mensajes importantes.
- Estados de carga visibles mientras la accion esta en curso.
- Mensajes menos tecnicos y mas orientados al usuario final.

### 3.3 Politica de contraseñas

La validacion actual es muy floja para una version estable.

Hoy basta con una longitud minima simple, pero para 1.0 deberia incluir:

- Longitud minima mayor.
- Mayusculas.
- Minusculas.
- Numeros.
- Caracter especial.
- Confirmacion de contraseña.
- Indicador visual de fortaleza.

Tambien conviene mostrar reglas claras antes de enviar el formulario.

### 3.4 QA final y sign-off

Antes de publicar una 1.0 estable hace falta cerrar:

- Pruebas manuales en dispositivo real.
- Pruebas web responsive.
- Verificacion de accesibilidad.
- Revisión de errores visuales.
- Sign-off final de QA.

### 3.5 Produccion real

Para release estable tambien falta:

- URL de backend de produccion.
- Variables de entorno de produccion.
- Credenciales reales para OAuth.
- Firma de release final.
- Verificacion de que la app no dependa de localhost.

---

## 4. Mejoras importantes de UX y producto

### 4.1 Login y registro

Faltan mejoras de experiencia en:

- Mensajes visuales mas claros al iniciar sesion.
- Mensajes de exito al registrarse.
- Feedback visible al aceptar terminos y condiciones.
- Mejor manejo de errores de autenticacion.
- Indicacion de carga mientras se valida login o registro.

### 4.2 Tours

El flujo de tours ya funciona, pero necesita mejor presentacion.

Faltan:

- Mensajes de inicio, pausa y fin de tour con mejor diseño.
- Mensajes de error mas amistosos.
- Estado visual mas claro de la sesion activa.
- Señal visual de la siguiente parada.
- Mejor diferenciacion entre paradas activas y completadas.

### 4.3 Marcadores de monumentos

Los marcadores actuales deben mejorar para facilitar lectura rapida en mapa.

Se recomienda agregar:

- Marcadores numerados por orden del tour.
- Marcador activo con mayor presencia visual.
- Marcador completado con estado distinto.
- Marcador bloqueado o no disponible.
- Marcadores con leyenda clara.
- Etiqueta con distancia o posicion cuando sea util.

### 4.4 Ruta del tour

Si se quiere mostrar la ruta mas corta o mas clara, falta definir una estrategia formal.

Opciones recomendadas:

- Ordenar paradas por distancia al siguiente punto.
- Calcular ruta sugerida en backend.
- Usar un grafo de paradas para optimizar recorridos.
- Usar heuristicas simples como nearest-neighbor y refinamiento posterior.

La mejor opcion depende del alcance real del proyecto.

---

## 5. Sistema de rutas y nodos

### 5.1 Lo que realmente hace falta

No basta con dibujar nodos decorativos.

Hace falta una solucion de recorrido que indique claramente a la persona:

- Cual es la siguiente parada.
- Cual es la ruta sugerida.
- Cuanto falta para llegar.
- Que monumentos ya fueron visitados.
- Cual es el orden optimo si el tour lo permite.

### 5.2 Solucion recomendada

La mejor ruta tecnica es esta:

1. Mantener el orden del tour definido por backend o administrador.
2. Resaltar la proxima parada dentro del mapa y la lista.
3. Dibujar una polilinea o guia visual entre puntos si la experiencia lo requiere.
4. Calcular distancia entre usuario y siguiente parada.
5. Si se quiere optimizacion real, resolverla en backend y no solo en UI.

### 5.3 Alternativas

Si no se quiere un algoritmo complejo, una alternativa valida es:

- Mostrar paradas en orden numerado.
- Resaltar la parada activa.
- Mostrar progreso y distancia a la siguiente.
- Usar una linea simple entre puntos del tour.

Esto ya mejora bastante la experiencia sin complicar demasiado la arquitectura.

---

## 6. Offline y caché local

### 6.1 Lo que ya existe

La aplicacion ya usa almacenamiento local en partes puntuales y caché en memoria para algunas consultas.

### 6.2 Lo que falta

Para una version estable todavia faltan mecanismos mas solidos para:

- Guardar monumentos para consulta offline.
- Guardar contexto reciente del tour de forma persistente.
- Guardar modelos 3D o recursos AR para uso sin red.
- Guardar configuraciones y preferencias con mejor estructura.
- Mantener respuesta rapida aunque la red falle.

### 6.3 Recomendacion

Se puede implementar una capa local con:

- Caché persistente de monumentos y tours.
- Versionado de cache.
- Expiracion de datos.
- Descarga opcional de modelos o recursos.
- Modo offline parcial con datos previamente sincronizados.

---

## 7. Accesibilidad y calidad visual

### 7.1 Accesibilidad

Antes de la version estable conviene cerrar:

- Etiquetas semanticas en botones e imagenes.
- Contraste correcto en textos y fondos.
- Tamaños tactiles minimos.
- Mejor lectura de mensajes en pantallas pequenas.
- Compatibilidad razonable con screen reader.

### 7.2 Responsive design

Todavia hay que validar bien:

- Pantallas pequenas.
- Tabletas.
- Landscape.
- Zoom de texto.

### 7.3 Tipografia y feedback visual

Faltan mejoras para que la app se vea mas consistente:

- Titulos jerarquizados.
- Mensajes con mejor peso visual.
- Estados claros de carga y exito.
- Componentes de alerta mas pulidos.

---

## 8. Calidad tecnica y pruebas

### 8.1 Pruebas automáticas

Hoy hay muy poca cobertura automatica.

Faltan pruebas para:

- Login.
- Registro.
- Validacion de terminos.
- Tour activo.
- Inicio y fin de tour.
- Error de red.
- Mapa y seleccion de monumentos.
- AR.
- Quiz.
- Configuracion.

### 8.2 Pruebas de integracion

Se recomienda agregar pruebas de integracion para validar:

- Flujo completo de login.
- Flujo completo de tour.
- Flujo de seleccion de monumento.
- Flujo AR + quiz.
- Recuperacion despues de cierre o reinicio.

### 8.3 Pruebas manuales

Tambien faltan evidencias de:

- Funcionamiento real en dispositivo fisico.
- Rendimiento con mala conexion.
- Lectura de mensajes en condiciones reales.
- Comportamiento del mapa con varios monumentos.

---

## 9. Seguridad y politicas

### 9.1 Contraseñas y acceso

Debe reforzarse la seguridad de credenciales con:

- Politica de contraseña fuerte.
- Mensaje de ayuda para crear contraseñas seguras.
- Validacion en cliente y servidor.

### 9.2 Terminos y privacidad

Se recomienda que la experiencia de terminos y politica tenga:

- Confirmacion visual clara.
- Boton o estado de aceptacion bien destacado.
- Acceso facil al texto completo.

### 9.3 Privacidad de datos

Debe mantenerse alineado con:

- Uso de datos de ubicacion.
- Almacenamiento local.
- Servicios de terceros.
- Posible uso offline.

---

## 10. Prioridad recomendada

### Bloqueante para 1.0

- Sistema unificado de mensajes.
- Politica de contraseña fuerte.
- QA final y sign-off.
- Configuracion de produccion real.
- Validacion manual minima.

### Importante para 1.0

- Mejoras visuales de mensajes.
- Mejor diseño de login y tours.
- Marcadores mas claros.
- Ruta sugerida para tours.
- Mejor caché local.
- Pruebas de integracion basicas.

### Puede esperar a 1.1

- Algoritmo avanzado de optimizacion de rutas.
- Modo offline completo con descarga previa de recursos.
- Cache persistente sofisticada.
- Ajustes finos de accesibilidad y microinteracciones.

---

## 11. Conclusion

HistoriAR ya tiene una base funcional, pero antes de llamarse version estable 1.0 necesita cerrar especialmente:

- Mensajeria y feedback de toda la app.
- Seguridad de contraseñas.
- Mejora visual de marcadores y tours.
- Ruta clara u optimizada entre monumentos.
- Offline parcial o cache persistente real.
- QA y pruebas finales.

Este documento sirve como guia para cerrar esos puntos antes de publicar.
