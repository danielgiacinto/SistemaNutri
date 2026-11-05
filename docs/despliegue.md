# Despliegue

## Variables de entorno

| Variable | Dónde | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (todos los entornos) | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (todos los entornos) | Clave publicable (`sb_publishable_…`) o clave `anon`. Es pública: la seguridad la da RLS. |
| `NEXT_PUBLIC_SITIO_URL` | Vercel (solo Production) | `https://tu-dominio`. En Preview dejarla vacía: se usa el host de la petición. |
| `SUPABASE_SECRET_KEY` | Servidor y scripts | Clave secreta/`service_role`. Omite RLS. La necesita el webhook para acreditar cobros; también el script de alta de superadministrador. Nunca con prefijo `NEXT_PUBLIC_`. |
| `MERCADOPAGO_ACCESS_TOKEN` | Solo servidor | En desarrollo: Access Token de la aplicación creada con el vendedor de prueba. Para Suscripciones puede empezar con `APP_USR`; el prefijo no demuestra que sea una cuenta real. |
| `MERCADOPAGO_CORREO_PAGADOR_PRUEBA` | Solo desarrollo/pruebas | Correo del comprador de prueba, distinto del vendedor. En la pasarela se debe ingresar con ese comprador. Quitar al pasar a cobros reales. |
| `MERCADOPAGO_WEBHOOK_SECRETO` | Solo servidor | Clave secreta de Webhooks de la misma aplicación de Mercado Pago que emite el Access Token. Cargar en Vercel y volver a desplegar. |
| `CRON_SECRET` | Solo servidor, Vercel Production | Secreto aleatorio para `/api/facturacion/conciliar`. Vercel lo envía como `Authorization: Bearer …`. Nunca exponer en el cliente ni en URLs. |
| `CORREO_COMERCIAL_USUARIO` | Solo servidor | Cuenta Gmail remitente de avisos de facturación, por ejemplo `nutri.notificacion@gmail.com`. |
| `CORREO_COMERCIAL_CLAVE_APLICACION` | Solo servidor | Contraseña de aplicación de Google con verificación en dos pasos; nunca la contraseña habitual. Configurar en `.env.local` y Vercel Production sin versionarla. |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` | `.env.local` | Credenciales de Google para Supabase local. |

Secretos de GitHub Actions para aplicar migraciones (`.github/workflows/migraciones.yml`):

| Secreto | Origen |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | Referencia del proyecto (`abcd1234…`) |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base definida al crear el proyecto |

## 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com). Para datos de salud de
   pacientes argentinos, elegir la región evaluando la transferencia internacional de
   datos (ver `docs/seguridad-y-privacidad.md`); São Paulo (`sa-east-1`) es la más cercana.
2. Aplicar las migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```
   A partir de ahí, cada cambio en `supabase/migrations` que llegue a `main` se aplica
   con el flujo de GitHub Actions (si los secretos están configurados).
3. Configurar Auth según `docs/autenticacion.md` (URLs, plantillas, Google, SMTP).

## 2. Vercel

1. Importar el repositorio de GitHub en Vercel (framework: Next.js, sin cambios de build).
2. Cargar las variables de la tabla anterior.
3. Cada push a `main` despliega producción; cada PR genera un preview. El flujo
   `ci.yml` ejecuta lint, tipos, pruebas y build en cada PR. Se recomienda proteger
   `main` exigiendo que ese check pase antes de fusionar.

## 3. Primer superadministrador

El rol no se puede obtener desde la interfaz. Con la cuenta ya registrada:

**Opción A — script local** (requiere `SUPABASE_SECRET_KEY` en `.env.local`):

```bash
npm run superadmin:crear -- tu-correo@dominio.com
```

**Opción B — editor SQL de Supabase:**

```sql
insert into public.administradores_plataforma (usuario_id, nota)
select id, 'Alta inicial' from auth.users where email = 'tu-correo@dominio.com';
```

Al volver a ingresar, la cuenta es dirigida a `/admin`.

## Desarrollo local

```bash
npm install
cp .env.example .env.local      # completar valores
npm run dev                      # http://localhost:3000
```

Con Docker instalado se puede usar Supabase local:

```bash
npm run bd:iniciar      # levanta Supabase y aplica migraciones + seed
# Copiar la "Publishable key" que muestra el comando a .env.local
npm run bd:tipos        # regenera los tipos de TypeScript
```

Sin Docker, usar un proyecto de Supabase de desarrollo (no el de producción) y
aplicarle las migraciones con `supabase db push`.

## Entorno de desarrollo actual

