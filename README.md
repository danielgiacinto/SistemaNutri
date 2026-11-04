# SistemaNutri

Plataforma SaaS para nutricionistas (nombre comercial provisorio: **Nutrisfera**, configurable
en `src/configuracion/producto.ts`): gestión del consultorio, pacientes, agenda, historia
clínica, mediciones, objetivos, planes alimentarios y portal del paciente.

## Estado

Última actualización: 4 de noviembre de 2026. Las fases **1 a 4 y 6** están
implementadas para probar en desarrollo: registro, clínica, portal, planes alimentarios
y desafíos de Comunidad. La aplicación corre en **localhost** y en el despliegue
público de pruebas **https://nutrisfera.vercel.app**, con Supabase hospedado de desarrollo.
El despliegue todavía no habilita cobros reales ni acredita el cierre de la fase 5.

La fase 5 abre el checkout de Mercado Pago desde **Plan y facturación** y controla la prueba y el acceso.
La autorización con el comprador de prueba ya se completó: aparece en **Tus suscripciones**
de Mercado Pago y como **Autorizada** en Nutrisfera, según la prueba manual del usuario.
El webhook firmado de autorización ya se comprobó en Vercel. Están implementadas la
conciliación diaria, la cancelación de renovación, el detalle comercial y el bloqueo
clínico desde la base. Falta completar las pruebas externas de cobros mensuales y cancelación.

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundamentos: autenticación, roles, multi-tenencia con RLS, layouts, configuración | ✅ Listo para probar |
| 2 | Pacientes, agenda, historia clínica, objetivos, mediciones y gráficos | ✅ Listo para probar |
| 3 | Portal del paciente e invitaciones | ✅ Listo para probar |
| 4 | Planes alimentarios con versiones | ✅ Listo para probar |
| 5 | Suscripciones, pagos y administración | Autorización y webhook firmado comprobados. Conciliación, cancelación, administración y permisos comerciales implementados; validación externa de mensualidades en curso. |
| 6 | Comunidad y desafíos | ✅ Listo para probar |

### Qué se puede probar ahora (profesional)

1. Abrir [http://localhost:3000](http://localhost:3000) → **Crear cuenta**.
2. Confirmar el correo (plantilla Nutrisfera, remitente de prueba `nutri.notificacion@gmail.com`).
3. Crear el consultorio en `/bienvenida`.
4. En `/panel`: el día del consultorio (indicadores, próximo paciente y evoluciones recientes), más pacientes, turnos, evoluciones, objetivos, mediciones y configuración.
5. En la ficha del paciente → **Visibilidad** → **Invitar al portal**. Llega un correo: al abrirlo elige una contraseña, acepta y entra a `/portal`.
6. En la ficha → **Planes**: el borrador no se comparte. **Publicar para el paciente** deja esa versión en `/portal/plan`.
7. En **Comunidad**: creá un desafío, publicalo, y con la cuenta del paciente sumate y escribí una actividad. El borrador no se ve en el portal.

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

Para cerrar la fase 5 se necesita un despliegue de pruebas con URL pública HTTPS
(por ejemplo, en Vercel); no hace falta lanzar comercialmente la app:

1. Dejar `NEXT_PUBLIC_SITIO_URL` en `https://` del dominio de producción.
2. Cargar `MERCADOPAGO_WEBHOOK_SECRETO` y `SUPABASE_SECRET_KEY`.
3. Apuntar el webhook de Mercado Pago a `https://tu-dominio/api/facturacion/mercadopago`.
4. La migración `20261103220000_checkout_suscripciones.sql` quedó aplicada y verificada en Supabase hospedado el 4 de noviembre de 2026.
5. Recién ahí: pago aprobado, historial actualizado, cobertura extendida, rechazo y reintentos sin acreditar dos veces.
   El cobro se abre en Mercado Pago al elegir el plan. La pantalla de Facturación ya no pide los datos de la tarjeta.

Hasta ese momento, autorizar la tarjeta en local no acredita un mes. El detalle está
en [`docs/facturacion.md`](docs/facturacion.md).

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
| `SUPABASE_SECRET_KEY` y secreto del webhook | Configurados en Vercel el 4/11/2026. Solicitud sin firma: 401. Simulación firmada de `subscription_preapproval`: 200, evento procesado sin error y autorización guardada. Falta validar un cobro mensual. |
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
- Última verificación técnica (4/11/2026): `npm run verificar` completo, con lint, TypeScript, **201 pruebas en 25 archivos** y compilación.

El núcleo funcional del MVP está implementado para desarrollo. Cerrar fase 5 exige
demostrar la acreditación automática de cobros, además de la autorización ya conseguida.
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
- [Avances y criterios de cierre del MVP](docs/avances.md)
- [Seguridad y privacidad](docs/seguridad-y-privacidad.md)
