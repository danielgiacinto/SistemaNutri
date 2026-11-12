# Planes visuales — Fase 12

Implementación local del 12 de noviembre de 2026. La fase todavía no está cerrada:
su migración **no está aplicada al Supabase vinculado** y el código no se desplegó.
La revisión automática rechazó la ejecución remota porque cambia el esquema y
el historial de migraciones sin autorización explícita en este pedido.

## Experiencia implementada

- En Planes se separan Plantillas y Planes de pacientes. El catálogo tiene búsqueda,
  orden por nombre/actualización, etiquetas y filtros de procedencia y sin entregar.
  Cuenta usos y pacientes con alguna publicación por separado.
- Crear plantilla, duplicar y usar para un paciente. Una base original de Nutrisfera
  está protegida y se puede copiar. Usar crea un borrador independiente; no entrega.
  La ficha del paciente conserva Crear desde cero y suma Usar plantilla.
- Editor con objetivo, etiquetas organizativas, semana de siete días, opciones
  diarias, texto libre e indicaciones. Agregar, quitar, duplicar, subir y bajar
  bloques con botones accesibles. En móvil cada día se recorre por separado.
- Semanas y opciones pueden guardarse como grillas e insertarse como copias.
- Selección de platos, platos por grupos y suplementos de la Biblioteca propia.
  La cantidad es explícita y el suplemento requiere elegir su variante. Los
  recursos base de Biblioteca se copian primero a la colección propia.
- Resumen de contenido y aportes por recurso en la vista previa, usando los cálculos
  de Biblioteca. Las opciones no se suman como si fueran una ingesta diaria; el
  texto libre y los nutrientes sin dato no se estiman.
- Guardado explícito con estado y errores recuperables en memoria. Aviso accesible
  antes de seguir enlaces con cambios pendientes y protección al cerrar/recargar.
  No se persiste contenido clínico en localStorage ni en cachés públicas.
- Vista previa y portal comparten el mismo componente de documento. La entrega
  confirma nombre y paciente concreto, número y contenido de la versión.
- Historial con lectura e impresión de cada publicación. La ruta autenticada
  `/planes/impresion/[publicacionId]` permite imprimir o guardar PDF desde el navegador,
  con los siete días, versión, fecha, porciones y datos del remitente/destinatario
  conservados al publicar. No genera un adjunto ni envía correos automáticamente.

## Datos y permisos

Migración: `20261112200000_planes_visuales.sql`.

`plantillas_planes` separa las bases de plataforma de las plantillas/grillas del
consultorio, con versión y licencia. RLS por operación; clientes autenticados solo
pueden leer. Escrituras por RPC con autorización, validación y consultorio de sesión.
La base original de Nutrisfera permite copia y adaptación dentro de la aplicación.

Los planes y sus publicaciones agregan un documento JSON por bloques, con orden
estable. Las comidas y publicaciones anteriores se conservan y se adaptan al
editor sin modificar su contenido persistido. El API anterior no puede sobrescribir
ni publicar un documento visual.

`guardar_plan_visual` bloquea la fila, comprueba la revisión esperada y valida
también llamadas directas a la RPC. Guardar y publicar forman una sola transacción:
un destinatario incorrecto no guarda parcialmente el borrador. El identificador de
solicitud permite reintentar sin crear otra versión cuando se pierde la respuesta.

Las referencias de Biblioteca se resuelven contra versiones persistidas del mismo
consultorio; las instantáneas aportadas por el navegador se descartan. Se conserva
la versión de los insumos y la variante elegida, sin depender de cambios posteriores.
El portal mantiene su RLS: solo publicaciones del paciente vinculado y activo.

Hasta aplicar la migración se mantiene el listado y el editor anterior, para que
los planes existentes sigan funcionando. La migración debe ejecutarse en una
transacción y registrarse solo después de aplicarse correctamente; no reparar el
historial completo ni usar `db push --include-all`.

## Verificación y pendientes

`npm run verificar` final aprobado: lint, tipos, **353 pruebas en 47 archivos** y
build de producción. La primera ejecución encontró un bloqueo EPERM de Windows
al crear un segmento de `.next`; la repetición con permisos locales completó
la verificación sin cambios funcionales adicionales.

- Pruebas de base: copia independiente, bases protegidas, permisos directos,
  anonimato, aislamiento, destinatario, publicación atómica, reintento idempotente,
  conflictos de revisión, historial y compatibilidad con el API anterior.
- Pruebas unitarias de adaptación de comidas, identidades de copias y nutrientes
  ausentes. Pruebas existentes de planes conservadas.
- Revisión visual en localhost con componentes reales y datos ficticios temporales:
  catálogo, filtros, editor, duplicación, vista previa, navegación de días y diálogo
  de destinatario. A 390 px, documento de 390 px y diálogo de 358 px, sin desborde.
- El aviso de salida por enlaces se cambió a un diálogo accesible de la aplicación;
  se verificó seguir editando conservando cambios y salir descartando la muestra.
- Sin errores/advertencias de consola en el recorrido final. Muestra temporal retirada.
  No se guardaron plantillas ni se entregaron planes a pacientes reales.
- Verificado el listado real contra el esquema anterior: los planes existentes siguen
  accesibles mientras la migración está pendiente.

Pendientes de cierre: autorización y aplicación de la migración, recorrido real
plantilla → borrador → publicación → portal → nueva versión, prueba de impresión
con documentos largos y despliegue. La exportación actual usa el diálogo del navegador;
el correo opcional de 12D queda para una entrega posterior.
