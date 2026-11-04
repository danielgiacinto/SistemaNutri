import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { credencialesMercadoPago } from "@/servicios/facturacion/mercadopago";
import { conciliarLote } from "@/servicios/facturacion/conciliacion";
import { registrarError } from "@/lib/errores";

export const maxDuration = 300;

export async function GET(peticion: NextRequest) {
  const secreto = process.env.CRON_SECRET?.trim();
  const recibido = Buffer.from(peticion.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto ?? ""}`);
  if (!secreto || recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
    return Response.json({ error: "sin_autorizacion" }, { status: 401 });
  }
  const cliente = crearClienteServicio();
  if (!cliente || !credencialesMercadoPago()) return Response.json({ error: "integracion_incompleta" }, { status: 503 });
  try {
    const resultado = await conciliarLote(cliente);
    return Response.json(resultado, { status: resultado.fallidas ? 503 : 200 });
  } catch (error) {
    registrarError("conciliacion_programada", error);
    return Response.json({ error: "verificacion_pendiente" }, { status: 503 });
  }
}