Última actualización: 4 de noviembre de 2026. La app tiene un despliegue público de
pruebas en `https://nutrisfera.vercel.app`; Supabase hospedado sigue siendo el entorno de desarrollo.

| Pieza | Valor |
| --- | --- |
| Proyecto | `sistemanutri`, región São Paulo (`sa-east-1`), ref `zisacjleazvlrklwilap` |
| Esquema | El consultorio hospedado ya incluye suscripciones de Mercado Pago |
| App local | `npm run dev` → [http://localhost:3000](http://localhost:3000) con `.env.local` |
| Auth | Plantillas Nutrisfera publicadas; SMTP de prueba con Gmail (ver `docs/autenticacion.md`) |
| Site URL | `http://localhost:3000` |
| Redirect URLs / Google OAuth | Habilitado en hospedado: proveedor Google, Redirect URLs de local y callback de Supabase en Google Cloud (`docs/autenticacion.md`) |
| Mercado Pago | Vendedor y comprador ficticios alineados. Cancelación, nuevo cobro aprobado por ARS 15.999, cobertura hasta el 4/12/2026 y recuperación de acceso comprobados de punta a punta. |
| Migración de checkout | `20261103220000_checkout_suscripciones.sql` aplicada en una transacción y registrada el 4/11/2026; trigger, función idempotente y permisos verificados por consulta remota. |
| `SUPABASE_SECRET_KEY` y secreto del webhook | Configurados en Vercel y redeploy confirmado el 4/11/2026. POST sin firma: 401. Simulador de Mercado Pago: evento firmado de autorización con 200 y procesamiento sin error verificado en base. |
| Vercel / secretos de GitHub Actions | Proyecto `sistema-nutri` publicado en `https://nutrisfera.vercel.app`. Secretos de CI e historial de migraciones pendientes de conciliar. |

Este entorno es de desarrollo. Antes de datos reales de pacientes: dominio propio,
SMTP transaccional, OAuth, CI y la revisión legal de `docs/seguridad-y-privacidad.md`.

## Preparación comprobada el 4 de noviembre de 2026

Este registro inicial y las revisiones de roles siguientes conservan los hallazgos
anteriores a las correcciones. Para el estado actual consultar «Correcciones
posteriores a la revisión de roles» y «Pasos para un nuevo despliegue» más abajo.

- Token de Mercado Pago consultado mediante `/users/me`: vendedor ficticio argentino
  (`test_user`, `MLA`), diferente del correo comprador configurado. No se crearon cobros.
- `SUPABASE_SECRET_KEY` cargada y validada mediante una consulta de servidor sin
  recuperar registros de facturación. `MERCADOPAGO_WEBHOOK_SECRETO` sigue pendiente.
- Lint, TypeScript y 160 pruebas pasan. El build normal de Turbopack también pasa
  fuera del sandbox de ejecución; dentro falla al iniciar el proceso auxiliar de CSS.
- El proyecto `sistema-nutri` y la URL pública `https://nutrisfera.vercel.app` quedaron
  identificados después de la creación manual por el usuario.
  La integración está conectada, pero el espacio `danielgiacintos-projects` devolvió
  403 por falta de autorización de acceso. Se generó el enlace de consentimiento;
  la configuración interna y los logs siguen sin poder inspeccionarse con esa conexión.

### Revisión HTTP del despliegue público

Comprobaciones del 4/11/2026, sin sesión ni creación de cuentas o pagos:

- Home, ingreso, registro y recuperación responden 200, sin errores de servidor detectados.
- Dos hojas CSS y tres archivos JavaScript revisados responden 200; el icono SVG también.
- `/panel`, `/portal`, `/admin` y `/panel/facturacion` responden 303 al ingreso sin sesión.
- HSTS, `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff` están presentes.
- `POST /auth/google` responde 303 hacia el Supabase esperado, con retorno a
  `https://nutrisfera.vercel.app/auth/confirmar`; Supabase redirige a Google con 302.
  No se completó el consentimiento ni se inició sesión. La cookie PKCE observada
  carece de `Secure`; queda pendiente ajustar las cookies para HTTPS en los clientes SSR.
- Un POST al webhook sin firma responde 503 `integracion_incompleta`. La ruta es pública,
  pero falta al menos una de `MERCADOPAGO_ACCESS_TOKEN`, `SUPABASE_SECRET_KEY` y
  `MERCADOPAGO_WEBHOOK_SECRETO` en el despliegue. Con las tres cargadas, la misma
  prueba sin firma debe rechazarse con 401, sin crear eventos ni acreditar pagos.

No están verificados aún el consentimiento final de Google, el envío/retorno de correos,
las escrituras de los flujos autenticados ni una notificación válida de Mercado Pago.
Una respuesta 200 de la pantalla no valida por sí sola esos recorridos.

### Revisión en navegador con sesión profesional

El 4/11/2026 el usuario inició la sesión profesional en la pestaña compartida. Se
recorrieron Inicio, Agenda, Pacientes, ficha, Planes, Facturación, Configuración,
Comunidad e Historias clínicas, sin modificar registros ni iniciar pagos.

- No se observaron errores ni advertencias de consola en esas vistas.
- La agenda muestra los días completos, la marca Hoy y los turnos existentes.
  Un espacio libre del día siguiente abrió el formulario con fecha y hora precargadas;
  el formulario se abandonó sin guardar.
- El filtro de pacientes inactivos mostró el estado vacío; quitarlo restauró el listado.
  Las opciones del selector fueron visibles en modo oscuro.
- El filtro de Planes por un paciente sin planes mostró el estado vacío correspondiente.
- Facturación mostró el mismo precio público, autorización recurrente vigente y ausencia
  de pagos registrados. Actualizar estado respondió sin errores; no acredita cobertura.
- Facturación, Configuración, Comunidad e Historias se revisaron a 390 px sin desborde
  horizontal. Se restauró el viewport original al terminar.
- Intentar `/admin` y `/portal` con el profesional redirigió a `/panel`. Esto comprueba
  la separación de esas rutas con esa cuenta, no sustituye pruebas de RLS multi-tenant.

Hallazgos pendientes:

- Al navegar entre formularios públicos, Next conserva pantallas ocultas con los mismos
  IDs `correo` y `contrasena`. Se observó un campo visible asociado a tres etiquetas de
  correo. Se necesitan identificadores únicos para evitar nombres accesibles repetidos
  y asociaciones de etiquetas con campos de otra pantalla.
- Con una suscripción autorizada no aparece una acción visible para gestionar/cancelar
  la renovación. El código muestra la indicación de cancelación solamente cuando no
  está autorizada; revisar ese comportamiento al completar fase 5.
- Siguen pendientes la cookie PKCE con `Secure`, la configuración y prueba del webhook,
  la revisión con sesión de admin y la validación de escrituras y correos.

### Revisión en navegador con sesión de paciente

El 4/11/2026 el usuario inició la sesión de un paciente ya vinculado. Se revisaron
Inicio, Turnos, Mi plan, Progreso y Comunidad sin modificar registros ni publicar contenido.

- Las pantallas cargaron sin errores o advertencias de consola observados.
- Turnos mostró el historial de la cuenta; Mi plan mostró los planes que estaban
  publicados en la revisión profesional y sus versiones. Progreso mostró el objetivo
  compartido y un estado vacío de mediciones. No se probaron cambios de visibilidad.
- La navegación inferior funcionó a 390 px; las vistas móviles revisadas no mostraron
  desborde horizontal. Se restauró el tamaño original del navegador al terminar.
- Acceder directamente a `/panel` y `/admin` redirigió a `/portal` con esa cuenta.
  Esta prueba de rutas no sustituye una prueba integral de aislamiento de filas por API.
- En Inicio apareció `Tu consultorio` en lugar del nombre real. Se confirmó mediante
  una consulta de metadatos que la política remota `consultorios: la persona ve el de su ficha`
  tiene la condición `p.consultorio_id = p.id`: el `id` sin calificar de la migración
  original se resolvió contra la tabla interna de pacientes. La regla debería comparar
  con el identificador del consultorio externo. Al no devolver el consultorio,
  `obtenerFichaPortal()` usa también la zona horaria predeterminada.

Queda pendiente una migración incremental que corrija esa referencia, con pruebas
de acceso al propio consultorio y rechazo de otro consultorio. No se cambió la política
durante esta revisión ni se editará la migración histórica ya aplicada.

### Revisión en navegador con sesión de superadministrador

El 4/11/2026 el usuario inició la sesión administrativa. Se revisaron Resumen,
Profesionales, Suscripciones y Auditoría sin guardar configuración ni ajustar cuentas.

- Las cuatro secciones cargaron sin errores o advertencias de consola observados.
- La búsqueda de profesionales filtró un consultorio y al limpiarla volvió el listado.
  Se abrió el diálogo de ajuste de prueba con consultorio, fecha y motivo; se cerró
  sin completar ni guardar el formulario.
- Suscripciones mostró precio mensual ARS 15.999, un mes calendario de prueba,
  siete días de gracia, dos consultorios en prueba y cero cobertura/cobros aprobados
  en los datos de esta revisión. Los importes coinciden con home y Facturación.
- Profesionales mostró `pending` para la suscripción que el portal profesional había
  leído como autorizada en Mercado Pago. La vista administrativa consulta la base;
  la falta de sincronización del webhook mantiene ese estado local desactualizado.
- Auditoría mostró eventos existentes, sin contenido clínico. La interfaz no presenta
  actor ni motivo/detalle; además Auditoría y Profesionales formatean fechas sin una
  zona horaria explícita, por lo que dependen de la del servidor.
- Suscripciones y Auditoría se revisaron a 390 px sin desborde horizontal observado.
  Se restauró el tamaño original del navegador.
- Acceder con el administrador a `/panel/pacientes` o `/portal` redirigió a `/admin`.
  No se verificaron políticas de base mediante peticiones de escritura ni cuentas de
  otros consultorios durante esta revisión del navegador.

La pasada de lectura de los tres roles queda terminada. Los ajustes de prueba,
cambios de precio, publicaciones, invitaciones y cobros siguen pendientes de una
prueba de escritura autorizada sobre datos desechables; no se dan por validados por
haber abierto sus pantallas.

### Correcciones posteriores a la revisión de roles (4/11/2026)

- `20261104180000_corregir_lectura_consultorio_paciente.sql` aplicada en transacción
  y registrada en Supabase hospedado. Se verificó `p.consultorio_id = consultorios.id`
  en la política y la versión en `supabase_migrations.schema_migrations`. No se
  modificaron registros de pacientes ni las migraciones históricas.
- Clientes SSR con `Secure` en producción/HTTPS y formularios de autenticación con
  IDs únicos por instancia. Pruebas con PKCE real generado por Supabase SSR y con
  varios formularios simultáneos.
- Auditoría muestra responsable y motivo administrativo; fechas con zona explícita.
  Sincronización manual de autorización disponible para titular y superadministrador,
  con lectura RLS previa y verificación del recurso por API. No acredita un mes.
- Usuario configuró Webhooks, variables en Vercel y realizó redeploy. El endpoint
  público pasó de 503 a 401 `firma_invalida` ante un POST sin firma. Falta una entrega
  auténtica y la acreditación de un cobro de prueba; no se generó ningún pago.
- `npm run verificar` pasó con lint, tipos, 177 pruebas y build. Se repitió tras
  fallos del entorno de Windows al descargar fuentes y arrancar el proceso de CSS.
- Correcciones publicadas desde `b81ed1a`. En la URL pública, POST `/auth/google`
  devuelve 303, PKCE con `Secure` y retorno al dominio público. Auditoría muestra
  responsable/motivo y fechas en Córdoba; las vistas administrativas revisadas y
  el diálogo no presentan desborde a 390 px ni errores de consola observados.
- Se ejecutó **Sincronizar Mercado Pago** desde la sesión de superadministrador
  sobre la suscripción de prueba existente. La vista y la base cambiaron de
  `pending` a `authorized`; se conservaron cobertura y último cobro nulos y cero
  pagos registrados. Esto valida la acción manual con la API, no una entrega
  firmada del webhook ni un cobro. No se ajustó la prueba ni se confirmó un pago.
- Posteriormente, el usuario envió desde el simulador de Mercado Pago el evento
  `subscription_preapproval` con una suscripción existente y recibió 200. Se verificó
  `procesado_en` con fecha, `error` nulo y autorización conservada en Supabase. Los
  pagos siguieron en cero y la cobertura nula: quedó probado el recorrido externo
  firmado de autorización, sin confirmar una mensualidad ni simular un cobro.

### Pasos para un nuevo despliegue

La configuración `vercel.json` incluye conciliación diaria a las **06:00 UTC**
(03:00 de Argentina; en Hobby puede ejecutarse durante esa hora). El usuario cargó
`CRON_SECRET` en Vercel el 4/11/2026. Se generó localmente sin imprimirlo y no se versiona.
La frecuencia diaria es compatible con Hobby; una mayor frecuencia requiere revisar
los límites del plan. El cron es respaldo del webhook, no un mecanismo de cobro.

Se comprobó el despliegue del commit `dc36ed7`: endpoint de conciliación público con
401 sin secreto y 200 con el secreto correcto. Revisó una suscripción sin fallos;
se verificaron cursor, fecha de éxito y ausencia de error en Supabase. Las nuevas
pantallas administrativas cargaron sin errores de consola observados y Suscripciones
se revisó a 390 px sin desbordamiento horizontal. No se da por observado todavía
el disparo diario automático ni se toma esta verificación como prueba de un cobro.

Posteriormente, el usuario completó cancelación y nuevo checkout con cuentas ficticias.
Se verificaron cobro aprobado de ARS 15.999, eventos de pago y factura sin errores,
un solo registro, cobertura hasta el 4/12/2026 y recuperación del acceso al panel.
Otra conciliación confirmó que no se duplicó el pago ni se extendió nuevamente la
cobertura. La prueba corresponde al entorno ficticio, no a cobros de producción.

Las migraciones `20261104200000_operacion_comercial.sql` y
`20261104210000_acceso_comercial_en_base.sql` se aplicaron juntas en una transacción
y se registraron el 4/11/2026. Se comprobaron funciones, permisos exclusivos del
servicio para reclamar trabajos, guard clínico y acreditación por ciclo. No se
repararon versiones antiguas ni se cambiaron fechas de pruebas al aplicar el esquema.

1. Conectar Vercel e importar `danielgiacinto/SistemaNutri` desde GitHub. Usar Next.js,
   Node.js 22 y los comandos de instalación/build del proyecto.
2. En el entorno de Vercel que vaya a servir la URL estable, cargar de forma privada
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_CORREO_PAGADOR_PRUEBA` desde el entorno local.
   Conservar vendedor y comprador ficticios: el entorno llamado Production de Vercel
   puede alojar esta prueba; su nombre no autoriza a cambiar a cobros reales.
3. Al conocer el dominio estable, establecer `NEXT_PUBLIC_SITIO_URL=https://<dominio>`
   y volver a desplegar: las variables `NEXT_PUBLIC_*` se incorporan durante el build.
   La clave pública de Mercado Pago y los secretos locales de Google no hacen falta
   en esta app; OAuth se configura en el Supabase hospedado.
4. En Supabase Auth, agregar `https://<dominio>/auth/confirmar**` a las redirecciones
   permitidas y usar el dominio público como Site URL. Conservar las redirecciones
   de localhost para seguir desarrollando. Revisar el origen público en Google Cloud;
   el callback de Supabase sigue siendo el mismo.
5. Cargar `SUPABASE_SECRET_KEY` en Vercel. Configurar el webhook de la aplicación del
   vendedor ficticio en `https://<dominio>/api/facturacion/mercadopago`, con los eventos
   indicados en `facturacion.md`; cargar su secreto en `MERCADOPAGO_WEBHOOK_SECRETO`
   y volver a desplegar. No pegar claves privadas en el chat ni en Git.
6. Comprobar home, registro/Google, recuperación e invitación desde el dominio público.
   El endpoint de notificaciones debe ser accesible desde Mercado Pago, sin una barrera
   de autenticación de Vercel delante; la firma del webhook sigue siendo obligatoria.
7. Validar aprobación, rechazo, reintentos y cobertura con las cuentas de prueba.
   Una autorización existente con fin de prueba futuro no demuestra un cobro inmediato.
   Las suscripciones creadas en localhost pueden conservar su retorno anterior: comprobar
   su configuración antes de usarlas como evidencia del recorrido en el nuevo dominio.

### Historial de migraciones remoto

La consulta del 4/11/2026 encontró versiones remotas antiguas diferentes de las locales.
La migración `20261103130000` coincide. La de checkout `20261103220000` faltaba tanto
en historial como en el esquema (trigger y nueva función); se aplicó el archivo local
completo dentro de `BEGIN/COMMIT` y se registró únicamente esa versión mediante
`supabase migration repair --linked --status applied 20261103220000` después del éxito.

Las consultas posteriores confirmaron el registro, el trigger de validación del checkout,
la función de acreditación idempotente y los permisos de `service_role` sobre suscripciones
y eventos. No se modificaron pacientes ni se fabricaron cobros.

El resto del historial requiere comparar cada definición remota con su migración local
antes de repararlo. No ejecutar reparaciones masivas ni `db push --include-all`: podrían
reaplicar objetos ya existentes. El despliegue de la app no ejecuta migraciones;
el flujo `.github/workflows/migraciones.yml` sigue pendiente de esa conciliación y de
sus secretos antes de poder considerarse operativo.

> El repositorio está dentro de OneDrive. La sincronización de `node_modules` y `.next`
> puede volver lenta la instalación o bloquear archivos; si ocurre, excluí esas carpetas
> de la sincronización o mové el proyecto fuera de OneDrive.
