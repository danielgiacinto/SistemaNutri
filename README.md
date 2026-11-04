# SistemaNutri

Plataforma SaaS para nutricionistas (nombre comercial provisorio: **Nutrisfera**, configurable
en `src/configuracion/producto.ts`): gestión del consultorio, pacientes, agenda, historia
clínica, mediciones, objetivos, planes alimentarios y portal del paciente.

## Estado

Última actualización: 3 de noviembre de 2026. Las fases **1 a 4 y 6** están
implementadas para probar en desarrollo: registro, clínica, portal, planes alimentarios
y desafíos de Comunidad. La aplicación corre en **localhost** y usa Supabase hospedado
de desarrollo. Todavía no hay un despliegue de producción.

La fase 5 abre el checkout de Mercado Pago desde **Plan y facturación** y controla la prueba y el acceso.
El cobro de punta a punta se prueba **al final**, cuando el resto esté listo y la app
esté desplegada en Vercel con URL pública. En local el webhook no llega.

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundamentos: autenticación, roles, multi-tenencia con RLS, layouts, configuración | ✅ Listo para probar |
| 2 | Pacientes, agenda, historia clínica, objetivos, mediciones y gráficos | ✅ Listo para probar |
| 3 | Portal del paciente e invitaciones | ✅ Listo para probar |
| 4 | Planes alimentarios con versiones | ✅ Listo para probar |
| 5 | Suscripciones, pagos y administración | Vista y checkout externo implementados. Autorización en la pasarela pendiente de confirmar con el comprador de prueba. Webhook y cobertura de punta a punta pendientes de URL pública y secretos. |
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
completar la autorización con los datos de prueba. La tarjeta ya no se ingresa
dentro de Nutrisfera. Si volvés sin terminar, **Continuar con el pago** retoma el
mismo checkout. Cobertura, cobro registrado y rechazo se prueban cuando exista
la URL pública (ver más abajo).

Para **Suscripciones**, el checkout usa `mercadopago.com.ar` también en pruebas.
El servidor usa el Access Token de la cuenta **vendedora de prueba**, y en la pasarela
se ingresa con la cuenta **compradora de prueba**, distinta de la vendedora y del
mismo país. La compra de prueba se hace con **Nueva tarjeta**, usando una tarjeta
de crédito de prueba. No se paga con la cuenta que creó la integración.
Pasos y diagnóstico del bloqueo de Confirmar en [`docs/facturacion.md`](docs/facturacion.md).

No hay cuenta de prueba precargada: cada quien se registra. **Continuar con Google**
está habilitado en el proyecto hospedado (alta e ingreso, ver `docs/autenticacion.md`).

### Qué se prueba al final

Cuando la clínica, el portal y los planes estén cerrados y el proyecto esté en Vercel:

1. Dejar `NEXT_PUBLIC_SITIO_URL` en `https://` del dominio de producción.
2. Cargar `MERCADOPAGO_WEBHOOK_SECRETO` y `SUPABASE_SECRET_KEY`.
3. Apuntar el webhook de Mercado Pago a `https://tu-dominio/api/facturacion/mercadopago`.
4. Recién ahí: pago aprobado, cobertura extendida y un rechazo (titular `OTHE`).
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
| Mercado Pago | Vendedor y comprador de prueba distintos ya configurados y verificados. Checkout externo disponible; nueva autorización pendiente de completar por el comprador. |
| Migración de checkout | `20261103220000_checkout_suscripciones.sql` creada y probada en PGlite; pendiente de aplicar en Supabase hospedado. |
| `SUPABASE_SECRET_KEY` y secreto del webhook | Vacíos. Hacen falta para registrar un cobro. |
| Vercel y secretos de CI | Pendientes. El cobro completo se prueba después de este despliegue. |

Detalle de Auth y SMTP: [`docs/autenticacion.md`](docs/autenticacion.md).
Detalle de despliegue y variables: [`docs/despliegue.md`](docs/despliegue.md).
Decisiones de arquitectura: [`docs/arquitectura.md`](docs/arquitectura.md).

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
- [Seguridad y privacidad](docs/seguridad-y-privacidad.md)
