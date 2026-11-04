import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verificarFirmaMercadoPago } from "@/servicios/facturacion/firma";
import { credencialesMercadoPago } from "@/servicios/facturacion/mercadopago";
import { procesarNotificacionMercadoPago } from "@/servicios/facturacion/notificaciones";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import { registrarError } from "@/lib/errores";
import type { Database } from "@/tipos/base-datos";

const esquemaNotificacion = z.object({
  id: z.union([z.string().max(200), z.number()]).optional(),
  type: z.string().max(100),
  action: z.string().max(100).optional(),
  data: z.object({ id: z.union([z.string().max(200), z.number()]) }),
});

/**
 * Notificaciones de Mercado Pago (suscripciones).
 * La vuelta del navegador a /panel/facturacion no acredita un pago.
 */
export async function POST(peticion: NextRequest) {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRETO?.trim();
  const claveServicio = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secreto || !claveServicio || !credencialesMercadoPago()) {
    return NextResponse.json({ error: "integracion_incompleta" }, { status: 503 });
  }

  const datoId = peticion.nextUrl.searchParams.get("data.id") ?? "";
  const firmaValida = verificarFirmaMercadoPago({
    firma: peticion.headers.get("x-signature"),
    solicitudId: peticion.headers.get("x-request-id"),
    datoId,
    secreto,
  });
  if (!firmaValida) return NextResponse.json({ error: "firma_invalida" }, { status: 401 });

  const analisis = esquemaNotificacion.safeParse(await peticion.json().catch(() => null));
  if (!analisis.success || String(analisis.data.data.id).toLowerCase() !== datoId.toLowerCase() || !/^[a-zA-Z0-9_-]+$/.test(datoId)) {
    return NextResponse.json({ error: "notificacion_invalida" }, { status: 400 });
  }
  const cuerpo = analisis.data;
  const tipo = cuerpo.type;
  const recursoId = String(cuerpo.data.id);
  if (!["subscription_preapproval", "subscription_authorized_payment", "payment"].includes(tipo)) {
    return NextResponse.json({ ok: true, ignorado: true });
  }
  // El simulador reutiliza el mismo id para distintos tópicos y recursos.
  // Sin id de evento, el request-id firmado distingue actualizaciones posteriores.
  const idEvento = `${tipo}:${recursoId}:${cuerpo.id ?? peticion.headers.get("x-request-id") ?? cuerpo.action ?? ""}`;

  const { supabaseUrl } = obtenerEntornoPublico();
  const admin = createClient<Database>(supabaseUrl, claveServicio, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: errorEvento } = await admin.from("eventos_proveedor").insert({
    id_evento: idEvento,
    tipo,
    recurso_id: recursoId,
  });
  if (errorEvento?.code === "23505") {
    const { data: evento, error } = await admin.from("eventos_proveedor").select("procesado_en").eq("proveedor", "mercadopago").eq("id_evento", idEvento).single();
    if (error) return NextResponse.json({ error: "no_registrado" }, { status: 500 });
    if (evento.procesado_en) return NextResponse.json({ ok: true, duplicado: true });
    // Un evento fallido se vuelve a procesar cuando Mercado Pago reintenta.
  }
  if (errorEvento && errorEvento.code !== "23505") {
    registrarError("webhook_evento", errorEvento);
    return NextResponse.json({ error: "no_registrado" }, { status: 500 });
  }

  try {
    await procesarNotificacionMercadoPago(admin, tipo, recursoId);
    const { error } = await admin.from("eventos_proveedor").update({ procesado_en: new Date().toISOString(), error: null }).eq("proveedor", "mercadopago").eq("id_evento", idEvento);
    if (error) throw error;
  } catch (error) {
    registrarError("webhook_proceso", error);
    await admin.from("eventos_proveedor").update({ error: "no_procesado" }).eq("id_evento", idEvento);
    return NextResponse.json({ error: "no_procesado" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
