# Finanzas del consultorio — Fase 7

## Alcance y ubicación

`/panel/configuracion/servicios` permite administrar el catálogo de servicios y
precios, con accesos desde Agenda y Nuevo turno. Los servicios pueden
tener el mismo precio o ser sin cargo. El alta del turno usa únicamente «Servicio
y precio»; el tipo anterior se conserva internamente para los turnos históricos.
`/panel/finanzas` permite administrar cobros, historial,
movimientos manuales y configuración. La agenda ofrece cobro rápido mediante un
diálogo sin cambiar de pantalla. La ficha del paciente incorpora “Pagos y deudas”.
El inicio muestra un único gráfico de líneas de ingresos: día (por hora), semana
(últimos siete días) y mes (últimos doce meses). Reemplaza el gráfico de turnos y
evita repetir indicadores clínicos. Finanzas muestra tres totales breves y las
secciones Cobros y Caja; los formularios de alta, edición, corrección
y configuración se abren en diálogos. Los filtros adicionales quedan plegados.
Estos registros son internos: no emiten facturas fiscales ni cobran con una pasarela.
La suscripción a Nutrisfera conserva sus tablas, pantallas y procesos anteriores.

## Entidades y permisos

Migración: `supabase/migrations/20261106000000_finanzas_consultorio.sql`.

- `servicios_consultorio`: catálogo propio del profesional; precio cero indica gratuidad.
- `configuracion_financiera`: moneda, vencimiento, medios y preferencias de correo.
- `operaciones_consultorio`: una por turno; copia nombre, precio y moneda del servicio.
- `pagos_consultorio`: importes recibidos, fecha efectiva, usuario y clave idempotente.
- `ajustes_consultorio`: historial de descuentos y bonificaciones.
- `movimientos_consultorio`: ingresos, egresos, devoluciones y compensaciones.
- `consentimientos_cobro`: autorización explícita del paciente, inicialmente ausente.
- `recordatorios_cobro` e `intentos_recordatorio_cobro`: cola y resultados de envío.

Todas las tablas tienen RLS. Cada profesional consulta únicamente su información,
incluso si comparte consultorio con otro profesional. No hay escritura directa desde
PostgREST: pagos, ajustes y demás cambios pasan por `gestionar_finanzas`, que obtiene
usuario y consultorio de la sesión de PostgreSQL. Las Server Actions también exigen
`requerirProfesional()` y validan los datos con Zod. No se usan credenciales de
servicio para solicitudes de los profesionales.

Las relaciones compuestas existentes preservan el aislamiento del paciente y turno.
No se otorgan permisos de borrado de pagos ni movimientos a los usuarios.

## Reglas económicas

- Los importes se almacenan con `numeric(14,2)` y se rechazan importes no finitos,
  negativos o con más de dos decimales antes de persistirlos.
- El turno conserva su operación aunque se reprograme. Cambiar el precio o nombre
  del catálogo no modifica el precio ni la descripción históricos.
- Un turno sin servicio queda “Sin configurar”; no se presume gratuito. El diálogo
  permite resolverlo asignando un servicio. No se modifican masivamente turnos anteriores.
- La operación puede existir antes de atender para admitir anticipos. Solo una
  consulta `completado` con saldo constituye deuda exigible. Cancelados y ausentes
  quedan excluidos de las deudas y recordatorios.
- `atendido_en` registra la primera transición efectiva a `completado`. Los turnos
  antiguos no reciben una fecha efectiva inventada y no se incorporan retroactivamente
  a las estadísticas por fecha de atención hasta que se regularicen.
- Completar una consulta no registra un pago. Los servicios gratuitos conservan
  “Sin cargo”; un descuento total sobre un servicio pago se identifica “Bonificado”.
- Cada pago bloquea primero el turno y luego su operación. El saldo y el movimiento
  de ingreso se actualizan en la misma transacción. La clave UUID impide duplicados.
- No se admiten sobrepagos. Los descuentos reemplazan el descuento de esa consulta
  y no pueden reducir el importe final por debajo de lo ya abonado.
- Una cancelación conserva los anticipos y muestra “Anticipo por resolver”. La
  resolución implementada es la devolución explícita del pago completo. No se
  convierten anticipos en crédito automáticamente.
- Una reversión conserva pago, motivo, usuario e historial y genera un egreso
  compensatorio. Las correcciones de movimientos manuales conservan ambos registros.
- Las estadísticas excluyen operaciones corregidas por error. Una devolución sí
  cuenta como salida real. La interfaz y las nuevas operaciones usan pesos argentinos (ARS), sin selectores
  de moneda. El esquema conserva la moneda histórica para evitar conversiones
  implícitas de registros anteriores.
- El saldo de caja expresa ingresos menos egresos; no es ganancia fiscal.

## Recordatorios

Endpoint: `GET /api/finanzas/recordatorios`, protegido por `CRON_SECRET` mediante
`Authorization: Bearer …`. No depende del navegador ni de Mercado Pago.
`vercel.json` define una ejecución diaria a las 12:00 UTC (09:00 de Argentina),
compatible con Vercel Hobby. En ese plan puede ejecutarse entre las 09:00 y las
09:59 de Argentina. El envío se realiza en la siguiente ejecución posterior al plazo,
por lo que los avisos y reintentos pueden quedar pendientes hasta la ejecución del
día siguiente; si se acumulan más de 10 avisos, el resto espera ejecuciones posteriores.
Para procesarlos con mayor frecuencia se necesita un plan o scheduler que lo permita.

