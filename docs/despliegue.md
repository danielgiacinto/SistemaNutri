# Despliegue

## Variables de entorno

| Variable | Dónde | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (todos los entornos) | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (todos los entornos) | Clave publicable (`sb_publishable_…`) o clave `anon`. Es pública: la seguridad la da RLS. |
| `NEXT_PUBLIC_SITIO_URL` | Vercel (solo Production) | `https://tu-dominio`. En Preview dejarla vacía: se usa el host de la petición. |
| `SUPABASE_SECRET_KEY` | Solo `.env.local` por ahora | Clave secreta/`service_role`. Omite RLS. Solo para `scripts/`. Nunca con prefijo `NEXT_PUBLIC_`. |
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

Última actualización: 26 de octubre de 2026.

| Pieza | Valor |
| --- | --- |
| Proyecto | `sistemanutri`, región São Paulo (`sa-east-1`), ref `zisacjleazvlrklwilap` |
| Migraciones aplicadas | `fundamentos_identidad` y `gestion_clinica` |
| App local | `npm run dev` → [http://localhost:3000](http://localhost:3000) con `.env.local` |
| Auth | Plantillas Nutrisfera publicadas; SMTP de prueba con Gmail (ver `docs/autenticacion.md`) |
| Site URL | `http://localhost:3000` |
| Redirect URLs / Google OAuth | Habilitado en hospedado: proveedor Google, Redirect URLs de local y callback de Supabase en Google Cloud (`docs/autenticacion.md`) |
| `SUPABASE_SECRET_KEY` | Vacía en `.env.local`: `npm run superadmin:crear` no corre hasta cargarla |
| Vercel / secretos de GitHub Actions | Pendientes |

Este entorno es de desarrollo. Antes de datos reales de pacientes: dominio propio,
SMTP transaccional, OAuth, CI y la revisión legal de `docs/seguridad-y-privacidad.md`.

> El repositorio está dentro de OneDrive. La sincronización de `node_modules` y `.next`
> puede volver lenta la instalación o bloquear archivos; si ocurre, excluí esas carpetas
> de la sincronización o mové el proyecto fuera de OneDrive.
