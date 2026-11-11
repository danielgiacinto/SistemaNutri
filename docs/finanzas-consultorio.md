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

### Cómo te pagaron

El resumen superior mantiene los tres indicadores económicos dentro de una tarjeta
con cabecera y mes actual. Cada indicador tiene icono, fondo suave, importe destacado
y aclaración del alcance: ingresos y egresos del mes; deuda pendiente acumulada de
consultas atendidas. Se organiza en tres columnas con espacio suficiente y se apila
en celular, usando únicamente los tokens de tema de Nutrisfera.

Finanzas incorpora un bloque destacado sobre las pestañas Cobros y Caja, visible en
ambas secciones. Muestra barras horizontales por medio, importe y porcentaje del
total, cantidad de ingresos y medio principal. Abre en el mes actual y permite
recorrer meses anteriores, desde el primer ingreso registrado hasta el mes actual.
Sin ingresos muestra un estado vacío; la información se adapta a celular y los
valores también se leen como texto, sin depender del color o de pasar el puntero.

El desglose usa los ingresos efectivos en ARS, incluidos los movimientos manuales,
según la fecha de cobro en la zona horaria del consultorio. Las cantidades representan
ingresos, no consultas: dos abonos parciales son dos ingresos. Las correcciones por
error se excluyen incluso si se efectuaron en otro mes. Las devoluciones conservan
el ingreso original y figuran como egreso, por lo que el gráfico expresa ingresos
brutos recibidos. No es el saldo neto. Los importes se suman en centavos y los nombres
de medios se agrupan sin diferencias de mayúsculas o espacios sobrantes. Los filtros
del listado no cambian este resumen mensual. No requiere una nueva migración.

Verificación del 11/11/2026: revisión visual a 937 y 390 px, valores conciliados con
los movimientos existentes y visibilidad del gráfico en Cobros y Caja. Pruebas
unitarias de importes, porcentajes, pagos parciales, correcciones entre meses,
devoluciones, monedas, nombres personalizados y límites de mes según zona horaria.
`npm run verificar` completo aprobado: lint, tipos, 271 pruebas en 38 archivos y build.
Sin registrar cobros ni movimientos durante la revisión visual; sin despliegue.

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
- La ejecución espontánea del scheduler desplegado sigue pendiente de observación.
  Su endpoint publicado se verificó manualmente el 11/11 con un envío real y una
  repetición sin duplicados. El 11/11 también se verificó
  el envío individual autorizado: la primera prueba llegó a Correo no deseado y
  las dos muestras posteriores con diseño llegaron a Recibidos, según confirmó el usuario.
  Este resultado corresponde a esa casilla y esos mensajes.

## Prueba de correo autorizada (11/11/2026)

Se creó una consulta identificada como «PRUEBA de correo — sin cobro real», con
importe ficticio de ARS 1, para el paciente indicado por el usuario. Se registró
la autorización temporal y se programó un solo recordatorio desde el navegador.
El trabajador real de `recordatorios-cobro.ts` envió ese aviso usando un adaptador
de ensayo que reclama únicamente el identificador autorizado: no ejecuta la
preparación ni el reclamo global del cron. La validación de saldo y consentimiento
y la confirmación del intento usaron las funciones reales de PostgreSQL.

SMTP aceptó el mensaje el **11/11/2026 a las 11:39 (Argentina)**: un enviado, cero
fallos y un único intento registrado. El usuario confirmó su recepción en **Correo
no deseado** de Outlook. El texto aclaraba que era una prueba y que no correspondía
pagar. La operación se bonificó al finalizar, se canceló el turno ficticio y se
retiró la autorización temporal. El servicio de prueba quedó desactivado.
Esto comprueba despacho, recepción y registro del aviso individual; no demuestra
la ejecución futura del scheduler ni la llegada a la bandeja de entrada.

Verificación técnica: `npm run verificar` aprobado, con lint, tipos, **238 pruebas
en 34 archivos** y compilación de producción. El primer intento no pudo descargar
las fuentes de Google dentro del sandbox; la ejecución con acceso de red completó
todos los pasos.

