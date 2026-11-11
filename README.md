# SistemaNutri

Plataforma SaaS para nutricionistas (nombre comercial provisorio: **Nutrisfera**, configurable
en `src/configuracion/producto.ts`): gestión del consultorio, pacientes, agenda, historia
clínica, mediciones, objetivos, planes alimentarios y portal del paciente.

## Estado

Última actualización: 11 de noviembre de 2026. Las fases **1 a 4 y 6** están
implementadas para probar en desarrollo: registro, clínica, portal, planes alimentarios
y desafíos de Comunidad. La aplicación corre en **localhost** y en el despliegue
público de pruebas **https://nutrisfera.vercel.app**, con Supabase hospedado de desarrollo.
La fase **5** tiene su validación funcional cerrada con cuentas ficticias; el despliegue
todavía no habilita cobros reales ni acredita preparación para lanzamiento comercial.

La fase 5 abre el checkout de Mercado Pago desde **Plan y facturación** y controla la prueba y el acceso.
La autorización con el comprador de prueba ya se completó: aparece en **Tus suscripciones**
de Mercado Pago y como **Autorizada** en Nutrisfera, según la prueba manual del usuario.
El webhook firmado de autorización ya se comprobó en Vercel. Están implementadas la
conciliación diaria, la cancelación de renovación, el detalle comercial y el bloqueo
clínico desde la base. El 4/11/2026 se validaron cancelación, nuevo cobro de prueba
aprobado por ARS 15.999, cobertura hasta el 4/12/2026 y recuperación del acceso.
El 5/11/2026 también se verificaron un cobro rechazado, su correo comercial y un nuevo
cobro aprobado que recuperó el acceso tras un vencimiento simulado y auditado.
El 11/11/2026 se verificaron por API las renovaciones automáticas del 7 y 8 de noviembre
sobre la misma autorización de prueba del 6, con tres facturas/pagos distintos, sin
duplicados y cobertura hasta el 8/12/2026. La prueba diaria terminó tras sus tres cuotas.
El correo del 9 corresponde al cobro del 8, enviado por la conciliación del día siguiente;
no falta un pago del 9. Ver la evidencia y las limitaciones en `docs/facturacion.md`.

La fase 7 incorpora la administración económica del consultorio: servicios pagos y
gratuitos, precios históricos por turno, pagos parciales y anticipados, descuentos,
bonificaciones, reversiones, caja, estadísticas y recordatorios de pago. Está
implementada y verificada técnicamente en el repositorio. La migración financiera
se aplicó y registró en Supabase hospedado de desarrollo el 5/11/2026. Se comprobaron
el panel y los formularios autenticados en localhost, con persistencia y limpieza de
datos temporales, y el diseño móvil a 390 px. Se verificó la autenticación del SMTP
existente sin enviar mensajes. Quedan por comprobar el scheduler desplegado y la
entrega real de recordatorios. Ver [Finanzas del consultorio](docs/finanzas-consultorio.md).

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundamentos: autenticación, roles, multi-tenencia con RLS, layouts, configuración | ✅ Listo para probar |
| 2 | Pacientes, agenda, historia clínica, objetivos, mediciones y gráficos | ✅ Listo para probar |
| 3 | Portal del paciente e invitaciones | ✅ Listo para probar |
| 4 | Planes alimentarios con versiones | ✅ Listo para probar |
| 5 | Suscripciones, pagos y administración | ✅ Validación funcional cerrada con cuentas ficticias: cobros, renovación automática de la misma autorización, webhooks/reintentos, correos, cancelación y recuperación. Prueba acelerada diaria; sin cobros reales. |
| 6 | Comunidad y desafíos | ✅ Listo para probar |
| 7 | Servicios, cobros a pacientes, caja, estadísticas y recordatorios | Migración aplicada; formularios, persistencia, panel y diseño móvil verificados en localhost. Lint, tipos, 230 pruebas y build aprobados. Pendientes scheduler desplegado y entrega real de correo. |
| 8 | Alta rápida de pacientes y modales de Nuevo turno, Servicios y precios y Horarios | ✅ Implementada y verificada en localhost. Pendientes aplicar la migración de contacto/cobertura al entorno hospedado y desplegar; ver requisito de activación debajo. |
| 9 | Agenda y Caja integradas, tarjetas de consultas y catálogo de servicios | 9A–9D implementadas en el repositorio y verificadas en local. Pendientes activar la migración del catálogo, comprobar sus nuevos campos en el entorno hospedado y desplegar. La visibilidad pública de precios depende de las reservas de fase 13. |
| 10 | Inicio operativo, tareas e indicadores | Planificada |
| 11 | Biblioteca reutilizable | Planificada |
| 12 | Planes visuales y plantillas | Planificada |
| 13 | Reservas, calendario e integraciones opcionales | Planificada |