El profesional activa la función y configura los plazos (inicialmente 24 y 48 horas),
texto, nombre e instrucciones. Además, debe registrar la autorización del paciente
desde el detalle del cobro. No se infiere consentimiento del correo existente.

La preparación omite consultas gratuitas, bonificadas, saldadas o no atendidas. Una
clave única por operación y plazo impide duplicar eventos. El trabajador reclama
hasta 10 avisos con `FOR UPDATE SKIP LOCKED` y vuelve a consultar saldo y autorización
inmediatamente antes de enviar. Un pago cancela futuros avisos pendientes. Los
recordatorios manuales también requieren atención, saldo y consentimiento.

Variables de entorno (también documentadas en `.env.example`):

```
CRON_SECRET
CORREO_COBROS_HOST
CORREO_COBROS_PUERTO=465
CORREO_COBROS_TLS=true
CORREO_COBROS_USUARIO
CORREO_COBROS_CLAVE
CORREO_COBROS_REMITENTE
```

Se reutiliza Nodemailer y, si no se configura un transporte específico, el Gmail SMTP
existente (`CORREO_COMERCIAL_USUARIO` y `CORREO_COMERCIAL_CLAVE_APLICACION`). Los correos
de pacientes usan el nombre de consultorio configurado. Las variables `CORREO_COBROS_*`
permiten elegir un transporte específico sin modificar los avisos comerciales. Si
se completa parcialmente esa configuración, se informa como incompleta y no se
mezclan credenciales de proveedores distintos. El remitente debe estar
autorizado por el proveedor SMTP. Nunca se guardan claves en la base ni en el cliente.

Las fallas previas a establecer conexión se reintentan hasta cuatro intentos, con
esperas de 15, 30 y 45 minutos sujetas a la frecuencia del scheduler. Los timeouts y
reclamos abandonados se marcan “incierto”: SMTP no permite garantizar entrega
exactamente una vez tras una desconexión. No se reenvían automáticamente mensajes
que podrían haberse entregado. El historial permite identificar estos casos y el
profesional puede programar un nuevo aviso manual después de revisarlos.

## Puesta en marcha y verificación

1. Aplicar las migraciones con el flujo habitual de Supabase antes de desplegar el código.
2. Configurar SMTP y `CRON_SECRET` en el servidor, y habilitar la ejecución programada.
3. Configurar servicios reales; no se incluyen precios de ejemplo ni datos simulados.
4. Verificar en un entorno de prueba el diálogo de cobro en móvil y escritorio,
   y la entrega con el proveedor SMTP elegido.

Las pruebas en `pruebas/bd/finanzas.test.ts` ejecutan todas las migraciones sobre
PostgreSQL PGlite. Cubren precios históricos, gratuidad, descuentos, anticipos,
cancelación, reversiones, saldo, idempotencia, solicitudes simultáneas y RLS.
Las pruebas unitarias de recordatorios y cron verifican secreto, saldo actualizado,
cancelación, configuración y clasificación de fallas sin enviar correos reales.

Resultado de la verificación de esta entrega: `npm run verificar` aprobado,
con lint, tipos, 230 pruebas en 31 archivos y compilación de producción correctos.
Además de las pruebas en PGlite, la migración `20261106000000` se aplicó en una
transacción y se registró en Supabase hospedado de desarrollo el 5/11/2026.

La comprobación autenticada en localhost cubrió alta/edición/desactivación de
servicios, alta de paciente y turnos, precio histórico, anticipo parcial, segundo
pago, descuento, reversiones, bonificación, consulta gratuita, historial económico,
deudas, caja y estadísticas. Los datos ficticios se identificaron como temporales
y se retiraron por sus identificadores exactos, conservando la auditoría. Se
confirmó que el paciente y los servicios temporales, las operaciones y movimientos
de prueba y la cola activa quedaron en cero al terminar.

El panel y Finanzas se recargaron después de la limpieza sin errores visibles ni
nuevos errores de consola observados. Se comprobaron la pantalla financiera y el
diálogo a 390 px, sin desbordamiento horizontal. El SMTP existente superó la
comprobación de conexión/autenticación, sin enviar mensajes. El endpoint de cron
devolvió 401 sin credenciales y se verificaron sus permisos en PostgreSQL. No se
ejecutó un envío real de recordatorios ni se desplegaron cambios en Vercel.

## Límites actuales

- Las devoluciones revierten un pago completo; para una devolución parcial se necesita
  dividir la operación original en pagos separados antes de registrarlos.
- No se implementan créditos transferibles entre turnos, penalizaciones automáticas,
  pasarelas de cobro ni facturación fiscal.
- La pantalla financiera calcula indicadores sobre el historial propio del profesional.
  Para historiales grandes convendrá agregar paginación y agregaciones dedicadas en SQL.
  Los diálogos y las consultas de agenda ya solicitan únicamente sus operaciones.
- Quedan por comprobar la entrega SMTP real y el scheduler desplegado. La revisión
  automática bloqueó disparar el cron completo durante la prueba porque esa acción
  podría enviar correos a pacientes; se verificaron conexión SMTP, autorización y
  permisos sin ejecutar envíos.

## Revisión de diseño en localhost

Se verificaron las vistas día/semana/mes del gráfico, la ausencia de indicadores
repetidos y el ícono de billetera en Finanzas. Se comprobó alta, edición y
desactivación de un servicio desde diálogos, cierre automático al guardar,
guardado de configuración y apertura del registro de caja. El servicio temporal
se retiró al terminar. El inicio, Finanzas y los diálogos se revisaron a 390 px
sin desbordamiento horizontal; no se observaron nuevos errores de consola.
