/**
 * Publica las plantillas de correo en un proyecto de Supabase hospedado.
 * Requiere un access token de https://supabase.com/dashboard/account/tokens
 *
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_…"
 *   $env:SUPABASE_PROJECT_ID="zisacjleazvlrklwilap"
 *   node scripts/publicar-plantillas-correo.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const proyecto = process.env.SUPABASE_PROJECT_ID;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!proyecto || !token) {
  console.error("Definí SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_ID.");
  process.exit(1);
}

function leer(nombre) {
  return readFileSync(join(raiz, "supabase", "plantillas", nombre), "utf8");
}

const cuerpo = {
  smtp_sender_name: "Nutrisfera",
  mailer_subjects_confirmation: "Confirmá tu cuenta en Nutrisfera",
  mailer_templates_confirmation_content: leer("confirmacion.html"),
  mailer_subjects_recovery: "Restablecé tu contraseña · Nutrisfera",
  mailer_templates_recovery_content: leer("recuperacion.html"),
  mailer_subjects_invite: "Te invitaron a Nutrisfera",
  mailer_templates_invite_content: leer("invitacion.html"),
  mailer_subjects_magic_link: "Tu enlace de ingreso · Nutrisfera",
  mailer_templates_magic_link_content: leer("enlace-magico.html"),
  mailer_subjects_email_change: "Confirmá tu nuevo correo · Nutrisfera",
  mailer_templates_email_change_content: leer("cambio-correo.html"),
  mailer_subjects_reauthentication: "{{ .Token }} es tu código de Nutrisfera",
  mailer_templates_reauthentication_content: leer("reautenticacion.html"),
  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification: "Tu contraseña se actualizó · Nutrisfera",
  mailer_templates_password_changed_notification_content: leer("aviso-contrasena-cambiada.html"),
};

const respuesta = await fetch(`https://api.supabase.com/v1/projects/${proyecto}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(cuerpo),
});

if (!respuesta.ok) {
  const detalle = await respuesta.text();
  console.error(`No se pudieron publicar las plantillas (${respuesta.status}).`);
  console.error(detalle.slice(0, 500));
  process.exit(1);
}

console.log("Plantillas publicadas en el proyecto de Supabase.");