## Diseño compartido y nuevas muestras (11/11/2026)

El recordatorio incorpora HTML con la misma presentación profesional que los avisos
de suscripción: identidad de Nutrisfera, consultorio remitente, saldo destacado,
fecha de consulta, importes y orientación para coordinar el pago. Conserva la
alternativa de texto y no dirige al paciente a la facturación del profesional.
Los nombres, instrucciones y textos configurables se escapan antes de incluirlos
en el HTML. `src/servicios/correos/presentacion.ts` centraliza el marco visual y
`recordatorio-cobro.ts` compone el mismo mensaje utilizado por el trabajador.

Por pedido del usuario se eliminó el servicio «PRUEBA de correo — sin cobro real»,
junto con el turno ficticio cancelado de ARS 1 y sus registros dependientes sin
pagos. Esa limpieza reemplaza el estado de desactivación descrito en la primera
prueba. El usuario confirmó que el consultorio de Daniel y sus pacientes contienen
datos de prueba. No se crearon servicios nuevos para las muestras posteriores.

A las **11:53 (Argentina)** se enviaron dos muestras a la casilla indicada por el
usuario: confirmación de suscripción y recordatorio basado en la consulta existente
de «Consulta Rutinaria», con saldo de ARS 35.000. Ambas incluyen `[PRUEBA]` en el
asunto y una aclaración visible de que no existe un cobro real. SMTP aceptó las dos.
Estos envíos de diseño no registraron pagos ni ejecutaron la cola global.
El usuario confirmó que **ambas muestras llegaron a Recibidos y se ven bien al
abrirlas**. Quedan comprobadas la recepción y la presentación en esa casilla;
no se atribuye el cambio de carpeta únicamente al HTML.

La revisión visual cubrió la vista de escritorio y el recordatorio a 390 px.
`npm run verificar` aprobado: lint, tipos, **242 pruebas en 35 archivos** y
compilación de producción. El scheduler desplegado conserva su validación pendiente.

## Cron publicado y prueba automática preparada (11/11/2026)

Con autorización del usuario se publicó el commit `978b7c8` de los correos en
`https://nutrisfera.vercel.app`. Vercel completó el despliegue
`dpl_7yAFGFCGjrTozjCrhZhZ19pF2cTf` en estado `READY`, en Production.
No se modificaron migraciones ni secretos para esta publicación.

Se usó el turno existente de Alberto del **11/11 a las 08:00**, servicio
«Consulta Rutinaria», saldo ARS 35.000. Se marcó atendido y se registró la
autorización de recordatorios. El usuario confirmó que este consultorio y sus
pacientes son datos de prueba, por lo que el turno se conserva.

- Sin credenciales, el endpoint publicado respondió **401**.
- Ejecución manual del endpoint publicado a las **12:22**: **200**, un enviado,
  cero fallos. El aviso `b6ceb5e5-0d9f-48cc-b6a7-269e6764ebaa` quedó enviado con
  un intento. Se utilizó el trabajador completo, sin adaptadores de ensayo.
- Repetición inmediata: **200**, cero envíos y cero fallos, sin duplicar el aviso.
- El usuario confirmó recepción en **Recibidos** y presentación correcta.

Antes de ejecutar se comprobó, con conteos sin leer los registros de terceros,
que no había colas activas ni automatizaciones de otros profesionales. La cola
propia contenía únicamente el aviso autorizado de esta consulta.

Para observar la siguiente ejecución natural se dejaron recordatorios automáticos
habilitados en el consultorio de Daniel, con **un único plazo de 1 hora**, autorización
de Alberto y texto explícito de prueba: no corresponde realizar ningún pago real.
Una tercera llamada publicada respondió **200**, cero envíos y cero fallos, y generó
el aviso `98d794a1-3e37-4f20-9204-15c32e040ced`, clave `automatico-1`, pendiente,
cero intentos y fecha de elegibilidad **11/11/2026 a las 13:20 (Argentina)**.

