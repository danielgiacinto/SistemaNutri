import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verificarFirmaMercadoPago } from "@/servicios/facturacion/firma";
import { consultarRecursoMercadoPago, credencialesMercadoPago } from "@/servicios/facturacion/mercadopago";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import { registrarError } from "@/lib/errores";
import type { Database } from "@/tipos/base-datos";

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

  const cuerpo = (await peticion.json()) as { id?: string | number; type?: string; action?: string; data?: { id?: string } };
  const tipo = cuerpo.type ?? "desconocido";
  const recursoId = cuerpo.data?.id ?? datoId;
  const idEvento = String(cuerpo.id ?? `${tipo}:${recursoId}:${cuerpo.action ?? ""}`);

  const { supabaseUrl } = obtenerEntornoPublico();
  const admin = createClient<Database>(supabaseUrl, claveServicio, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: errorEvento } = await admin.from("eventos_proveedor").insert({
    id_evento: idEvento,
    tipo,
    recurso_id: recursoId,
  });
  if (errorEvento?.code === "23505") return NextResponse.json({ ok: true, duplicado: true });
  if (errorEvento) {
    registrarError("webhook_evento", errorEvento);
    return NextResponse.json({ error: "no_registrado" }, { status: 500 });
  }

  try {
    if (tipo === "subscription_authorized_payment" || tipo === "payment") {
      const pago = (await consultarRecursoMercadoPago(
        tipo === "payment" ? `/v1/payments/${recursoId}` : `/authorized_payments/${recursoId}`,
      )) as {
        id?: number | string;
        status?: string;
        transaction_amount?: number;
        currency_id?: string;
        date_approved?: string;
        preapproval_id?: string;
        metadata?: { preapproval_id?: string };
      } | null;
      const mpPago = String(pago?.id ?? recursoId);
      const suscripcion = pago?.preapproval_id ?? pago?.metadata?.preapproval_id;
      if (pago && suscripcion) {
        const estado = pago.status === "approved" ? "aprobado" : pago.status === "refunded" ? "devuelto" : pago.status === "rejected" ? "rechazado" : "pendiente";
        await admin.rpc("registrar_pago_verificado", {
          p_mp_suscripcion: suscripcion,
          p_mp_pago: mpPago,
          p_estado: estado,
          p_monto: pago.transaction_amount ?? 0,
          p_moneda: pago.currency_id ?? "ARS",
          p_cobrado_en: pago.date_approved ?? new Date().toISOString(),
        });
      }
    }
    await admin.from("eventos_proveedor").update({ procesado_en: new Date().toISOString() }).eq("id_evento", idEvento);
  } catch (error) {
    registrarError("webhook_proceso", error);
    await admin.from("eventos_proveedor").update({ error: "no_procesado" }).eq("id_evento", idEvento);
  }

  return NextResponse.json({ ok: true });
}