### Qué se puede probar ahora (profesional)

1. Abrir [http://localhost:3000](http://localhost:3000) → **Crear cuenta**.
2. Confirmar el correo (plantilla Nutrisfera, remitente de prueba `nutri.notificacion@gmail.com`).
3. Crear el consultorio en `/bienvenida`.
4. En `/panel`: el día del consultorio (indicadores, próximo paciente y evoluciones recientes), más pacientes, turnos, evoluciones, objetivos, mediciones y configuración.
5. En la ficha del paciente → **Visibilidad** → **Invitar al portal**. Llega un correo: al abrirlo elige una contraseña, acepta y entra a `/portal`.
6. En la ficha → **Planes**: el borrador no se comparte. **Publicar para el paciente** deja esa versión en `/portal/plan`.
7. En **Comunidad**: creá un desafío, publicalo, y con la cuenta del paciente sumate y escribí una actividad. El borrador no se ve en el portal.
8. Tras aplicar `20261106000000_finanzas_consultorio.sql`: en **Configuración → Servicios y precios**, configurá tus prestaciones, incluyendo servicios sin cargo. Asociá un servicio al agendar y registrá pagos desde **Cobros de esta agenda**. Consultá **Pagos y deudas** en la ficha del paciente y el gráfico de ingresos en Inicio. Los recordatorios requieren SMTP, scheduler, activación del profesional y autorización del paciente.

En **Plan y facturación**, el botón **Elegir este plan** abre Mercado Pago para
completar la autorización con los datos de prueba; este recorrido ya se completó correctamente. La tarjeta ya no se ingresa
dentro de Nutrisfera. Si volvés sin terminar, **Continuar con el pago** retoma el
mismo checkout. En la URL pública se prueban cobertura, cobro registrado, rechazo y
cancelación (ver más abajo). **Verificar cobros** recupera movimientos desde la API.

Para **Suscripciones**, el checkout usa `mercadopago.com.ar` también en pruebas.
El servidor usa el Access Token de la cuenta **vendedora de prueba**, y en la pasarela
se ingresa con la cuenta **compradora de prueba**, distinta de la vendedora y del
mismo país. La compra de prueba se hace con **Nueva tarjeta**, usando una tarjeta
de crédito de prueba. No se paga con la cuenta que creó la integración.
Pasos y diagnóstico del bloqueo de Confirmar en [`docs/facturacion.md`](docs/facturacion.md).

No hay cuenta de prueba precargada: cada quien se registra. **Continuar con Google**
está habilitado en el proyecto hospedado (alta e ingreso, ver `docs/autenticacion.md`).

### Qué se prueba al final

La validación funcional de fase 5 se completó en el despliegue público de pruebas.
Para repetirla se necesita una URL pública HTTPS (por ejemplo, en Vercel);
no hace falta lanzar comercialmente la app:

1. Dejar `NEXT_PUBLIC_SITIO_URL` en `https://` del dominio de producción.
2. Cargar `MERCADOPAGO_WEBHOOK_SECRETO` y `SUPABASE_SECRET_KEY`.
3. Apuntar el webhook de Mercado Pago a `https://tu-dominio/api/facturacion/mercadopago`.
4. La migración `20261103220000_checkout_suscripciones.sql` quedó aplicada y verificada en Supabase hospedado el 4 de noviembre de 2026.
5. Recién ahí: pago aprobado, historial actualizado, cobertura extendida, rechazo y reintentos sin acreditar dos veces.
   El cobro se abre en Mercado Pago al elegir el plan. La pantalla de Facturación ya no pide los datos de la tarjeta.

Hasta ese momento, autorizar la tarjeta en local no acredita un mes. El detalle está
en [`docs/facturacion.md`](docs/facturacion.md).

### Fase 8 — Alta rápida y accesos del consultorio (11/11/2026)

Implementación en el repositorio, inspirada en la revisión autenticada de
[SoloNutris](https://www.solonutris.com.ar/app) y comparada con Nutrisfera:

- **Nuevo paciente** abre un diálogo desde Inicio, Pacientes y el listado vacío.
  Solo el nombre es obligatorio. Apellido, DNI, nacimiento, sexo (Femenino/Masculino/X),
  teléfono, correo, obra social y número de afiliado son opcionales. La edad se calcula;
  las notas administrativas siguen disponibles en un desplegable.
- El diálogo tiene resumen lateral que se actualiza al escribir, secciones Identidad
  y Contacto y cobertura, formulario desplazable y acciones visibles al pie. Usa los
  tokens y el tema de Nutrisfera; en celular oculta el resumen lateral. Cancelar no
  guarda. Crear abre la ficha del paciente. El portal se habilita mediante invitación;
  cargar un teléfono no conecta WhatsApp ni envía mensajes.
- **Nuevo turno** también abre un diálogo sobre Inicio, Agenda y las fichas de
  pacientes. Conserva paciente/fecha/hora del acceso elegido y permite volver al
  mismo lugar al cancelar. Incluye resumen lateral, selección de paciente y servicio,
  fecha/hora/duración, motivo y notas privadas plegables, con acciones al pie.
  Abrir la URL directamente muestra el diálogo sobre la agenda. Agendar conserva
  las validaciones de solapamientos y abre el detalle del turno al guardar.
- **Servicios y precios** y **Horarios** de la cabecera de Agenda también abren
  modales, conservando debajo la vista y fecha de la agenda. Sus formularios de
  servicios, franjas y bloqueos se abren dentro de ese recorrido.
- La apertura de Nuevo turno usa un único marco durante la carga y el formulario,
  sin cerrar/reabrir ni repetir la animación. La carga interna mantiene sus dimensiones;
  Cancelar, X y Escape descartan la carga. El catálogo y los horarios usan el mismo marco.
- La edición conserva los nuevos campos y la ficha muestra la cobertura. El enlace
  antiguo `/panel/pacientes/nuevo` redirige al listado con el diálogo abierto.
- Agenda agrupa **Día, Semana, Mes y Caja** con iconos. Caja abre la sección existente
  de movimientos de Finanzas. El tablero económico integrado queda para la fase 9.
- Finanzas incorpora el diálogo **Servicios y precios** con el catálogo existente,
  alta y edición de nombre, descripción, precio, duración y estado. Los precios
  históricos de los turnos se conservan. La edición en filas, aclaraciones públicas,
  ojo de visibilidad y nota general de la referencia se planifican en fase 9.

Validación del 11/11/2026: `npm run verificar` aprobado (lint, TypeScript,
**271 pruebas en 38 archivos** y compilación de producción). Revisión visual en
localhost en escritorio y a 390 px, validación del nombre, edad, resumen dinámico,
Escape/retorno del foco, redirección del enlace anterior, acceso a Caja y catálogo
de servicios con apertura de su formulario de alta, sin guardar datos de prueba.
La ampliación de Nuevo turno también se comprobó desde Inicio y franjas de Agenda,
con fecha/hora precargadas, descarte al cancelar y entrada directa por URL.
Se comprobó además que su marco conserva la misma identidad al resolver la carga,
que Servicios y precios y Horarios abren sobre Agenda y que sus formularios anidados
cierran sin cerrar el modal principal. Revisión a 390 px y verificación completa aprobadas.

**Requisito de activación:** aplicar primero
`supabase/migrations/20261111180000_alta_paciente_contacto_cobertura.sql` al entorno
que se vaya a usar y después desplegar el código. La migración permite apellido
vacío y añade sexo/cobertura, con permisos por columna y las RLS existentes.
La verificación aislada usa todas las migraciones; esta entrega no aplica cambios
en Supabase hospedado ni publica en Vercel.

### Próximas fases — Experiencia del consultorio

**Primera entrega de fase 9 — 9A: Agenda del día (11/11/2026).** Día abre un
listado de tarjetas con hora inicial/final, duración, paciente, servicio histórico,
estados de atención y cobro separados, total y saldo. Ver consulta y Cobros son
acciones independientes. Los turnos cancelados siguen visibles y sus anticipos se
presentan para resolver, sin sumarlos como deuda exigible. Sin servicio asignado se
indica «Importe sin configurar»; los cobros de otro profesional permanecen privados.

La tira de 14 días comienza el lunes de la semana elegida, muestra contadores sin
cancelados y distingue Hoy. En móvil se desplaza horizontalmente dentro de la
tarjeta. El selector **Consultas / Horarios** conserva la grilla con disponibilidad,
bloqueos, duración real y hora actual. Fecha, vista y presentación quedan en la URL;
el acceso al detalle desde las tarjetas permite volver a ese mismo día. El vacío
ofrece Agendar un turno con la fecha precargada. Esta parte no requiere migraciones.

Validación de 9A: `npm run verificar` aprobado (lint, tipos, **278 pruebas en 38
archivos** y build). Revisión autenticada en escritorio y a 390 px: consulta pagada
y pendiente, retorno al día desde el detalle, apertura de Cobros, alternancia con
Horarios, vacío y Nuevo turno con fecha precargada/cancelación. Sin desbordes de
página ni errores de consola observados; no se guardaron turnos ni pagos de prueba.

**Continuación de fase 9 — 9B, 9C y 9D (11/11/2026).** Implementadas la navegación
contextual y Caja: toma el mes de Agenda y vuelve a la fecha/vista original, aunque
se consulte otro mes en Finanzas. Mes permite elegir un día sin salir de la grilla
y muestra sus tarjetas debajo. Los detalles abiertos desde Semana, Mes y Horarios
conservan el regreso contextual; Nuevo turno de la cabecera precarga la fecha elegida.

Caja incorpora cobrado de consultas, turnos distintos con cobros, deuda de consultas
atendidas en el mes y promedio, barras diarias y comparación con el mes anterior.
Comparte el mes con Cómo te pagaron, muestra ingresos por servicio histórico, deuda
acumulada, anticipos por resolver, ingresos totales, egresos y neto. Los movimientos
se filtran inicialmente por mes y tienen tarjetas con detalle e identificación de
correcciones que no suman. Los filtros de fechas permiten ampliar el período.

Servicios y precios permite alta y edición en el diálogo, con Guardar/Cancelar,
aviso de cambios sin guardar y desactivación sin borrar historial. La ampliación
incluye aclaración por servicio, atajos y nota general independiente de las
instrucciones de cobro. **Para habilitar esos nuevos campos**, aplicar
`supabase/migrations/20261111210000_presentacion_catalogo_servicios.sql` y revisar
su guardado en el entorno de destino; antes de activarla, el catálogo compacto
mantiene sus campos anteriores. No hay ojo de publicación ni papelera destructiva:
la exposición pública de precios queda para reservas en fase 13.

La fase 9 quedó organizada en estas entregas:

- **9A — Vista Día:** implementada. Tira de fechas, tarjetas y alternancia con horarios.
- **9B — Contexto de navegación:** implementado. Caja toma el mes seleccionado en Agenda y permite
  volver a la fecha original; Semana, Mes y grilla conservan el contexto al abrir
  un turno. Mes añade el detalle del día seleccionado.
- **9C — Tablero de Caja:** implementado. Cobrado de consultas, turnos distintos con cobros, saldo
  exigible y promedio; gráfico por servicio, pendientes accionables y movimientos.
  Reutiliza los registros de Finanzas, con pagos parciales, anticipos, reversiones y egresos.
- **9D — Catálogo compacto:** implementado; nuevos campos pendientes de activación.
  Edición en filas y aclaraciones/atajos/nota general.
  Visibilidad pública condicionada a reservas de fase 13; precios históricos intactos.

Verificación de la continuación: `npm run verificar` aprobado, **291 pruebas en 40
archivos**, lint, tipos y build. Pruebas nuevas de conciliación monetaria, límites
de fecha, comparación mensual y permisos/históricos del catálogo en PostgreSQL
aislado. Revisión autenticada de Caja con datos y vacía, regreso a Agenda, selección
mensual, detalle de movimiento y edición/cancelación de servicios; escritorio y
390 px sin desborde horizontal ni errores de consola observados. No se guardaron
datos de prueba en el entorno hospedado. Aclaraciones y nota requieren la activación
y comprobación indicadas arriba.

**Avance de fase 9:** Finanzas ya muestra **Cómo te pagaron**, con barras por medio
de pago, importes, porcentajes, cantidad de ingresos y navegación mensual. Está
visible sobre Cobros y Caja y usa ingresos efectivos en ARS, con correcciones por
error excluidas y devoluciones registradas aparte como egresos. No requiere una nueva
migración. Detalles en [Finanzas del consultorio](docs/finanzas-consultorio.md#cómo-te-pagaron).
El resumen superior también usa tarjetas con iconos y fondos suaves para ingresos,
deuda y egresos, coherentes con el gráfico y adaptadas al ancho disponible.

El relevamiento funcional y estético completo, decisiones, dependencias, casos
límite y criterios de aceptación están en
[Hoja de ruta a partir de la referencia](docs/hoja-de-ruta-experiencia-consultorio.md).
La implementación de fase 9 está lista para activar y revisar en el entorno de
destino. Las fases 10 a 13 siguen **planificadas**:

1. **Fase 9 — Agenda y Caja integradas.** Mantener fecha/período al cambiar entre
   Día/Semana/Mes/Caja; tira de días, tarjetas de consultas, resumen mensual con
   cobrado, consultas cobradas, saldo pendiente y promedio; gráficos por medio de
   pago y servicio, pendientes accionables y movimientos. Ampliar Servicios y precios
   con edición compacta, aclaraciones, atajos, visibilidad para reservas y nota general,
   conservando pagos parciales, anticipos, egresos, reversiones e importes históricos.
2. **Fase 10 — Inicio operativo.** Primeros pasos basados en datos reales; agenda
   de hoy y tareas pendientes; balance mensual y comparación a igual altura del mes
   anterior; panel de números con pacientes nuevos/recurrentes, ausentismo, planes
   publicados, consultas por mes y mapa de horarios. Reutilizar el gráfico de ingresos.
3. **Fase 11 — Biblioteca reutilizable.** Platos, platos por grupos, suplementos,
   composición química, preparaciones y grupos de alimentos; buscadores, categorías,
   procedencia, porciones, macros e ingredientes. Contenido propio editable y recursos
   base duplicables; datos con fuente y licencia verificadas, sin copiar el catálogo ajeno.
4. **Fase 12 — Planes visuales.** Catálogo de plantillas separado de las entregas
   por paciente; filtros y etiquetas; grillas semanales, opciones por comida, bloques
   de texto e indicaciones; guardar grillas, copiar sin alterar originales, vista
   previa y publicación versionada en el portal. PDF/correo como subfase posterior.
5. **Fase 13 — Integraciones opcionales.** Reservas online, Google Calendar,
   importación asistida e IA con revisión profesional. WhatsApp queda pendiente de
   definición de proveedor, consentimiento y funcionamiento; no bloquear las fases
   anteriores ni mostrar conexiones inexistentes.

Orden recomendado: completar la activación de 8 y 9; continuar con 10 sobre los datos
existentes; construir 11 antes de la integración completa de 12. Reservas y visibilidad
pública dependen de 13. Ver los criterios de cierre de cada fase en la hoja de ruta.

### Entorno

| Pieza | Estado |
| --- | --- |
| Proyecto Supabase `sistemanutri` (São Paulo) | Creado; el esquema del consultorio está en el proyecto hospedado |
| `.env.local` | Apunta al proyecto hospedado (no a Supabase local) |
| Correos de Auth | Plantillas Nutrisfera publicadas + SMTP de prueba con Gmail |
| Site URL | `http://localhost:3000` |
| Redirect URLs / Google OAuth | Habilitado en el proyecto hospedado (local + callback de Supabase) |
| Mercado Pago | Vendedor y comprador de prueba distintos configurados. Autorización alojada completada y visible como Autorizada en la app, según prueba manual del usuario. |
| Migración de checkout | `20261103220000_checkout_suscripciones.sql` aplicada y registrada en Supabase hospedado el 4/11/2026; trigger, función idempotente y permisos verificados. Persisten diferencias históricas de otras versiones; ver `docs/despliegue.md`. |
| `SUPABASE_SECRET_KEY` y secreto del webhook | Configurados en Vercel. Firma y entregas externas de autorización, pago y factura verificadas; cobros y renovaciones acreditados con cuentas ficticias. |
| Vercel y secretos de CI | Web pública de pruebas disponible en `https://nutrisfera.vercel.app`. CI de migraciones sigue pendiente de conciliar el historial. |

Detalle de Auth y SMTP: [`docs/autenticacion.md`](docs/autenticacion.md).
Detalle de despliegue y variables: [`docs/despliegue.md`](docs/despliegue.md).
Decisiones de arquitectura: [`docs/arquitectura.md`](docs/arquitectura.md).

### Avances recientes y alcance del MVP

- Marca: palta vectorial compartida entre logo y favicon, con contornos refinados e inclinación de 10° a la derecha.
- Agenda: duración visual de turnos, indicador de hora actual y vistas adaptadas a celular sin ancho mínimo forzado.
- Inicio, Pacientes, Historias clínicas, Planes, Comunidad y Configuración: tarjetas, filtros, listados y jerarquías visuales consistentes; accesos rápidos a las secciones de Configuración.
- Correcciones de la revisión de roles: política de lectura del consultorio del paciente, cookies seguras en HTTPS y etiquetas únicas por instancia de formulario. La migración `20261104180000` está aplicada en Supabase hospedado.
- Facturación: sincronización explícita de autorización para el titular y superadministrador, sin acreditar pagos; auditoría con responsable y motivo, fechas administrativas con zona explícita.
- Operación comercial: conciliación diaria con cursor y reserva recuperable; cancelación auditada; ingresos y vencimientos agregados en la base. Las migraciones `20261104200000` y `20261104210000` están aplicadas y registradas en Supabase hospedado.
- Diseño de Finanzas: tres totales breves, pestañas Cobros/Caja/Servicios y formularios en diálogos. Inicio muestra un único gráfico de ingresos con vistas día/semana/mes. Operaciones nuevas en pesos argentinos, sin selector de moneda.
- Fase 7: cobros manuales a pacientes separados de la suscripción a Nutrisfera; operaciones transaccionales, historial de ajustes y reversiones, aislamiento por profesional y recordatorios con consentimiento. Configuración y límites en [`docs/finanzas-consultorio.md`](docs/finanzas-consultorio.md).
- Última verificación técnica (5/11/2026): `npm run verificar` completo, con lint, TypeScript, **230 pruebas en 31 archivos** y compilación. Migración financiera aplicada y registrada; formularios comprobados en localhost contra Supabase de desarrollo. No se enviaron correos reales.

El núcleo funcional del MVP está implementado para desarrollo. La fase 5 demostró
autorización, acreditación automática y renovación con cuentas ficticias.
La preparación para producción incluye despliegue, migraciones verificadas, secretos/CI,
correo transaccional, respaldo/restauración y revisión de los pendientes de seguridad y privacidad.
Ver [avance y criterios de cierre](docs/avances.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
React Hook Form + Zod · Recharts · Supabase (PostgreSQL, Auth, RLS) · Vitest + PGlite · Vercel.

## Inicio rápido

Requisitos: Node.js 22.12 o superior y un proyecto de Supabase (o Docker para Supabase local).

```bash
npm install
cp .env.example .env.local    # completar URL y clave publicable de Supabase
npx supabase link --project-ref <ref> && npx supabase db push   # aplica las migraciones
npm run dev                   # http://localhost:3000
```

Guía completa (Supabase, Google OAuth, Vercel, primer superadministrador) en
[`docs/despliegue.md`](docs/despliegue.md).

## Scripts

| Comando | Acción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run tipos` | Genera tipos de rutas y verifica TypeScript |
| `npm test` | Pruebas unitarias y de políticas RLS (PostgreSQL embebido, sin Docker) |
| `npm run verificar` | Lint + tipos + pruebas + build (lo mismo que CI) |
| `npm run bd:iniciar` / `bd:detener` / `bd:reiniciar` | Supabase local (requiere Docker) |
| `npm run bd:tipos` | Regenera `src/tipos/base-datos.ts` desde la base local |
| `npm run superadmin:crear -- correo` | Asigna el rol de superadministrador |

## Documentación

- [Arquitectura y decisiones](docs/arquitectura.md)
- [Base de datos, RLS y migraciones](docs/base-de-datos.md)
- [Autenticación y Google OAuth](docs/autenticacion.md)
- [Despliegue y variables de entorno](docs/despliegue.md)
- [Facturación y Mercado Pago](docs/facturacion.md)
- [Finanzas del consultorio — Fase 7](docs/finanzas-consultorio.md)
- [Avances y criterios de cierre del MVP](docs/avances.md)
- [Hoja de ruta de experiencia — Fases 8 a 13](docs/hoja-de-ruta-experiencia-consultorio.md)
- [Seguridad y privacidad](docs/seguridad-y-privacidad.md)