El cron diario sigue configurado a las 12:00 UTC: su próximo despacho esperado es
el **12/11/2026 entre las 09:00 y las 09:59 de Argentina**, si continúa el saldo,
la autorización y la automatización habilitada. La hora de elegibilidad mostrada
en la interfaz no es una promesa de entrega inmediata: el cron lo procesa en su
siguiente ejecución. No se programó una automatización adicional de Codex.

**Pendiente de cierre:** observar ese disparo espontáneo de Vercel y confirmar su
recepción. Las llamadas manuales anteriores verifican el endpoint y el trabajador
publicados, pero no prueban por sí mismas que el scheduler haya disparado un evento.
La consulta de logs de la mañana no pudo recuperarse: la API informó que el plan
Hobby no retiene ese rango histórico; no se interpretó como ausencia de ejecuciones.

## Revisión de diseño en localhost

### Filtros y distribución adaptable de cobros (11/11/2026)

«Pendientes» incluye saldos sin pagar y pagos parciales de turnos programados,
confirmados o completados. «Deudas de consultas atendidas» conserva la regla de
deuda exigible; «Vencidos» solo considera esas deudas. Los turnos cancelados,
ausentes, saldados, gratuitos y bonificados quedan fuera de Pendientes.
El indicador superior se llama «Deuda de consultas atendidas» para distinguirlo
de los saldos de turnos que todavía no se atendieron. El resumen del listado
muestra la cantidad y el saldo de los resultados efectivamente filtrados.

La vista elige tabla o tarjetas según el ancho disponible del panel, incluyendo
el espacio ocupado por el menú lateral. La tabla usa columnas proporcionadas,
saldo alineado a la derecha y acción compacta con nombre accesible. Las tarjetas
ordenan paciente/servicio, saldo, fecha, estado y acción, sin repetir insignias.
Se revisaron 390, 1081 y 1440 px sin desbordamiento horizontal.

Con los datos de Daniel: Pendientes mostró dos resultados por ARS 65.000, Pagado
dos por saldo cero, y Deudas de consultas atendidas ninguno. Se probaron además
exclusiones, pagos parciales y vencimientos. `npm run verificar` aprobado:
**249 pruebas en 35 archivos**, lint, tipos y compilación. Cambios en localhost.

### Envío inmediato y portal del paciente (11/11/2026)

- «Enviar recordatorio ahora» reclama únicamente el aviso del turno del profesional
  autenticado y lo despacha dentro de la Server Action. No prepara ni ejecuta la cola
  global. Conserva la clave idempotente, evita reclamar dos veces el mismo intento y
  limita a un minuto los nuevos avisos manuales de una consulta.
- El envío automático mantiene su configuración independiente y el cron diario.
  Ambos modos requieren consulta completada y finalizada, saldo y consentimiento.
- El diálogo separa Cobro, Recordatorios e Historial. El saldo y su estado aparecen
  una sola vez. La lista financiera usa un botón «Cobros» sin repetir la insignia y
  pasa a tarjetas en pantallas medianas para evitar desplazamiento horizontal.
- La configuración agrupa la automatización y pliega la personalización de correos.
- El correo enlaza a `/portal/turnos?turno=…`, tanto en HTML como en texto. El portal
  conserva el destino al iniciar sesión y consulta el turno mediante RLS. El resumen
  económico procede de `consultar_mis_cobros()`, limitado a la ficha activa vinculada
  a `auth.uid()`, con columnas mínimas y únicamente después de finalizar la consulta.
  No se concedió acceso de pacientes a las tablas financieras del profesional.

Migración `20261111170000_envio_inmediato_y_cobros_portal.sql`: aplicada y registrada
en una transacción en Supabase de desarrollo. Se conservó el historial anterior;
`db push --dry-run` detectó versiones remotas antiguas ausentes localmente, por lo
que se aplicó exclusivamente esta migración mediante `db query --linked`.

Prueba desde el botón en localhost a las **12:43**: aviso
`6f0f37c2-1d38-4742-ae51-708ef4246738`, enviado, un intento. El automático pendiente
se conservó. El usuario confirmó que recibió el correo y que el enlace muestra el
saldo pendiente en el portal. La lectura con la identidad de Alberto mostró solo
sus dos consultas ya finalizadas, sin exponer sus turnos futuros.

