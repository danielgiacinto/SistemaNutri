# Planes visuales — Fase 12

Implementación en desarrollo del 12 de noviembre de 2026. La migración **está
aplicada y registrada en el Supabase vinculado** `zisacjleazvlrklwilap`, con la
autorización explícita del usuario. El catálogo y editor están habilitados en
localhost. El código todavía no se desplegó y la fase conserva los pendientes
de verificación detallados al final.

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

El código conserva compatibilidad con entornos anteriores a la migración. Esta
se aplicó y registró en una única transacción, sin reparar el historial completo
ni usar `db push --include-all`. Verificados RLS, cuatro políticas, ausencia de
escritura directa autenticada, bloqueo anónimo de las RPC y una plantilla base.

## Verificación y pendientes

`npm run verificar` final aprobado: lint, tipos, **353 pruebas en 47 archivos** y
build de producción. La primera ejecución encontró un bloqueo EPERM de Windows
al crear un segmento de `.next`; la repetición con permisos locales completó
la verificación sin cambios funcionales adicionales.

Tras aplicar la migración se corrigió la carga progresiva del detalle del plan
con un límite explícito de Suspense y se agregó identificación de paciente y
consultorio a la impresión de versiones anteriores. La verificación completa
volvió a aprobarse con **353 pruebas**, lint, tipos y build.

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

## Validación después de aplicar la migración

- Prueba remota dentro de BEGIN/ROLLBACK, con las RPC de la aplicación y el rol
  autenticado: crear y duplicar plantilla, asignar como copia, modificar original
  sin alterar el borrador, incorporar Biblioteca con instantánea del servidor,
  publicar, reintentar sin duplicar, rechazar destinatario incorrecto sin guardar
  parcialmente, detectar revisión desactualizada, cambiar Biblioteca/borrador sin
  alterar la publicación y republicar una segunda versión.
- Con identidad de paciente en la misma transacción se verificó que no lee
  borradores ni plantillas privadas y sí sus publicaciones, con el contenido nuevo.
  Todo se revirtió. Consulta posterior: cero plantillas, planes o cuentas de ensayo.
- En navegador con la sesión existente: catálogo real habilitado, selector de
  paciente sin crear borrador, listado de los tres planes anteriores, apertura en
  editor visual, vista previa e impresión de una versión histórica con identificación.
  Sin errores nuevos tras corregir la carga progresiva. No se modificaron planes existentes.
- La revisión automática rechazó crear cuentas y consultorio ficticios mediante
  la API administrativa por no estar esa operación explícitamente autorizada.
  No se crearon cuentas; se usó la alternativa transaccional descrita arriba.

Pendientes de cierre: recorrido de escritura completo en navegador con cuentas
dedicadas, prueba de impresión con documentos largos y despliegue. La exportación
actual usa el diálogo del navegador; el correo opcional de 12D queda para una
entrega posterior. No es necesario reaplicar manualmente la migración al publicar
contra este mismo Supabase.
