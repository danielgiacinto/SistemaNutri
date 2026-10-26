# SistemaNutri

Plataforma SaaS para nutricionistas (nombre comercial provisorio: **Nutrisfera**, configurable
en `src/configuracion/producto.ts`): gestión del consultorio, pacientes, agenda, historia
clínica, mediciones, objetivos, planes alimentarios y portal del paciente.

## Estado

Última actualización: 26 de octubre de 2026. El producto está en **fase 2 cerrada**:
se puede registrar un consultorio y trabajar con pacientes, agenda e historia clínica
sobre el proyecto de Supabase hospedado. Las fases 3 a 6 todavía no están implementadas
(el menú muestra esas secciones como “en construcción”).

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundamentos: autenticación, roles, multi-tenencia con RLS, layouts, configuración | ✅ Listo para probar |
| 2 | Pacientes, agenda, historia clínica, objetivos, mediciones y gráficos | ✅ Listo para probar |
| 3 | Portal del paciente e invitaciones | Pendiente |
| 4 | Planes alimentarios con versiones | Pendiente |
| 5 | Suscripciones, pagos y administración | Pendiente |
| 6 | Comunidad y desafíos | Pendiente |

### Qué se puede probar ahora (profesional)

1. Abrir [http://localhost:3000](http://localhost:3000) → **Crear cuenta**.
2. Confirmar el correo (plantilla Nutrisfera, remitente de prueba `nutri.notificacion@gmail.com`).
3. Crear el consultorio en `/bienvenida`.
4. En `/panel`: pacientes, turnos, evoluciones, objetivos, mediciones, analíticas y configuración.

No hay cuenta de prueba precargada: cada quien se registra. **Continuar con Google**
está habilitado en el proyecto hospedado (alta e ingreso, ver `docs/autenticacion.md`).
El portal del paciente (`/portal`) existe como cascarón y pide una cuenta de
paciente, que se crea en la fase 3.

### Entorno

| Pieza | Estado |
| --- | --- |
| Proyecto Supabase `sistemanutri` (São Paulo) | Creado; las dos migraciones ya están aplicadas |
| `.env.local` | Apunta al proyecto hospedado (no a Supabase local) |
| Correos de Auth | Plantillas Nutrisfera publicadas + SMTP de prueba con Gmail |
| Site URL | `http://localhost:3000` |
| Redirect URLs / Google OAuth | Habilitado en el proyecto hospedado (local + callback de Supabase) |
| `SUPABASE_SECRET_KEY` | Vacía: el script de superadmin todavía no se puede usar |
| Vercel y secretos de CI | Pendientes |

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