Verificación final: `npm run verificar` aprobado, **246 pruebas en 35 archivos**, lint,
tipos y compilación. La interfaz se revisó en el navegador local. Estos cambios de
envío inmediato y portal todavía no se publicaron en Vercel.

Se verificaron las vistas día/semana/mes del gráfico, la ausencia de indicadores
repetidos y el ícono de billetera en Finanzas. Se comprobó alta, edición y
desactivación de un servicio desde diálogos, cierre automático al guardar,
guardado de configuración y apertura del registro de caja. El servicio temporal
se retiró al terminar. El inicio, Finanzas y los diálogos se revisaron a 390 px
sin desbordamiento horizontal; no se observaron nuevos errores de consola.

## Caja y catálogo — Fase 9 (11/11/2026)

Agenda envía a Caja su mes y el contexto de regreso. El selector financiero guarda
`mes` en la URL y sincroniza indicadores, medios de pago, servicios y movimientos.
Consultar otro mes conserva el retorno a la fecha/vista inicial. La ficha financiera
de un paciente mantiene su alcance propio; no recibe el tablero del consultorio.

El tablero separa estos conceptos, todos en ARS y según la zona del consultorio:

- Cobrado de consultas: ingresos efectivos ligados a pagos y operaciones propias,
  por fecha de pago. Se excluyen correcciones por error resueltas sobre el historial
  completo; las devoluciones permanecen como egresos, sin restarlas dos veces.
- Consultas con cobros: turnos distintos, aunque haya varios abonos o medios.
  Promedio: cobrado dividido por esa cantidad; «—» si no hay consultas con cobros.
- Deuda del mes: saldo positivo de consultas completadas cuya fecha de atención
  local pertenece al mes. Los futuros y anticipos cancelados/ausentes quedan aparte.
  Deuda acumulada usa todas las fechas y ofrece abrir el filtro de deuda sin filtros
  anteriores que oculten resultados.
- Ingresos totales: añade movimientos manuales. Egresos incluye gastos y devoluciones;
  neto es ingresos totales menos egresos. El detalle identifica registros corregidos
  y compensaciones conservados en el historial que no suman a los agregados.
- Qué cobraste: atribuye ingresos al servicio histórico de la operación. Sus importes
  suman el mismo cobrado de consultas. Las barras diarias usan esa misma base.
- Comparación: mes anterior completo para períodos cerrados, o igual día y hora
  local para el mes actual, limitando al último día si el anterior es más corto.
  Sin base previa se muestra un mensaje, sin porcentajes infinitos.

Los cálculos acumulan centavos enteros antes de presentar importes. Las fechas de
movimientos amplían el mes si se especifica Desde/Hasta; vacías, se usa el mes
seleccionado. Los errores de consulta se propagan y no se presentan como ceros.

El catálogo permite alta/edición en el diálogo, Guardar/Cancelar explícitos y
desactivar sin eliminar historia. La migración
`20261111210000_presentacion_catalogo_servicios.sql` añade `aclaracion_paciente`
(300 caracteres) y `nota_precios` (1000), con RPC transaccional, lectura RLS por
dueño/consultorio y sin escrituras directas. Los atajos solo modifican la aclaración
de esa fila. La nota no modifica instrucciones de cobro ni comprobantes históricos.
Las altas conservan su identificador al reintentar. Visibilidad pública pendiente
de reservas (fase 13), sin controles que prometan publicación o borrado inexistentes.

Verificación: `npm run verificar` aprobado, 291 pruebas en 40 archivos, lint, tipos
y build. Conciliación y permisos/históricos probados en PostgreSQL aislado. Caja,
movimientos y catálogo compacto revisados en localhost en escritorio y a 390 px,
sin guardar datos de prueba hospedados. Pendientes aplicar la nueva migración y
verificar visualmente y con persistencia las aclaraciones/nota en el destino; no se
desplegó código ni se aplicaron migraciones a Supabase hospedado en esta entrega.
