/**
 * Configura el proveedor Google y las Redirect URLs en el proyecto hospedado.
 * Requiere un access token de https://supabase.com/dashboard/account/tokens
 *
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_…"
 *   $env:SUPABASE_PROJECT_ID="zisacjleazvlrklwilap"
 *   $env:GOOGLE_CLIENT_ID="….apps.googleusercontent.com"
 *   $env:GOOGLE_CLIENT_SECRET="GOCSPX-…"
 *   node scripts/configurar-google-oauth.mjs
 */
const proyecto = process.env.SUPABASE_PROJECT_ID ?? "zisacjleazvlrklwilap";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const sitio = process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000";

if (!token || !clientId || !clientSecret) {
  console.error("Definí SUPABASE_ACCESS_TOKEN, GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.");
  process.exit(1);
}

const cuerpo = {
  site_url: sitio,
  uri_allow_list: [
    `${sitio}/auth/confirmar`,
    `${sitio}/auth/confirmar/**`,
    `${sitio}/**`,
  ].join(","),
  external_google_enabled: true,
  external_google_client_id: clientId,
  external_google_secret: clientSecret,
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
  console.error(`No se pudo configurar Google OAuth (${respuesta.status}).`);
  console.error(detalle.slice(0, 800));
  process.exit(1);
}

console.log("Proveedor Google y Redirect URLs actualizados en el proyecto de Supabase.");
console.log(`Callback de Google Cloud: https://${proyecto}.supabase.co/auth/v1/callback`);
