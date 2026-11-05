import "server-only";
import nodemailer from "nodemailer";

export type AvisoCorreoComercial = {
  destinatario: string;
  asunto: string;
  texto: string;
};

/** El remitente debe coincidir con la cuenta Gmail autenticada o un alias verificado. */
export async function enviarCorreoComercial(aviso: AvisoCorreoComercial): Promise<string> {
  const usuario = process.env.CORREO_COMERCIAL_USUARIO?.trim();
  const clave = process.env.CORREO_COMERCIAL_CLAVE_APLICACION?.trim();
  if (!usuario || !clave) throw new Error("correo_comercial_sin_configurar");
  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: usuario, pass: clave },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  const resultado = await transporte.sendMail({
    from: { name: "Nutrisfera", address: usuario },
    to: aviso.destinatario,
    subject: aviso.asunto,
    text: aviso.texto,
  });
  if (!resultado.accepted.includes(aviso.destinatario)) throw new Error("correo_comercial_rechazado");
  return resultado.messageId;
}
