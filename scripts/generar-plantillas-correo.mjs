/**
 * Genera las plantillas HTML de correo de autenticación.
 * El diseño replica la identidad de la app (paleta salvia, radio 12px, voseo).
 *
 *   node scripts/generar-plantillas-correo.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NOMBRE_PRODUCTO = "Nutrisfera";
const CARPETA_PLANTILLAS = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "plantillas");

const COLOR = {
  primario: "#158561",
  primarioTexto: "#ffffff",
  fondo: "#f7f9fc",
  texto: "#141b24",
  apagado: "#5c646f",
  borde: "#dee4e8",
  tarjeta: "#ffffff",
  acento: "#dff7eb",
};

const SALUDO =
  "{{ with .Data }}{{ if .nombre }}Hola, {{ .nombre }}.{{ else }}Hola.{{ end }}{{ else }}Hola.{{ end }}";

function enlaceConfirmacion(tipo) {
  return `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&amp;type=${tipo}`;
}

function marco({ tituloDocumento, preencabezado, titulo, parrafos, boton, nota }) {
  const parrafosHtml = parrafos
    .map(
      (parrafo) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.texto};">${parrafo}</p>`,
    )
    .join("\n                ");

  const botonHtml = boton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                  <tr>
                    <td align="center" bgcolor="${COLOR.primario}" style="border-radius:10px;">
                      <a href="${boton.href}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;line-height:1.2;color:${COLOR.primarioTexto};text-decoration:none;border-radius:10px;">
                        ${boton.etiqueta}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.55;color:${COLOR.apagado};">
                  Si el botón no funciona,
                  <a href="${boton.href}" target="_blank" rel="noopener noreferrer" style="color:${COLOR.primario};text-decoration:underline;">abrí este enlace</a>.
                </p>`
    : "";

  return `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${tituloDocumento}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLOR.fondo};font-family:'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preencabezado}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.fondo};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:${COLOR.tarjeta};border:1px solid ${COLOR.borde};border-radius:16px;overflow:hidden;">
            <tr>
              <td bgcolor="${COLOR.primario}" style="padding:28px 32px;background-color:${COLOR.primario};">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" width="36" height="36" bgcolor="${COLOR.primarioTexto}"
                        style="width:36px;height:36px;border-radius:10px;background-color:${COLOR.primarioTexto};text-align:center;font-family:'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:36px;color:${COLOR.primario};">
                      N
                    </td>
                    <td valign="middle" style="padding-left:12px;font-family:'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif;">
                      <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${COLOR.primarioTexto};">${NOMBRE_PRODUCTO}</div>
                      <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.primarioTexto};opacity:0.78;">Consultorio de nutrición</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif;color:${COLOR.texto};">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:${COLOR.texto};">${titulo}</h1>
                ${parrafosHtml}
                ${botonHtml}
                <p style="margin:0;font-size:13px;line-height:1.55;color:${COLOR.apagado};">${nota}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid ${COLOR.borde};background-color:${COLOR.fondo};font-family:'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.55;color:${COLOR.apagado};">
                  Los datos de salud se tratan con confidencialidad y acceso restringido.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.55;color:${COLOR.apagado};">
                  Este mensaje es transaccional y lo envía ${NOMBRE_PRODUCTO}. Si no reconocés la solicitud, podés ignorarlo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

const plantillas = [
  {
    archivo: "confirmacion.html",
    tituloDocumento: `Confirmá tu cuenta · ${NOMBRE_PRODUCTO}`,
    preencabezado: `Confirmá tu correo para activar tu consultorio en ${NOMBRE_PRODUCTO}.`,
    titulo: "Confirmá tu cuenta",
    parrafos: [
      SALUDO,
      `Recibimos una solicitud para crear una cuenta en ${NOMBRE_PRODUCTO} con <strong>{{ .Email }}</strong>. Para activarla y configurar tu consultorio, confirmá tu correo electrónico.`,
      "El enlace vence en una hora y solo se puede usar una vez.",
    ],
    boton: { etiqueta: "Confirmar mi cuenta", href: enlaceConfirmacion("email") },
    nota: "Si no creaste una cuenta, ignorá este mensaje. No vamos a usar tu correo hasta que lo confirmes.",
  },
  {
    archivo: "recuperacion.html",
    tituloDocumento: `Restablecé tu contraseña · ${NOMBRE_PRODUCTO}`,
    preencabezado: `Elegí una nueva contraseña para tu cuenta de ${NOMBRE_PRODUCTO}. El enlace vence en una hora.`,
    titulo: "Restablecé tu contraseña",
    parrafos: [
      SALUDO,
      `Recibimos una solicitud para cambiar la contraseña de <strong>{{ .Email }}</strong>. Si fuiste vos, elegí una nueva a continuación.`,
      "El enlace vence en una hora y solo se puede usar una vez.",
    ],
    boton: { etiqueta: "Elegir una nueva contraseña", href: enlaceConfirmacion("recovery") },
    nota: "Si no pediste este cambio, ignorá el mensaje: tu contraseña actual sigue siendo válida.",
  },
  {
    archivo: "invitacion.html",
    tituloDocumento: `Te invitaron a ${NOMBRE_PRODUCTO}`,
    preencabezado: `Aceptá la invitación para acceder a tu espacio en ${NOMBRE_PRODUCTO}.`,
    titulo: "Te invitaron a unirte",
    parrafos: [
      SALUDO,
      `Recibiste una invitación para crear tu cuenta en ${NOMBRE_PRODUCTO} con <strong>{{ .Email }}</strong>. Al aceptar vas a poder ingresar a tu espacio.`,
      "El enlace vence en una hora y solo se puede usar una vez.",
    ],
    boton: { etiqueta: "Aceptar invitación", href: enlaceConfirmacion("invite") },
    nota: "Si no esperabas esta invitación, ignorá el mensaje.",
  },
  {
    archivo: "enlace-magico.html",
    tituloDocumento: `Tu enlace de ingreso · ${NOMBRE_PRODUCTO}`,
    preencabezado: `Ingresá a ${NOMBRE_PRODUCTO} con este enlace de un solo uso.`,
    titulo: "Ingresá a tu cuenta",
    parrafos: [
      SALUDO,
      `Usá el botón para ingresar a ${NOMBRE_PRODUCTO} con <strong>{{ .Email }}</strong>. No hace falta contraseña en este paso.`,
      "El enlace vence en una hora y solo se puede usar una vez.",
    ],
    boton: { etiqueta: "Ingresar ahora", href: enlaceConfirmacion("magiclink") },
    nota: "Si no pediste este enlace, ignorá el mensaje. Nadie puede ingresar a tu cuenta sin él.",
  },
  {
    archivo: "cambio-correo.html",
    tituloDocumento: `Confirmá tu nuevo correo · ${NOMBRE_PRODUCTO}`,
    preencabezado: `Confirmá {{ .NewEmail }} como correo de tu cuenta en ${NOMBRE_PRODUCTO}.`,
    titulo: "Confirmá tu nuevo correo",
    parrafos: [
      SALUDO,
      `Pediste cambiar el correo de tu cuenta de <strong>{{ .Email }}</strong> a <strong>{{ .NewEmail }}</strong>. Para completar el cambio, confirmá la nueva dirección.`,
      "El enlace vence en una hora y solo se puede usar una vez.",
    ],
    boton: { etiqueta: "Confirmar nuevo correo", href: enlaceConfirmacion("email_change") },
    nota: "Si no pediste este cambio, ignorá el mensaje y tu correo actual se mantiene.",
  },
  {
    archivo: "reautenticacion.html",
    tituloDocumento: `Código de verificación · ${NOMBRE_PRODUCTO}`,
    preencabezado: "Usá este código para confirmar una acción sensible en tu cuenta.",
    titulo: "Tu código de verificación",
    parrafos: [
      SALUDO,
      `Para continuar con una acción sensible en ${NOMBRE_PRODUCTO}, ingresá este código:`,
      `<span style="display:inline-block;padding:12px 18px;background-color:${COLOR.acento};border-radius:10px;font-size:28px;font-weight:700;letter-spacing:0.18em;color:${COLOR.texto};">{{ .Token }}</span>`,
      "El código vence en unos minutos y solo se puede usar una vez.",
    ],
    nota: "Si no iniciaste esta acción, ignorá el mensaje y considerá cambiar tu contraseña.",
  },
  {
    archivo: "aviso-contrasena-cambiada.html",
    tituloDocumento: `Tu contraseña se actualizó · ${NOMBRE_PRODUCTO}`,
    preencabezado: `La contraseña de tu cuenta en ${NOMBRE_PRODUCTO} se actualizó.`,
    titulo: "Tu contraseña se actualizó",
    parrafos: [
      SALUDO,
      `La contraseña de <strong>{{ .Email }}</strong> se cambió correctamente. A partir de ahora tenés que usar la nueva para ingresar.`,
    ],
    boton: { etiqueta: `Ir a ${NOMBRE_PRODUCTO}`, href: "{{ .SiteURL }}/ingresar" },
    nota: `Si no hiciste este cambio, restablecé tu contraseña ahora mismo desde {{ .SiteURL }}/recuperar-contrasena y contactá a quien administra tu consultorio.`,
  },
];

function conDatosDeEjemplo(html) {
  return html
    .replaceAll(
      "{{ with .Data }}{{ if .nombre }}Hola, {{ .nombre }}.{{ else }}Hola.{{ end }}{{ else }}Hola.{{ end }}",
      "Hola, Daniela.",
    )
    .replaceAll("{{ .Email }}", "daniela@consultorio.test")
    .replaceAll("{{ .NewEmail }}", "nuevo@consultorio.test")
    .replaceAll("{{ .SiteURL }}", "http://localhost:3000")
    .replaceAll("{{ .TokenHash }}", "token-de-ejemplo")
    .replaceAll("{{ .Token }}", "847291");
}

mkdirSync(CARPETA_PLANTILLAS, { recursive: true });

const htmlGenerado = [];
for (const plantilla of plantillas) {
  const { archivo, ...contenido } = plantilla;
  const html = marco(contenido);
  writeFileSync(join(CARPETA_PLANTILLAS, archivo), html, "utf8");
  htmlGenerado.push(html);
  console.log(`escrita ${archivo}`);
}

const previa = `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8">
    <title>Vista previa de correos · ${NOMBRE_PRODUCTO}</title>
  </head>
  <body style="margin:0;background:#e8edf1;">
    ${htmlGenerado.map((html) => conDatosDeEjemplo(html)).join("\n")}
  </body>
</html>
`;
writeFileSync(join(CARPETA_PLANTILLAS, "vista-previa.html"), previa, "utf8");
console.log("escrita vista-previa.html");

