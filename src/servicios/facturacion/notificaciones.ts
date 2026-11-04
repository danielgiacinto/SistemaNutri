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
export type FacturaMercadoPago = {
  id?: string | number;
  preapproval_id: string;
  debit_date?: string;
  payment?: { id?: string | number };
};

export async function sincronizarSuscripcion(cliente: ClienteSupabase, mpId: string, tiempoLimite?: number) {
  const ruta = `/preapproval/${encodeURIComponent(mpId)}`;
  const remota = await (tiempoLimite ? consultarRecursoMercadoPago(ruta, tiempoLimite) : consultarRecursoMercadoPago(ruta)) as SuscripcionMercadoPago | null;
  if (remota?.status === "canceled") remota.status = "cancelled";
  if (!remota || remota.id !== mpId || !["pending", "authorized", "paused", "cancelled"].includes(remota.status)) {
    throw new Error("Respuesta de suscripción inválida.");
  }
  const { data: local, error } = await cliente.from("suscripciones").select("id, consultorio_id, precio, moneda, cancelacion_solicitada_en").eq("mp_id", mpId).maybeSingle();
  if (error) throw error;
  if (!local) throw new Error("La suscripción todavía no está registrada.");
  if (remota.external_reference !== local.consultorio_id ||
      Number(remota.auto_recurring?.transaction_amount) !== Number(local.precio) ||
      remota.auto_recurring?.currency_id !== local.moneda) {
    throw new Error("La suscripción no coincide con el consultorio y su precio.");
  }
  const actualizado = remota.last_modified ? new Date(remota.last_modified) : null;
  if (actualizado && !Number.isFinite(actualizado.getTime())) throw new Error("Fecha de suscripción inválida.");
  let guardado = cliente.from("suscripciones").update({
    estado_mp: remota.status,
    proximo_cobro_en: remota.next_payment_date ?? null,
    ...(actualizado ? { mp_actualizado_en: actualizado.toISOString() } : {}),
    cancelada_en: remota.status === "cancelled" ? remota.last_modified ?? new Date().toISOString() : null,
  }).eq("id", local.id).eq("mp_id", mpId);
  // Dos verificaciones pueden terminar fuera de orden. Una autorización antigua
  // no debe sobrescribir una cancelación ni una versión más reciente del proveedor.
  if (actualizado) guardado = guardado.or(`mp_actualizado_en.is.null,mp_actualizado_en.lte.${actualizado.toISOString()}`);
  if (remota.status !== "cancelled") guardado = guardado.neq("estado_mp", "cancelled");
  const { error: errorGuardado } = await guardado;
  if (errorGuardado) throw errorGuardado;
  return { remota, local };
}

/** El cuerpo del webhook solo identifica el recurso; los importes vienen de la API autenticada. */
export async function procesarNotificacionMercadoPago(cliente: ClienteSupabase, tipo: string, recursoId: string) {
  if (tipo === "subscription_preapproval") {
    await sincronizarSuscripcion(cliente, recursoId);
    return;
  }

  let mpId: string | undefined;
  let factura: FacturaMercadoPago | undefined;
  let pagoId = recursoId;
  if (tipo === "subscription_authorized_payment") {
    factura = await consultarRecursoMercadoPago(`/authorized_payments/${encodeURIComponent(recursoId)}`) as FacturaMercadoPago | undefined;
    if (!factura || (factura.id != null && String(factura.id) !== recursoId)) throw new Error("No se pudo verificar la factura.");
    if (!factura.payment?.id) return; // Una factura programada aún puede no tener un intento de pago.
    mpId = factura.preapproval_id;
    pagoId = String(factura.payment.id);
  }

  const pago = await consultarRecursoMercadoPago(`/v1/payments/${encodeURIComponent(pagoId)}`) as PagoMercadoPago | null;
  if (!pago || String(pago.id) !== pagoId) throw new Error("No se pudo verificar el pago.");
  mpId ??= pago.preapproval_id ?? pago.metadata?.preapproval_id;
  if (!factura) {
    // Payments no siempre informa preapproval_id; la factura vincula ambos recursos.
    const facturas = await consultarRecursoMercadoPago(`/authorized_payments/search?payment_id=${encodeURIComponent(pagoId)}`) as { results?: FacturaMercadoPago[] } | null;
    factura = facturas?.results?.find((item) => String(item.payment?.id) === pagoId);
    if (factura && mpId && factura.preapproval_id !== mpId) throw new Error("La factura no corresponde a la suscripción.");
    mpId ??= factura?.preapproval_id;
  }
  if (!mpId) return; // Pago del vendedor ajeno a las suscripciones de esta aplicación.
  if (pago.status === "approved" && !factura) throw new Error("La factura del pago todavía no está disponible.");
  await sincronizarSuscripcion(cliente, mpId);
  await registrarPagoConsultado(cliente, mpId, pago, factura?.debit_date);
}

/** Solo recibe pagos obtenidos por la API autenticada (webhook o conciliación). */
async function registrarPagoConsultado(cliente: ClienteSupabase, mpId: string, pago: PagoMercadoPago, fechaCiclo?: string) {
  const estados: Record<string, string> = { approved: "aprobado", rejected: "rechazado", refunded: "devuelto", charged_back: "devuelto" };
  if (fechaCiclo && !Number.isFinite(new Date(fechaCiclo).getTime())) throw new Error("Fecha del ciclo inválida.");
  if (pago.status === "approved" && !pago.date_approved) throw new Error("El pago aprobado no tiene fecha de acreditación.");
  const { error } = await cliente.rpc("registrar_pago_verificado", {
    p_mp_suscripcion: mpId,
    p_mp_pago: String(pago.id),
    p_estado: estados[pago.status] ?? "pendiente",
    p_monto: pago.transaction_amount,
    p_moneda: pago.currency_id,
    p_cobrado_en: pago.date_approved ?? pago.date_created ?? new Date().toISOString(),
    ...(fechaCiclo ? { p_inicio_periodo: new Date(fechaCiclo).toISOString() } : {}),
  });
  if (error) throw error;
}

export async function registrarPagoDeFactura(cliente: ClienteSupabase, factura: FacturaMercadoPago, mpId: string) {
  if (factura.preapproval_id !== mpId) throw new Error("Factura de otra suscripción.");
  if (!factura.payment?.id) return;
  const pago = await consultarRecursoMercadoPago(`/v1/payments/${encodeURIComponent(String(factura.payment.id))}`, 5_000) as PagoMercadoPago | null;
  if (!pago || String(pago.id) !== String(factura.payment.id) ||
    (pago.preapproval_id && pago.preapproval_id !== mpId) ||
    (pago.metadata?.preapproval_id && pago.metadata.preapproval_id !== mpId)) throw new Error("El pago no corresponde a la factura.");
  await registrarPagoConsultado(cliente, mpId, pago, factura.debit_date);
}
