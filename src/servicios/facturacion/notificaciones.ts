import "server-only";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { consultarRecursoMercadoPago, type SuscripcionMercadoPago } from "./mercadopago";

type PagoMercadoPago = {
  id: string | number;
  status: string;
  transaction_amount: number;
  currency_id: string;
  date_approved?: string;
  date_created?: string;
  preapproval_id?: string;
  metadata?: { preapproval_id?: string };
};
type FacturaMercadoPago = {
  preapproval_id: string;
  payment?: { id?: string | number };
};

async function sincronizarSuscripcion(cliente: ClienteSupabase, mpId: string) {
  const remota = await consultarRecursoMercadoPago(`/preapproval/${encodeURIComponent(mpId)}`) as SuscripcionMercadoPago | null;
  if (!remota || remota.id !== mpId || !["pending", "authorized", "paused", "cancelled"].includes(remota.status)) {
    throw new Error("Respuesta de suscripción inválida.");
  }
  const { data: local, error } = await cliente.from("suscripciones").select("id, consultorio_id, precio, moneda").eq("mp_id", mpId).maybeSingle();
  if (error) throw error;
  if (!local) throw new Error("La suscripción todavía no está registrada.");
  if (remota.external_reference !== local.consultorio_id ||
      Number(remota.auto_recurring?.transaction_amount) !== Number(local.precio) ||
      remota.auto_recurring?.currency_id !== local.moneda) {
    throw new Error("La suscripción no coincide con el consultorio y su precio.");
  }
  const { error: errorGuardado } = await cliente.from("suscripciones").update({
    estado_mp: remota.status,
    proximo_cobro_en: remota.next_payment_date ?? null,
    mp_actualizado_en: remota.last_modified ?? null,
    cancelada_en: remota.status === "cancelled" ? remota.last_modified ?? new Date().toISOString() : null,
  }).eq("id", local.id).eq("mp_id", mpId);
  if (errorGuardado) throw errorGuardado;
}

/** El cuerpo del webhook solo identifica el recurso; los importes vienen de la API autenticada. */
export async function procesarNotificacionMercadoPago(cliente: ClienteSupabase, tipo: string, recursoId: string) {
  if (tipo === "subscription_preapproval") {
    await sincronizarSuscripcion(cliente, recursoId);
    return;
  }

  let mpId: string | undefined;
  let pagoId = recursoId;
  if (tipo === "subscription_authorized_payment") {
    const factura = await consultarRecursoMercadoPago(`/authorized_payments/${encodeURIComponent(recursoId)}`) as FacturaMercadoPago | null;
    if (!factura) throw new Error("No se pudo verificar la factura.");
    if (!factura.payment?.id) return; // Una factura programada aún puede no tener un intento de pago.
    mpId = factura.preapproval_id;
    pagoId = String(factura.payment.id);
  }

  const pago = await consultarRecursoMercadoPago(`/v1/payments/${encodeURIComponent(pagoId)}`) as PagoMercadoPago | null;
  if (!pago || String(pago.id) !== pagoId) throw new Error("No se pudo verificar el pago.");
  mpId ??= pago.preapproval_id ?? pago.metadata?.preapproval_id;
  if (!mpId) {
    // Payments no siempre informa preapproval_id; la factura vincula ambos recursos.
    const facturas = await consultarRecursoMercadoPago(`/authorized_payments/search?payment_id=${encodeURIComponent(pagoId)}`) as { results?: FacturaMercadoPago[] } | null;
    mpId = facturas?.results?.find((factura) => String(factura.payment?.id) === pagoId)?.preapproval_id;
  }
  if (!mpId) return; // Pago del vendedor ajeno a las suscripciones de esta aplicación.
  await sincronizarSuscripcion(cliente, mpId);
  const estados: Record<string, string> = { approved: "aprobado", rejected: "rechazado", refunded: "devuelto", charged_back: "devuelto" };
  if (pago.status === "approved" && !pago.date_approved) throw new Error("El pago aprobado no tiene fecha de acreditación.");
  const { error } = await cliente.rpc("registrar_pago_verificado", {
    p_mp_suscripcion: mpId,
    p_mp_pago: pagoId,
    p_estado: estados[pago.status] ?? "pendiente",
    p_monto: pago.transaction_amount,
    p_moneda: pago.currency_id,
    p_cobrado_en: pago.date_approved ?? pago.date_created ?? new Date().toISOString(),
  });
  if (error) throw error;
}
