# SistemaNutri

Plataforma SaaS para nutricionistas (nombre comercial provisorio: **Nutrisfera**, configurable
en `src/configuracion/producto.ts`): gestión del consultorio, pacientes, agenda, historia
clínica, mediciones, objetivos, planes alimentarios y portal del paciente.

## Estado

Última actualización: 31 de octubre de 2026. El producto está en **fase 4**
para el uso del consultorio: se puede registrar, trabajar la clínica, invitar al paciente
y publicar planes alimentarios. La fase 6 ya tiene desafíos y actividades en Comunidad.

La fase 5 ya autoriza la tarjeta en Mercado Pago y controla la prueba y el acceso.
El cobro de punta a punta se prueba **al final**, cuando el resto esté listo y la app
esté desplegada en Vercel con URL pública. En local el webhook no llega.

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundamentos: autenticación, roles, multi-tenencia con RLS, layouts, configuración | ✅ Listo para probar |
| 2 | Pacientes, agenda, historia clínica, objetivos, mediciones y gráficos | ✅ Listo para probar |
| 3 | Portal del paciente e invitaciones | ✅ Listo para probar |
| 4 | Planes alimentarios con versiones | ✅ Listo para probar |
| 5 | Suscripciones, pagos y administración | Autorización de prueba hecha en local. El cobro completo se prueba al final, con la app en Vercel. |
| 6 | Comunidad y desafíos | ✅ Listo para probar |

### Qué se puede probar ahora (profesional)

1. Abrir [http://localhost:3000](http://localhost:3000) → **Crear cuenta**.
2. Confirmar el correo (plantilla Nutrisfera, remitente de prueba `nutri.notificacion@gmail.com`).
3. Crear el consultorio en `/bienvenida`.
4. En `/panel`: el día del consultorio (indicadores, próximo paciente y evoluciones recientes), más pacientes, turnos, evoluciones, objetivos, mediciones y configuración.
5. En la ficha del paciente → **Visibilidad** → **Invitar al portal**. Llega un correo: al abrirlo elige una contraseña, acepta y entra a `/portal`.
6. En la ficha → **Planes**: el borrador no se comparte. **Publicar para el paciente** deja esa versión en `/portal/plan`.
7. En **Comunidad**: creá un desafío, publicalo, y con la cuenta del paciente sumate y escribí una actividad. El borrador no se ve en el portal.

No hace falta recorrer Facturación ahora. La autorización local ya respondió `authorized`
con las credenciales de prueba. Cobertura, cobro registrado y rechazo se prueban
cuando exista la URL pública (ver más abajo).

No hay cuenta de prueba precargada: cada quien se registra. **Continuar con Google**
está habilitado en el proyecto hospedado (alta e ingreso, ver `docs/autenticacion.md`).

### Qué se prueba al final

Cuando la clínica, el portal y los planes estén cerrados y el proyecto esté en Vercel:

1. Dejar `NEXT_PUBLIC_SITIO_URL` en `https://` del dominio de producción.
2. Cargar `MERCADOPAGO_WEBHOOK_SECRETO` y `SUPABASE_SECRET_KEY`.
3. Apuntar el webhook de Mercado Pago a `https://tu-dominio/api/facturacion/mercadopago`.
4. Recién ahí: pago aprobado, cobertura extendida y un rechazo (titular `OTHE`).

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
| Mercado Pago | Credenciales de prueba cargadas. La autorización local ya quedó `authorized`. |
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
