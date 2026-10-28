import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma de webhooks de Mercado Pago (documentación vigente, 2026):
 * manifiesto `id:{data.id};request-id:{x-request-id};ts:{ts};` y HMAC-SHA256.
 * El id alfanumérico se compara en minúsculas.
 */
export function verificarFirmaMercadoPago(entrada: {
  firma: string | null;
  solicitudId: string | null;
  datoId: string | null;
  secreto: string;
}): boolean {
  if (!entrada.firma || !entrada.secreto || !entrada.datoId) return false;
  const partes = Object.fromEntries(
    entrada.firma.split(",").map((parte) => {
      const indice = parte.indexOf("=");
      return [parte.slice(0, indice), parte.slice(indice + 1)];
    }),
  );
  const marca = partes.ts;
  const recibida = partes.v1;
  if (!marca || !recibida) return false;

  const manifiesto = `id:${entrada.datoId.toLowerCase()};request-id:${entrada.solicitudId ?? ""};ts:${marca};`;
  const calculada = createHmac("sha256", entrada.secreto).update(manifiesto).digest("hex");
  const izquierda = Buffer.from(calculada);
  const derecha = Buffer.from(recibida);
  if (izquierda.length !== derecha.length) return false;
  return timingSafeEqual(izquierda, derecha);
}
