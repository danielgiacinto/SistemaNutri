import { dineroFinanzas } from "@/tipos/finanzas";
import { colores, escaparHtml, parrafosCorreo, presentarCorreo } from "./presentacion";

export type DatosCorreoRecordatorio = {
  paciente: string;
  consulta: string;
  original: number;
  abonado: number;
  saldo: number;
  moneda: string;
  nombre_remitente: string;
  instrucciones: string;
  texto: string;
  zona: string;
  prueba?: boolean;
};

/** La misma composición se utiliza en la cola y en muestras explícitamente identificadas. */
export function crearMensajeRecordatorioCobro(datos: DatosCorreoRecordatorio & { correo: string }, remitente: string, identificador: string) {
  const dinero = (importe: number) => dineroFinanzas(importe, datos.moneda);
  const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: datos.zona }).format(new Date(datos.consulta));
  return {
    from: { name: datos.nombre_remitente, address: remitente },
    to: datos.correo,
    subject: `${datos.prueba ? "[PRUEBA] " : ""}Recordatorio de pago pendiente — ${datos.nombre_remitente}`,
    messageId: `<cobro-${identificador}@${remitente.split("@")[1]}>`,
    text: `${datos.prueba ? "MUESTRA DE DISEÑO — SIN COBRO REAL. No corresponde realizar ningún pago.\n\n" : ""}Hola, ${datos.paciente}:\n\n${datos.texto}\n\nConsulta: ${fecha}\nImporte original: ${dinero(datos.original)}\nTotal abonado: ${dinero(datos.abonado)}\nSaldo pendiente: ${dinero(datos.saldo)}\n\n${datos.instrucciones.trim() || "Comunicate con el consultorio por tus canales habituales para coordinar el pago."}\n\nSi ya realizaste el pago, comunicate con el consultorio para confirmar su registro.\n\n${datos.nombre_remitente}`,
    html: crearHtmlRecordatorioCobro(datos),
  };
}

export function crearHtmlRecordatorioCobro(datos: DatosCorreoRecordatorio): string {
  const dinero = (importe: number) => escaparHtml(dineroFinanzas(importe, datos.moneda));
  const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: datos.zona }).format(new Date(datos.consulta));
  const consultorio = escaparHtml(datos.nombre_remitente);
  return presentarCorreo({
    asunto: `Recordatorio de pago pendiente — ${datos.nombre_remitente}`,
    preencabezado: `Consultá el saldo actualizado y cómo coordinar el pago con ${datos.nombre_remitente}.`,
    titulo: "Recordatorio de tu pago",
    contexto: `En nombre de ${datos.nombre_remitente}`,
    pie: `Recordatorio enviado por ${datos.nombre_remitente} a través de Nutrisfera. Recibís estos avisos con tu autorización. Podés solicitar al consultorio que deje de enviarlos.`,
    prueba: datos.prueba,
    contenido: `<p style="margin:0 0 14px">Hola, ${escaparHtml(datos.paciente)}:</p>
${parrafosCorreo(datos.texto)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:${colores.acento};border:1px solid ${colores.borde};border-radius:12px"><tr><td style="padding:24px"><p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:1px;color:${colores.primario}">SALDO PENDIENTE · ${escaparHtml(datos.moneda)}</p><p style="margin:0;font-size:36px;line-height:1.3;font-weight:bold;color:${colores.primario}">${dinero(datos.saldo)}</p><p style="margin:12px 0 0;font-size:14px;color:${colores.secundario}">Consulta del ${escaparHtml(fecha)}</p></td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;margin:0 0 24px"><tr><td style="padding:8px 0;color:${colores.secundario}">Importe original</td><td align="right" style="padding:8px 0">${dinero(datos.original)}</td></tr><tr><td style="padding:8px 0;border-top:1px solid ${colores.borde};color:${colores.secundario}">Total abonado</td><td align="right" style="padding:8px 0;border-top:1px solid ${colores.borde}">${dinero(datos.abonado)}</td></tr></table>
<h2 style="margin:0 0 10px;font-size:18px">Cómo coordinar el pago</h2>
${parrafosCorreo(datos.instrucciones.trim() || "Comunicate con el consultorio por tus canales habituales para coordinar el pago.")}
<p style="margin:22px 0 0;padding-top:20px;border-top:1px solid ${colores.borde};font-size:14px;color:${colores.secundario}">Si ya realizaste el pago, comunicate con ${consultorio} para confirmar su registro. Este aviso muestra el saldo registrado al momento del envío.</p>`,
  });
}
