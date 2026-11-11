import { colores, escaparHtml, parrafosCorreo, presentarCorreo } from "@/servicios/correos/presentacion";

/** Tablas y estilos en línea para Outlook; el texto alternativo se envía por separado. */
export function crearHtmlCorreoComercial(aviso: { asunto: string; texto: string; tipo?: string; prueba?: boolean }, sitio: string): string {
  const confirmado = aviso.tipo === "cobro_confirmado";
  const destino = new URL("/panel/facturacion", sitio);
  if (!["https:", "http:"].includes(destino.protocol)) throw new Error("sitio_correo_invalido");
  const enlace = escaparHtml(destino.href);
  const contenido = confirmado
    ? `<p style="margin:0 0 20px">Registramos el cobro de tu suscripción a Nutrisfera. Gracias por elegirnos para acompañar tu consultorio.</p>
       <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:${colores.acento};border:1px solid ${colores.borde};border-radius:12px"><tr><td style="padding:22px"><p style="margin:0 0 8px;color:${colores.primario};font-size:12px;font-weight:bold;letter-spacing:1px">PAGO CONFIRMADO</p><p style="margin:0;font-size:18px;font-weight:bold">Suscripción a Nutrisfera</p><p style="margin:8px 0 0;font-size:14px;color:${colores.secundario}">El período cubierto y el historial de pagos están disponibles en tu cuenta.</p></td></tr></table>`
    : parrafosCorreo(aviso.texto);
  return presentarCorreo({
    asunto: aviso.asunto,
    titulo: confirmado ? "Tu pago está confirmado" : aviso.asunto,
    preencabezado: confirmado ? "El cobro de tu suscripción fue registrado. Revisá el detalle en tu cuenta." : aviso.asunto,
    contexto: "Tu consultorio, en un solo lugar",
    pie: "Mensaje automático de Nutrisfera sobre tu cuenta y suscripción.",
    prueba: aviso.prueba,
    contenido: `${contenido}
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="${colores.primario}" style="border-radius:10px"><a href="${enlace}" style="display:inline-block;padding:14px 24px;border:1px solid ${colores.primario};border-radius:10px;color:${colores.tarjeta};font-size:15px;font-weight:bold;text-decoration:none">Ver mi facturación &rarr;</a></td></tr></table>
<p style="margin:18px 0 0;font-size:12px;color:${colores.secundario};overflow-wrap:anywhere">También podés ingresar a Nutrisfera y abrir Plan y facturación.<br><a href="${enlace}" style="color:${colores.primario}">${enlace}</a></p>`,
  });
}
