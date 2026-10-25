# Autenticación

Se usa Supabase Auth con sesiones en cookies (`@supabase/ssr`). No hay JWT manuales:
el servidor valida la sesión con `supabase.auth.getClaims()`.

## Flujos

| Flujo | Recorrido |
| --- | --- |
| Registro con correo | `/registro` → correo de confirmación → `/auth/confirmar?token_hash=…&type=email` → `/auth/destino` → `/bienvenida` |
| Ingreso con correo | `/ingresar` → `/auth/destino` (o la ruta `siguiente` saneada) |
| Google | `/ingresar` o `/registro` → Google → `/auth/confirmar?code=…` → `/auth/destino` |
| Recuperación | `/recuperar-contrasena` → correo → `/auth/confirmar?type=recovery` → `/restablecer-contrasena` |
| Alta profesional | `/bienvenida` → `crear_consultorio_inicial()` → `/panel` |
| Paciente | Invitación del profesional (fase 3) → `/portal` |

`/auth/destino` decide el área según el rol verificado en el servidor
(`calcularDestino` en `src/autorizacion/contexto.ts`).

Decisiones de seguridad:

- Los mensajes de registro y recuperación son idénticos exista o no la cuenta, para no
  permitir enumerar correos.
- El parámetro `siguiente` se sanea (`sanearRutaSiguiente`) para evitar redirecciones abiertas.
- Supabase limita los intentos de ingreso y envío de correos (`[auth.rate_limit]`).

## Configuración de Supabase (proyecto remoto)

En **Authentication → URL Configuration**:

- **Site URL**: `https://tu-dominio` (en local `http://localhost:3000`).
- **Redirect URLs**:
  - `http://localhost:3000/auth/confirmar**`
  - `https://tu-dominio/auth/confirmar**`
  - Previews de Vercel: `https://*-tu-equipo.vercel.app/auth/confirmar**`

En **Authentication → Providers → Email**: activar *Confirm email*. Contraseña mínima
de 8 caracteres con letras y números (igual que `supabase/config.toml`).

En **Authentication → Email Templates** pegar el HTML de `supabase/plantillas/`
(o aplicarlas con `PATCH /v1/projects/{ref}/config/auth`). Asuntos y archivos:

| Plantilla | Asunto | Archivo |
| --- | --- | --- |
| Confirm signup | Confirmá tu cuenta en Nutrisfera | `confirmacion.html` |
| Reset password | Restablecé tu contraseña · Nutrisfera | `recuperacion.html` |
| Invite user | Te invitaron a Nutrisfera | `invitacion.html` |
| Magic link | Tu enlace de ingreso · Nutrisfera | `enlace-magico.html` |
| Change email | Confirmá tu nuevo correo · Nutrisfera | `cambio-correo.html` |
| Reauthentication | `{{ .Token }} es tu código de Nutrisfera` | `reautenticacion.html` |
| Password changed | Tu contraseña se actualizó · Nutrisfera | `aviso-contrasena-cambiada.html` |

Los enlaces usan `token_hash` hacia `/auth/confirmar`, para que la confirmación
funcione aunque el correo se abra en otro navegador o dispositivo. El diseño
(paleta salvia, nombre Nutrisfera) está en `scripts/generar-plantillas-correo.mjs`;
después de cambiarlo, ejecutar `node scripts/generar-plantillas-correo.mjs`.
Para publicarlo en el proyecto hospedado: `node scripts/publicar-plantillas-correo.mjs`
(con `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_ID`).

En **Authentication → SMTP Settings** el nombre del remitente puede ser
`Nutrisfera`. En local, `config.toml` ya apunta a estas plantillas.

En producción configurar un **SMTP propio** (Authentication → SMTP Settings): el
servicio de correo incluido en Supabase tiene límites muy bajos y no es apto para uso real.

## Google OAuth

1. En [Google Cloud Console](https://console.cloud.google.com/) crear un proyecto y
   configurar la **pantalla de consentimiento OAuth** (tipo externo, nombre de la app,
   correo de soporte, dominios autorizados).
2. Crear credenciales **ID de cliente de OAuth → Aplicación web**:
   - *Orígenes autorizados*: `http://localhost:3000` y `https://tu-dominio`.
   - *URI de redireccionamiento*: `https://<ref-del-proyecto>.supabase.co/auth/v1/callback`
     (y `http://127.0.0.1:54321/auth/v1/callback` para Supabase local).
3. En Supabase → **Authentication → Providers → Google**: pegar el Client ID y el Secret.
4. Para Supabase local, completar `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` y
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` en `.env.local` antes de `npm run bd:iniciar`.

Una cuenta creada con Google pasa por la misma pantalla de bienvenida que una cuenta
con correo. Si el usuario ya tenía cuenta con el mismo correo verificado, Supabase vincula
ambas identidades automáticamente.
