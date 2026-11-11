import colores from "@/configuracion/paleta-correo.json";

export { colores };

export function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]!);
}

export function parrafosCorreo(texto: string): string {
  return texto.split(/\n\n+/).filter(Boolean).map(parrafo => `<p style="margin:0 0 18px;overflow-wrap:anywhere">${escaparHtml(parrafo).replace(/\n/g, "<br>")}</p>`).join("");
}

/** El contenido HTML lo construyen las plantillas, escapando todos sus datos. */
export function presentarCorreo(datos: {
  asunto: string;
  preencabezado: string;
  titulo: string;
  contenido: string;
  contexto: string;
  pie: string;
  prueba?: boolean;
}): string {
  const avisoPrueba = datos.prueba
    ? `<tr><td style="padding:16px 28px;background:${colores.acento};border-bottom:1px solid ${colores.borde};font-size:13px;line-height:1.6;color:${colores.primario}"><strong>MUESTRA DE DISEÑO · SIN COBRO REAL</strong><br>Este correo es una prueba solicitada. No corresponde realizar ningún pago.</td></tr>`
    : "";
  return `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escaparHtml(datos.asunto)}</title></head>
<body style="margin:0;padding:0;background:${colores.fondo};color:${colores.texto};font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escaparHtml(datos.prueba ? "Muestra de diseño: no corresponde pagar." : datos.preencabezado)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colores.fondo}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:${colores.tarjeta};border:1px solid ${colores.borde};border-radius:18px">
<tr><td style="padding:26px 28px;border-bottom:1px solid ${colores.borde}"><p style="margin:0;color:${colores.primario};font-size:26px;font-weight:bold;letter-spacing:-1px">Nutrisfera.</p><p style="margin:6px 0 0;color:${colores.secundario};font-size:12px">${escaparHtml(datos.contexto)}</p></td></tr>
${avisoPrueba}<tr><td style="padding:30px 28px;font-size:16px;line-height:1.65"><h1 style="margin:0 0 18px;font-size:28px;line-height:1.25;letter-spacing:-0.6px">${escaparHtml(datos.titulo)}</h1>${datos.contenido}</td></tr>
<tr><td style="padding:22px 28px;border-top:1px solid ${colores.borde};font-size:12px;line-height:1.7;color:${colores.secundario}"><p style="margin:0 0 8px">Por tu seguridad, nunca te pediremos contraseñas ni datos de tarjeta por correo.</p><p style="margin:0">${escaparHtml(datos.pie)}</p></td></tr>
</table><p style="margin:20px 0 0;font-size:12px;color:${colores.secundario}">Nutrisfera · Gestión para profesionales de la nutrición</p>
</td></tr></table></body></html>`;
}
