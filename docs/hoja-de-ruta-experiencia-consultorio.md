# Experiencia del consultorio: fases 8 a 13

Relevamiento del 11 de noviembre de 2026 de la sesión autenticada de
[SoloNutris](https://www.solonutris.com.ar/app), las tres capturas aportadas y la
sesión de Nutrisfera, más el código local. Este documento acompaña el README y
define trabajo posterior. Los apartados «Observado» describen la interfaz visible;
«Implementar» y los criterios de aceptación son decisiones para Nutrisfera.
No se asume que las promesas de un tutorial o una pantalla demuestren su funcionamiento
interno. No se copian recetas, imágenes, bases nutricionales ni código de la referencia.

## Fase 8: cambios de esta entrega

### Alta de pacientes

Observado: ventana superpuesta de unos 790 px de ancho, esquinas redondeadas,
fondo desenfocado, panel verde de aproximadamente un tercio del ancho y formulario
claro en el resto. Avatar con icono de persona; nombre, sexo y contacto se reflejan
en el panel mientras se escribe. Al pie hay un recuadro sobre el espacio del paciente.
La cabecera aclara que solo hace falta el nombre. Cierre arriba a la derecha y pie
separado por una línea, con Cancelar secundario y Crear paciente principal.

Reglas verificadas directamente en el formulario de referencia:

- Nombre es el único campo requerido; Apellido y DNI son opcionales.
- Nacimiento usa selector de fecha. Edad es de solo lectura y se calcula.
- Sexo permite Femenino, Masculino o X; inicialmente no hay selección obligatoria.
- WhatsApp, Email, Obra social y N° de afiliado son opcionales.
- Identidad ocupa la primera sección y Contacto y cobertura la segunda. Nombre y
  apellido comparten fila; DNI, nacimiento y edad otra; contacto y cobertura van de a dos.
- El panel muestra estados vacíos de WhatsApp y correo; el texto inferior anuncia
  un enlace para plan, consultas y fotos. Esto es comportamiento anunciado por la
  referencia, no una capacidad que debamos atribuir automáticamente a Nutrisfera.

Implementado en Nutrisfera: diálogo reutilizado por Inicio, Pacientes y estado vacío;
solo nombre obligatorio; edad calculada; sexo sin valor predeterminado y desmarcable;
cobertura persistida mediante migración; afiliado textual para conservar ceros.
Teléfono reemplaza la etiqueta WhatsApp, porque no hay integración. Se conserva el
correo y la invitación al portal como acción independiente, sin envío al dar de alta.
Las notas administrativas existentes quedan en un desplegable. El alta mantiene
la autorización en servidor y obtiene el consultorio de la sesión.

El formulario usa identificadores únicos, etiquetas y errores asociados; foco
inicial en el nombre, foco contenido en el diálogo y retorno al botón al cerrar.
Escape, X y Cancelar cierran sin guardar; un clic en el fondo no descarta el alta.
Durante el envío se bloquean el formulario y el cierre. Los errores de validación
conservan la carga. Al crear correctamente se abre la ficha. Cerrar y volver a abrir
empieza una carga nueva. No se persisten borradores en el navegador.

Estética: panel de resumen en escritorio, formulario con dos grupos y pie visible,
tokens de Nutrisfera y soporte de tema oscuro. En celular, una columna desplazable
y sin panel lateral. El tamaño se limita a la ventana; los botones quedan disponibles
al pie aunque haya muchos campos o errores.

También se actualizan la edición y la visualización de cobertura. Los pacientes
sin apellido se muestran sin coma inicial en los selectores. La URL vieja de alta
lleva al listado con `crear=1`; al cerrar se limpia ese parámetro.

### Accesos simples de Agenda y Finanzas

Corrección de apertura: el marco del diálogo de Nuevo turno se renderiza fuera del
`Suspense` que carga pacientes y servicios. El estado de carga y el formulario solo
reemplazan el contenido, conservando el mismo portal, foco contenido, dimensiones
y una única animación. La carga interna usa la misma distribución lateral y de campos,
sin una pantalla de texto que luego vuelva a abrir el modal. El formulario recibe el
foco cuando está disponible; el cierre está bloqueado durante el envío.

Servicios y precios y Horarios de la cabecera de Agenda también usan navegación
interceptada sobre la pantalla actual, con cabecera fija, icono y contenido desplazable.
El catálogo reutiliza el mismo contenido de Configuración y Finanzas; los horarios y
bloqueos reutilizan la vista de disponibilidad. Se conservan los formularios anidados,
permisos y acciones existentes. X y Escape vuelven a la agenda sin perder la vista.
Las entradas directas a Configuración y Disponibilidad mantienen sus páginas completas.

Validación: en el navegador se observó la carga de Nuevo turno y se comprobó que el
identificador del diálogo no cambia al aparecer el formulario y que existe un único
diálogo. También se comprobaron Servicios y precios, Horarios, apertura/cierre de
Nuevo servicio y Nueva franja, descarte de notas con Escape y reapertura limpia,
y diseño a 390 px sin registrar datos. `npm run verificar` aprobado: lint, tipos,
271 pruebas en 38 archivos y compilación de producción. Sin nuevas migraciones ni despliegue.

Ampliación implementada: **Nuevo turno** abre en diálogo mediante navegación
interceptada, manteniendo debajo Inicio, Agenda o la ficha desde donde se abrió.
El acceso desde una franja conserva fecha/hora y el acceso desde un paciente conserva
su selección. Cancelar, X y Escape vuelven a la pantalla anterior; el fondo no
descarta el formulario. Al entrar directamente por URL se muestra el mismo diálogo
sobre la agenda y el cierre lleva al día correspondiente. El resumen lateral muestra
paciente, fecha, hora, duración y precio mientras se completa. En celular queda una
columna desplazable con pie de acciones visible. Los campos tienen identificadores
únicos para no colisionar con formularios de la pantalla de fondo.

Se mantienen servicio opcional, duración del consultorio, motivo y notas privadas,
autorización en servidor, validaciones de solapamientos/bloqueos y la apertura del
detalle después del alta. El precio informa la prestación; agendar no registra pagos.
Sin pacientes activos, se ofrece registrar uno y se impide enviar el alta vacía.

Implementado: selector con iconos Día/Semana/Mes/Caja. Las tres vistas temporales
mantienen su comportamiento actual. Caja lleva a Finanzas con los movimientos
seleccionados; todavía no es una cuarta vista integrada del calendario.

Implementado: botón Servicios y precios en Finanzas que abre el catálogo actual
dentro de un diálogo. Se pueden abrir los formularios existentes de alta y edición,
incluyendo servicios gratuitos y desactivación. Se conserva Configuración como
entrada adicional al mismo catálogo. No se crean tablas o listas paralelas de precios.

Activación: aplicar `20261111180000_alta_paciente_contacto_cobertura.sql` antes de
desplegar. Se relaja la restricción de apellido y se añaden tres columnas opcionales.
Permisos explícitos de inserción y actualización por columna; se conservan las
políticas RLS por operación y la prohibición de borrado. No se altera la invitación,
la propiedad de la ficha ni la historia clínica. La migración se incluye en las
pruebas PostgreSQL aisladas y se aplicó al entorno hospedado el 12/11/2026, durante
el cierre operativo de fase 9.

## Fase 9: Agenda, Caja y catálogo de servicios

Avance implementado después del relevamiento: el desglose **Cómo te pagaron** ya
está disponible en Finanzas, sobre Cobros y Caja, con barras, importes, porcentajes,
conteo de ingresos y navegación mensual. Usa ingresos efectivos en ARS y conserva
las devoluciones como egresos. Ver [reglas del bloque](finanzas-consultorio.md#cómo-te-pagaron).
La continuación descrita debajo implementa la integración y el gráfico por servicio.

### Entregas incrementales y estado (11/11/2026)

**9A — Vista Día, implementada en esta entrega.** Se reutiliza la lectura autorizada
de turnos del consultorio y de operaciones propias, sin cambios de esquema:

- Tira de catorce fechas desde el lunes de la semana seleccionada. Cada enlace
  anuncia fecha, cantidad y selección; Hoy tiene texto y borde. Contadores visibles
  sin cancelados, con medianoche en la zona del consultorio. La consulta de datos
  incluye todo el mes visible y la segunda semana de la tira aunque cruce mes/año.
- Tarjetas en orden horario con inicio, fin, minutos, paciente y servicio histórico
  de la operación; a falta de operación, tipo de consulta. Insignias independientes
  para atención y estado económico. Total después del descuento y saldo restante,
  con moneda de origen, sin sumar ni convertir monedas.
- Pagos parciales y anticipados conservan su estado. Un cancelado/ausente con dinero
  abonado muestra «Anticipo a resolver» y ese importe, sin presentar el precio como
  deuda exigible. Sin anticipo muestra «Sin deuda exigible». Sin operación no se
  inventa un precio cero: «Importe sin configurar». No se revelan importes ni se
  ofrece Cobros para turnos de otros profesionales.
- Nombre/Ver consulta abren el detalle; Cobros abre el diálogo existente con sus
  validaciones. Son controles separados, sin botones dentro de enlaces. En el
  listado no se repite la antigua sección de cobros debajo de las tarjetas.
- Consultas/Horarios alterna sin recargar ni repetir consultas al servidor y guarda
  `detalle=horarios` en la URL. Se mantiene fecha y vista; fechas nuevas navegan al
  servidor para obtener contadores actualizados. El detalle abierto desde una tarjeta
  recibe fecha/vista validadas y su enlace Agenda vuelve al mismo día.
- Horarios mantiene la grilla original con bloqueos, disponibilidad, duraciones,
  solapamientos e indicador actual. Semana y Mes conservan su comportamiento.
- Vacío con icono, explicación breve y Agendar un turno con fecha precargada. Un día
  con cancelados conserva sus tarjetas y especifica la cantidad de cancelaciones.
- Estética: tokens y tema del consultorio, bordes suaves, tarjetas redondeadas,
  iconos discretos, hora y total destacados, acciones en un pie separado. En celular,
  tira desplazable dentro del contenedor y tarjetas apiladas; importe y acciones
  tienen espacio propio. Selección y botones se anuncian a lectores de pantalla.

Verificación de 9A: lint, tipos, 278 pruebas en 38 archivos y build aprobados mediante
`npm run verificar`. Nuevas pruebas de límites de mes/año, año bisiesto, medianoche
local, exclusión de cancelaciones y conservación de parámetros. Revisión autenticada
en localhost de una consulta pagada y otra pendiente, regreso desde el detalle,
apertura del cobro, grilla horaria, vacío y alta precargada con descarte. Diseño
comprobado a 390 px, sin desborde horizontal de página ni errores de consola
observados. No se guardaron datos de prueba ni se modificó el entorno hospedado.

**9B — Navegación y contexto, implementada.** Caja recibe mes, fecha, vista y
presentación de Agenda en parámetros separados y validados; no acepta URLs de
redirección arbitrarias. Cambiar el mes financiero conserva el regreso al origen.
Sus accesos Día/Semana/Mes vuelven a esa fecha. Los enlaces a turnos de tarjetas,
Semana y grilla conservan vista/fecha/presentación al volver y durante la edición.
Una entrada sin contexto vuelve al día del turno. La cabecera de Agenda precarga
su fecha seleccionada al abrir Nuevo turno. Mes selecciona la fecha en su URL,
resalta la celda y muestra sus tarjetas y Agendar debajo, sin repetir cobros.

**9C — Caja operativa, implementada.** Un selector mensual común controla tarjetas,
Cómo te pagaron, servicios y movimientos. Cuatro indicadores con iconos y números
destacados; barras diarias con valores accesibles; comparación a igual día/hora
local del mes anterior para el mes en curso, con límite al último día si es más
corto. Los meses cerrados comparan meses completos. Promedio sin divisor: «—»;
sin ingresos previos, mensaje explícito. Cálculos en centavos, sin mezclar monedas.
Se separan ingresos brutos de consultas, ingresos manuales, egresos/devoluciones,
neto, deuda por fecha de atención, deuda acumulada y anticipos cancelados/ausentes.
Servicios usa nombres históricos y turnos distintos; sus barras suman el mismo
cobrado de consultas. Los pendientes abren el cobro existente, y Ver toda la deuda
limpia filtros anteriores antes de abrir Cobros. Movimientos conserva originales,
compensaciones y devoluciones, con signo, estado y diálogo de detalle (fecha local,
medio, categoría, paciente, servicio y referencia); sus fechas amplían el mes inicial.

**9D — Catálogo compacto, activada y verificada el 12/11/2026.** Alta y edición
dentro del mismo diálogo, estado de cambios, Guardar/Cancelar, precio cero y
desactivación. Las altas reusan su identificador al reintentar. Se conservan duración
y descripción. Aclaración independiente de hasta 300 caracteres, cuatro atajos que
solo afectan esa fila, y nota general de hasta 1000 caracteres. Se guardan mediante
RPC transaccional autenticada, reutilizando validación monetaria y permisos del
catálogo existente; no modifica operaciones históricas ni instrucciones de cobro.

Activación de 9D: `20261111210000_presentacion_catalogo_servicios.sql` aplicada y
registrada el 12/11/2026. En otros entornos debe aplicarse antes de comprobar sus campos.
Sus columnas mantienen
RLS de lectura por dueño/consultorio y no conceden escrituras directas ni borrado.
Sin la migración, la aplicación conserva la edición compacta de campos anteriores;
solo reconoce como compatibilidad la ausencia de las columnas, no errores de red
o autorización. La migración se prueba en PostgreSQL aislado y ya está aplicada al
Supabase hospedado. Aclaraciones y nota se verificaron visualmente y con guardado
en la web publicada. La visibilidad pública y las
reservas siguen en fase 13; no se muestra un ojo que prometa una publicación inexistente.

Verificación final de 9B–9D: `npm run verificar` aprobado con lint, tipos, 291 pruebas
en 40 archivos y build. Pruebas de pagos parciales/múltiples medios, ingresos manuales,
devolución, corrección entre meses, moneda, centavos, atención frente a fecha de turno,
medianoche local, mes previo corto, vacío y navegación; en PostgreSQL aislado, límites,
RLS/permiso de lectura y escritura, RPC ajena/anónima y precios/nombres históricos.
Revisión local autenticada de Caja con datos y vacía, selector mensual compartido,
regreso a Agenda tras consultar otro mes, selección y detalle mensual, movimiento y
catálogo compacto con descarte; escritorio y 390 px, sin desbordes ni errores de consola
observados. Sin altas, pagos ni cambios de servicios hospedados durante la revisión.
El cierre operativo en destino quedó completado el 12/11/2026, según el registro siguiente.

### Cierre operativo de fase 9 — 12/11/2026

- Código publicado: commit `9380b58239a4530afc0ffe0bf9efa53ff68b4d9d`, Vercel
  `READY` en producción, dominio `nutrisfera.vercel.app`.
- Supabase hospedado de desarrollo: migraciones `20261111180000` y
  `20261111210000` ejecutadas y registradas en una sola transacción. Verificados
  los cinco campos nuevos, RLS activa, ejecución autenticada de la RPC, rechazo
  anónimo y ausencia de permisos de escritura directa sobre aclaración/nota.
- Guardado real desde la sesión publicada: aclaración por atajo y nota temporal
  persistentes tras recargar, conservando el precio original. Después se guardaron
  y comprobaron nuevamente los valores anteriores, sin dejar datos de prueba.
  Los otros tres atajos se verificaron y descartaron sin guardar.
- Revisión de la interfaz publicada en ambos temas y a 390 px, sin desbordes de
  página/diálogo ni errores de consola observados. Regreso de Caja a la fecha/vista
  de Agenda después de consultar otro mes comprobado en producción.
- `npm run verificar` aprobado: lint, tipos, 291 pruebas en 40 archivos y build.

Fase 9 cerrada. La visibilidad pública de precios depende de las reservas de fase 13
y continúa como parte de esa fase, sin bloquear el cierre actual.

Prioridad alta. Reutilizar el sistema financiero de fase 7: operaciones por turno,
pagos parciales/anticipados, movimientos, descuentos, bonificaciones, egresos y
reversiones. No reemplazarlo por un simple booleano «pagado».

### Agenda observada

Cabecera con título, explicación breve, selector compacto con iconos Día/Semana/Mes/Caja
y acción Nueva consulta. Segunda fila con Reservas online, Conectar Google Calendar
y Resumen IA. Esos accesos son ampliaciones independientes, no requisitos de la agenda básica.

- Día: flechas anterior/siguiente, título con día de semana y fecha, botón Hoy;
  tira horizontal de catorce días con abreviatura y número; cada botón anuncia
  cuántos turnos tiene. Debajo, cantidad de consultas y listado. Vacío con icono,
  mensaje breve y Agendar uno.
- Semana: rango con año, flechas y Esta semana; columnas por día con botón para
  abrirlo y tarjetas o «Sin consultas». En la sesión observada se mostraron lunes a
  sábado; Nutrisfera debe respetar sus siete días y horarios configurables.
- Mes: título con mes/año, navegación y Hoy; grilla lunes a domingo, hora y paciente
  dentro de las celdas con turnos. Debajo aparece el detalle del día seleccionado
  y un botón para agregar consulta en ese día.
- Nutrisfera ya aporta duración real, solapamientos, bloqueos, horarios e indicador
  de hora actual: mantenerlos. Añadir una vista de lista por día sin perder la grilla.

Implementar tarjetas con hora inicial/final, paciente, servicio y duración, estado
asistencial y económico en insignias separadas, importe/saldo y acción de cobro.
La zona clicable de abrir turno debe distinguirse de Cobrar para evitar navegaciones
accidentales. Día seleccionado, Hoy y estados deben tener texto además de color.
Conservar fecha al cambiar vistas, los filtros y el estado en la URL, también al
volver desde un turno. La vista Caja toma el mes de la fecha elegida y permite volver
a esa misma fecha. En celular, selector completo sin desbordes y tarjetas de ancho disponible.

### Caja observada y propuesta

La referencia usa navegación mensual arriba y botón Servicios y precios a la derecha.
Cuatro tarjetas en una grilla de dos por dos: Cobrado en el mes (importe grande,
comparación anterior y minigráfico de barras), Consultas cobradas (cantidad), Falta
cobrar (importe/cantidad de realizadas sin cobro) y Por consulta, en promedio.

Debajo hay tres tarjetas: Cómo te pagaron (medio, barra proporcional, importe y
porcentaje), Qué cobraste (servicio, cantidad e importe) y Falta cobrar (explicación,
consultas realizadas pendientes y acción para indicar medio/monto). Al final,
Los cobros del mes con cantidad y columnas Día, Paciente, Qué, Cómo pagó y Monto.
En el ejemplo con datos se observó una transferencia y un servicio; porcentajes y
gráficos de múltiples medios deben validarse con casos nuevos en Nutrisfera.

Implementar sobre movimientos efectivos, con estas definiciones visibles:

- Cobrado: suma de ingresos de consultas efectivos del período, según fecha de
  pago en la zona del consultorio, ajustando reversiones. Separar «Ingresos totales»
  si se incluyen ingresos ajenos a consultas y mostrar egresos y neto por separado.
- Consultas cobradas: número de turnos distintos con pagos efectivos del período;
  un pago parcial también cuenta como consulta con cobro. Explicar este criterio
  para que varios abonos de un turno no inflen el contador.
- Promedio: cobrado de consultas dividido por esos turnos distintos; mostrar «—»
  sin divisor. No mezclar con el valor total facturado o el precio del servicio.
- Falta cobrar: saldo exigible de consultas atendidas, sin confundirlo con turnos
  futuros. Separar deuda total acumulada de deuda de consultas atendidas ese mes.
  Mantener un acceso a anticipos por resolver en turnos cancelados.
- Medios de pago: agrupar importes efectivos y presentar barra, etiqueta, importe
  y porcentaje con denominador explícito. Un pago combinado suma a cada medio.
- Servicios: usar el nombre e importe históricos de la operación, no el precio
  actual. Mostrar cantidad de turnos únicos e ingresos atribuidos.
- Minigráfico y comparación: mismo intervalo del mes previo cuando el actual
  está en curso; meses cerrados completos. Si antes hubo cero, evitar división por
  cero y decir «Sin cobros en el período anterior» en vez de infinito o crecimiento ficticio.
- Movimientos: lista legible en celular; fecha efectiva, paciente o concepto,
  servicio/categoría, medio, importe con signo y estado de reversión. Abrir el detalle
  desde la fila; no borrar historial financiero al corregir.

Carga, vacío, sin resultados y error deben ser distintos. No mostrar cero como
resultado de una consulta fallida. Gráficos con leyendas y valores accesibles,
moneda ARS, formato es-AR y números alineados. Un movimiento revertido no debe
contarse de nuevo ni desaparecer del historial.

### Servicios y precios observado

Diálogo blanco ancho, borde redondeado, cabecera separada, cierre arriba a la derecha
y descripción de cómo el precio completa el importe al cobrar. Filas compactas con
Servicio, Precio y Aclaración para el paciente; controles de ojo y papelera a la derecha.
Precio cero representa un servicio gratuito. El ojo indica si se muestra al reservar.
Atajos de aclaración: Incluye la consulta, Se suma a la consulta, Por sesión y Pack de 4.
Debajo, campos Servicio y Precio ($), botón ancho Agregar servicio y una nota general
opcional debajo de los precios, con ejemplo de medios aceptados.

Implementar edición compacta con Guardar/Cancelar explícitos y estado de cambios,
sin asumir el mecanismo de guardado de la referencia. Los atajos se aplican a la fila
en edición/foco y no cambian otras filas. Nombre obligatorio, precio no negativo,
precisión de centavos y límites de longitud en servidor. Mantener duración y estado
activo del catálogo actual. Desactivar preserva cobros y turnos existentes; reservar
papelera para recursos sin uso o convertirla en archivar con explicación.

Añadir `aclaracion_paciente`, visibilidad pública y nota general mediante migración,
con autorización y RLS. «Activo para uso interno» y «Visible al reservar» son estados
distintos. Hasta tener reservas en fase 13 no mostrar un ojo que prometa publicar
precios. La nota no modifica comprobantes anteriores. Los cambios de precio solo
se aplican a operaciones nuevas, salvo ajuste explícito auditado.

Criterios de cierre de 9: los cuatro accesos mantienen fecha; mismas sumas en Caja,
ficha e Inicio bajo el mismo alcance; casos con cero, un pago, varios medios, parcial,
anticipo, cancelación, reversión y egreso; navegación y cobros operables a 390 px y
con teclado; precios históricos intactos; pruebas de RLS y conciliación de agregados.

## Fase 10: Inicio orientado a la acción

Observado: fecha pequeña, saludo por momento del día y nombre, frase con las
consultas de hoy y botones Nuevo paciente/Nueva consulta. Tarjeta Primeros pasos
con contador 1 de 3 y filas: cargar primer paciente, armar plan y entregarlo; el paso
completo aparece con check y texto atenuado. Cada pendiente tiene explicación y flecha.

Después, tarjeta El día con Ver agenda y listado/vacío accionable. Más abajo, dos
columnas: Para hoy (tareas o «todo al día») y mes actual. El mes muestra cantidad,
barra apilada y leyenda de realizadas, por venir y canceladas; cuatro bloques pequeños
con consultas, pacientes nuevos, planes entregados y porcentaje de ausentes; comparación
con el mes anterior a igual altura; total cobrado y Ver todos los números.

El botón abre un panel lateral de aproximadamente media pantalla, con fondo
atenuado, título Tus números y selector de mes (el futuro deshabilitado). Seis
tarjetas en dos filas: Consultas, Pacientes nuevos, Volvieron, Ausentismo, Planes
entregados y Cobrado. Gráfico de barras por mes, apiladas entre pacientes nuevos y
los que ya venían; debajo, mapa de calor con días lunes a sábado y franjas hasta 12,
12 a 16 y 16 a 20, con cantidades y una frase de la franja más usada.

Implementar sobre el tablero actual: conservar En consulta/Próximo paciente y acceso
a historia, gráfico de ingresos y evoluciones recientes. Evitar repetir tres veces
el mismo total. Primeros pasos solo mientras faltan pasos, con opción de ocultarlo;
completitud calculada en servidor por paciente creado, plan elaborado y publicación
efectiva, no por clics. Entregar significa publicar en el portal hasta habilitar PDF/correo.

Definir tareas accionables: turnos pasados sin cerrar, planes en borrador, invitaciones
pendientes y deuda exigible, con cantidades y enlace al filtro concreto. Separar recordatorios
de tareas que requieren acción. No enviar correos ni cambiar estados por abrir Inicio.

Definiciones: consultas realizadas por fecha de atención, pacientes nuevos por alta,
recurrentes por consultas completadas anteriores al período, ausentismo sobre consultas
que debían ocurrir (excluyendo canceladas y futuras), planes entregados por publicación
inicial por paciente/plan (versiones posteriores en un contador aparte). Mostrar
denominadores y el período. Estas definiciones son propuestas para Nutrisfera, no
deducciones sobre el cálculo interno de SoloNutris.

Comparaciones de un mes en curso contra el mismo intervalo anterior y con zona
horaria consistente. Mapa de calor con siete días y franjas configuradas, incluyendo
horarios fuera del rango típico. Usar leyenda por intensidad y cantidades, sin
depender solo del color; resumen textual si no hay datos o hay empate. Panel completo
en celular, cierre accesible y retorno del foco. Consultar agregados autorizados;
no serializar historias clínicas para calcular indicadores en el navegador.

Criterios de cierre de 10: tareas enlazan al conjunto esperado, pasos no se completan
al cancelar, ceros y ausencia de datos tienen textos correctos, mes corto/año nuevo y
zona horaria cubiertos; resultados concilian con agenda, planes y finanzas; apertura
del panel fluida y gráficos legibles con teclado, lector de pantalla y en celular.

## Fase 11: Biblioteca del profesional

Estado al 12/11/2026: **11A, 11B y 11C implementadas** como módulo propio en `/panel/biblioteca`.
Incluye fuentes, alimentos, grupos, platos y platos por grupos del consultorio,
con búsqueda, versiones, copias, archivo y RLS. Incluye cálculos por porción/100 g,
rendimientos y preparaciones reutilizables con ingredientes versionados (11B).
Incluye suplementos con medidas y variantes de mezcla, y catálogo base de nueve
recursos trazables, de solo lectura y con copia transaccional al consultorio (11C).
Migración aplicada en desarrollo; 341 pruebas y build aprobados. Alcance y evidencia
en [Biblioteca](biblioteca.md). La integración con planes sigue en fase 12.

La Biblioteca aporta recursos reutilizables sin mezclar la información de un paciente
con el catálogo compartido. Las siguientes secciones conservan la referencia y el
alcance previsto para las subfases restantes.

### Estructura observada

Seis estantes con contador: Platos, Por grupos, Suplementos, Composición química,
Pre armados y Grupos. Se distinguen recursos que entran al plan (primeros tres) de
insumos que los componen (últimos tres). Título/descripción, buscador y acción de alta.
Los contadores de la sesión son ejemplos del catálogo ajeno, no metas de carga propias.

### Platos y platos por grupos

Platos: filas con miniatura, nombre, porción y gramos, categoría, kcal, barra de macros
y etiquetas. Filtros Todas, Desayuno/Merienda, Almuerzo, Cena, Colación y Postre.
Detalle en diálogo dividido: foto grande a la izquierda; a la derecha nombre,
porción, kcal, proteínas/carbohidratos/grasas en gramos y barra proporcional.
Ingredientes con cantidad, procedencia y aporte energético; alternativas sugeridas;
preparación en pasos. Recursos base protegidos con acción Duplicar y editar.
La foto de referencia declara que es ilustrativa generada con IA.

Implementar nombre, categoría, porciones, peso final, ingredientes/cantidades/unidades,
preparación, notas y etiquetas. Calcular kcal/macros a partir de fuentes trazables
y factores de rendimiento explícitos. Separar gramos de macronutrientes de porcentajes
energéticos; mostrar base por porción/100 g y redondeo coherente. Si falta información,
decir «Sin dato», sin inventar cero. Alternativas son sugerencias profesionales editables,
sin asumir equivalencia clínica automática. Archivar no altera entregas ya publicadas.

Por grupos: la referencia describe platos divididos en partes (medio verduras, un
cuarto proteínas, etc.) con elección dentro de cada grupo. El estante estaba vacío,
por lo que no se verificó su editor. Propuesta: constructor por fracciones con nombre,
grupo, ejemplos y cocción; validar suma de partes y permitir texto flexible. No
atribuir una composición química exacta a una consigna que no fija cantidades.

### Suplementos

Buscador, Nuevo suplemento y categorías Proteína, Creatina, Aminoácidos, Ganador,
Vitaminas, Colágeno y Otro. Filas con nombre, tipo, energía por toma y preparación
(medida/scoop y líquido), más cantidad de variantes. La descripción explica que
preparar con agua, leche o yogur cambia el aporte de la toma.

Implementar marca opcional, cantidad/unidad por medida, tabla nutricional y variantes
de preparación; diferenciar energía del producto de la mezcla. Incorporación a un
plan por decisión profesional; no sugerir dosis o indicaciones terapéuticas automáticas.
Guardar una copia de los datos usados en cada publicación.

### Composición química, prearmados y grupos

Composición: alimentos unitarios con buscador, categoría y procedencia (se observaron
SoloNutris, SARA 2, ARGENFOODS y Míos). Filas con nombre, grupo, fuente, kcal y P/C/G;
carga incremental «Ver más» y contador parcial. Preparaciones prearmadas muestran
ingredientes combinados, cantidades y tabla por 100 g. Grupos tiene nombre,
descripción, alimentos comprendidos, métodos de cocción y menú de acciones.
Se vieron proteínas/carnes, almidones/carbohidratos, vegetales, legumbres, frutas,
lácteos y grasas/aceites, con listas abreviadas y «más».

Implementar fuentes con referencia, versión/fecha, licencia y base de cálculo.
Verificar por separado autorización de uso e idoneidad de SARA 2/ARGENFOODS antes de
importar desde una fuente legítima; no extraerlos del servicio de referencia.
Recetas propias con rendimiento/peso cocido y composición normalizada, incluyendo
unidades y conversión explícita cuando corresponde. Grupos propios editables con
ejemplos y cocción; filtros conservados al abrir/cerrar detalles.

### Modelo, estética y cierre

Recursos base de plataforma de solo lectura y recursos del consultorio con propietario;
duplicar produce otro identificador editable. Versionar los recursos y copiar una
instantánea al publicar un plan. RLS por operación y por consultorio, permisos de
archivos/imágenes y referencias compuestas para impedir asociaciones cruzadas.
No incluir nombre, diagnóstico o mediciones de pacientes en recursos reutilizables.

Listas densas y legibles con filas de altura consistente, insignias pequeñas,
minigráfico de macros y detalle en diálogo; estantes desplazables en móvil,
filtros con selección evidente y carga paginada. Imágenes opcionales con alternativa
de texto; no hacen falta mil imágenes para empezar. Estados de carga y error propios.

Dividir en 11A (catálogo propio, alimentos/fuentes, grupos y platos), 11B (cálculos y
preparaciones), 11C (suplementos y catálogo base curado). Cierre: crear/buscar/editar/
duplicar/archivar con permisos correctos; cálculos comprobados con ejemplos conocidos,
sin pérdida de unidades ni alteración retroactiva; licencias registradas y pruebas
de aislamiento de catálogo y archivos.

## Fase 12: Planes visuales y reutilización

**Avance del 12/11/2026:** 12A–12C implementadas en desarrollo, con
una primera entrega de 12D por impresión/guardado PDF desde el navegador.
Migración aplicada con autorización explícita; permisos y pruebas transaccionales
remotas aprobados, sin datos de ensayo persistentes. No se considera cerrada la fase:
faltan el recorrido de escritura en navegador con cuentas dedicadas, la impresión
de documentos extensos y el despliegue.
El correo opcional no está implementado. Detalle en [Planes visuales](planes-visuales.md).

Nutrisfera ya tiene planes por paciente, comidas e indicaciones, borradores y
publicaciones versionadas. Conservar esa separación y la versión visible en el
portal mientras el profesional sigue editando un borrador.

### Catálogo y editor observados

Planes nutricionales con contador, descripción de lo que recibe el paciente,
Grillas guardadas, Con IA, Traer un plan hecho y Nuevo plan. Buscador, orden por
editados recientemente y filtros Todos, Míos, De SoloNutris, Sin entregar, Descenso,
Aumento, Mantenimiento, Deportivo, Clínico y Veggie. Vacío con Armar el primero.

Editor con banda Editando, Sumar al plan y Listo; volver al catálogo, emoji del plan,
nombre, objetivo y etiquetas de clasificación múltiples. Acciones Entregar a un
paciente, Listo y Vista previa. Composición por partes: Grilla semanal, Opciones
diarias y Sección de texto. Indicaciones generales al final y resumen Qué incluye.

El selector de grillas es un diálogo con pestañas Semanas/Opciones diarias y contadores,
buscador, filtros por clasificación, opción de empezar una semana vacía y lista por
procedencia. A la derecha: tipo, siete días, etiquetas, nombre, explicación y resumen
nutricional/vista de la semana. La interfaz anuncia que se agrega **como copia**, sin
alterar lo guardado. Se observaron plantillas por objetivo y nivel energético; algunas
mostraban «Calculando»/«Cargando» al inspeccionarlas, por lo que no se validó su cálculo.

### Implementación propuesta por subfases

12A: catálogo de plantillas del consultorio separado de planes asignados. Buscador,
orden, etiquetas, duplicación y filtro por estado de entrega; conservar filtro por
paciente actual. La ficha tiene accesos Crear desde cero y Usar plantilla. Plantilla
base de plataforma protegida y duplicable, con contenidos propios o licenciados.

12B: documento por bloques ordenables. Grilla de siete días por momentos de comida,
listas de opciones por momento, secciones de texto intercaladas e indicaciones
generales. Agregar/quitar/duplicar/mover partes con botones accesibles además de
arrastrar. Platos de Biblioteca, cantidades y suplementos elegidos explícitamente.
Las grillas pueden guardarse para reusar; insertar siempre copia. Permitir texto
libre junto al catálogo para no bloquear el trabajo si falta un alimento.

12C: vista previa exacta del paciente, publicación con confirmación del destinatario,
número de versión y fecha. Nunca entregar a todos los pacientes por accidente ni
sobrescribir una entrega anterior al editar plantilla. Mantener compatibilidad con
planes actuales de comidas e indicaciones. Guardado de borrador explícito con estado
«Guardando/Guardado/Error»; si se implementa autoguardado, revisar conflictos y
recuperación, avisar al salir con cambios no guardados y no almacenar contenido
clínico en caché pública o persistencia local general.

12D: exportación PDF con marca Nutrisfera, profesional, paciente, versión, fecha,
porciones, indicaciones y tablas legibles; comprobar impresión, páginas largas y móvil.
Correo opcional con marco compartido y texto alternativo, revisión de destinatario
y trazabilidad de envío. No prometer PDF adjunto o correo automático antes de implementarlos.

Estética: cabecera de edición clara, acciones principales siempre localizables,
documento limpio con tarjetas de bloque e iconos discretos; resumen lateral de
contenido y nutrición cuando haya datos calculables. En móvil, cada día se abre
como pestaña/acordeón para evitar una grilla de siete columnas ilegible. Etiquetas
sirven para organizar: nunca equivalen a una indicación clínica validada.

Modelo: plantillas, bloques/grillas y publicaciones con instantáneas y orden estable;
dependencia de Biblioteca para recursos estructurados, sin romper texto libre.
Publicación transaccional e idempotente; autorización por consultorio y destinatario;
portal solo accede a sus publicaciones. Pruebas de copia, edición concurrente,
versiones históricas, publicación y aislamiento. Cierre: armar desde cero y plantilla,
previsualizar/publicar/ver en portal, modificar borrador sin cambiar lo entregado,
republicar una versión nueva y demostrar que cambios de Biblioteca no alteran el pasado.

## Fase 13: ampliaciones independientes

Estos accesos se observaron en la referencia; no se configuraron integraciones ni
se enviaron correos o mensajes durante el relevamiento. Requieren diseño adicional:

- Reservas online: disponibilidad, duración, bloqueos, zona horaria, servicios
  visibles y aclaraciones; evitar dobles reservas con validación transaccional,
  verificación de contacto, cancelación/reprogramación y acceso limitado a datos públicos.
- Google Calendar: conexión autorizada, desconexión, sentido de sincronización,
  deduplicación, cambios externos y mínimo contenido clínico en eventos. No confundir
  la agenda propia con la disponibilidad de un calendario externo.
- Importación de pacientes desde planilla: columnas, vista previa, validación por
  fila, duplicados por documento y reversión de importación. Sin invitaciones automáticas.
- Traer un plan hecho: definir formatos, límite, conversión y previsualización antes
  de crear; no se verificaron los formatos aceptados por la referencia.
- IA para planes/resúmenes: configurar proveedor y costos, consentimiento y mínima
  información enviada, salida siempre como borrador con revisión profesional;
  no publicar, cobrar ni recomendar tratamientos de forma automática.
- WhatsApp: aún no hay integración. Definir proveedor, consentimiento, plantillas,
  ventana de envío, costo, registro de entregas y baja antes de mostrar acciones reales.
- Láminas aparece como sección adicional de la referencia: fuera del alcance pedido;
  registrar como posible repositorio de material educativo propio/licenciado, sin
  comprometer implementación ni copiar ilustraciones del servicio.

## Verificación y estado de entrega

La revisión de la referencia es funcional y visual, no una auditoría de su backend.
Se inspeccionaron el alta, los tres períodos de Agenda, Caja/Servicios, Inicio y
su panel de números, Planes/editor/selector de grillas y los seis estantes de Biblioteca.
No se comprobó entrega de planes, exportación, integración de reservas, IA o calendarios.

En Nutrisfera se revisaron Inicio, Planes y Finanzas de la sesión hospedada y los
componentes locales correspondientes. La nueva interfaz se comprobó en localhost
con sesión existente: apertura/cancelación y validación del alta, resumen dinámico,
edad y sexo, escritorio y celular de 390 px. Las escrituras nuevas de pacientes
dependen de aplicar la migración hospedada y no se probaron contra ese entorno.
Los ensayos de base aislada cubren alta mínima, cobertura, restricciones y permisos.
También se comprobaron apertura desde Inicio, Escape con retorno del foco, la URL
anterior de alta y su limpieza al cerrar, el acceso de Agenda a Caja, el catálogo
de servicios en diálogo a 390 px y su formulario anidado de alta, sin guardar datos.
Resultado final del 11/11/2026: `npm run verificar` aprobado, con lint, TypeScript,
271 pruebas en 38 archivos y compilación de producción. No se desplegó ni se aplicó
la migración en la base hospedada.

La ampliación de esta entrega verifica Nuevo turno sobre Inicio y sobre una franja
de Agenda, valores precargados por URL, cambios de fecha/hora con teclado, validación
de paciente con foco en el campo, cancelación y reapertura sin la carga descartada,
entrada directa y diseño móvil a 390 px. El resumen económico y Cómo te pagaron se
revisaron a 937 y 390 px, sin desbordes horizontales y con el gráfico visible en Caja.
No se crearon turnos, pagos ni movimientos en la sesión hospedada para estas comprobaciones.

Para cada fase futura: migración y pruebas cuando cambie el modelo, lectura de la
guía Next.js instalada para la API afectada, revisión visual en ambos temas y a
390 px, teclado/foco/errores y `npm run verificar`. La documentación y el estado
deben distinguir código local, migración aplicada y despliegue publicado.
