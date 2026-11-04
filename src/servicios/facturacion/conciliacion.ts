import "server-only";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { cancelarAutorizacionMercadoPago, consultarRecursoMercadoPago } from "./mercadopago";
import { registrarPagoDeFactura, sincronizarSuscripcion, type FacturaMercadoPago } from "./notificaciones";

const TAMANO_PAGINA = 10;
type PaginaFacturas = { results: FacturaMercadoPago[]; paging: { offset: number; limit: number; total: number } };

/** Una página por ejecución: el cursor persistido permite completar historiales largos. */
export async function conciliarSuscripcion(cliente: ClienteSupabase, mpId: string, cursor = 0, intento?: string) {
  try {
    let { remota, local } = await sincronizarSuscripcion(cliente, mpId, 5_000);
    if (local.cancelacion_solicitada_en && remota.status !== "cancelled") {
      await cancelarAutorizacionMercadoPago(mpId);
      ({ remota, local } = await sincronizarSuscripcion(cliente, mpId, 5_000));
      if (remota.status !== "cancelled") throw new Error("Cancelación pendiente de confirmación.");
    }
    const pagina = await consultarRecursoMercadoPago(
      `/authorized_payments/search?preapproval_id=${encodeURIComponent(mpId)}&offset=${cursor}&limit=${TAMANO_PAGINA}`, 5_000,
    ) as PaginaFacturas | null;
    if (!pagina || !Array.isArray(pagina.results) || !pagina.paging || pagina.paging.offset !== cursor ||
      !Number.isInteger(pagina.paging.total) || pagina.paging.total < 0 || pagina.results.length > TAMANO_PAGINA) {
      throw new Error("La página de facturas no es válida.");
    }
    // Cada factura valida pertenencia. No se confía en el estado embebido del pago.
    for (const factura of pagina.results) await registrarPagoDeFactura(cliente, factura, mpId);
    const siguiente = cursor + pagina.results.length < pagina.paging.total ? cursor + pagina.results.length : 0;
    if (!pagina.results.length && cursor < pagina.paging.total) throw new Error("La conciliación no avanzó.");
    let guardado = cliente.from("suscripciones").update({
      conciliada_en: new Date().toISOString(), conciliacion_error: null, conciliacion_cursor: siguiente,
    }).eq("id", local.id).eq("mp_id", mpId);
    if (intento) guardado = guardado.eq("conciliacion_intento_en", intento);
    const { error } = await guardado;
    if (error) throw error;
    return { pagosRevisados: pagina.results.filter((factura) => factura.payment?.id).length, hayMas: siguiente > 0 };
  } catch (error) {
    // Una caída técnica no cancela la cuenta ni sobrescribe cobertura o cobros.
    let consulta = cliente.from("suscripciones").update({ conciliacion_error: "verificacion_pendiente" }).eq("mp_id", mpId);
    if (intento) consulta = consulta.eq("conciliacion_intento_en", intento);
    await consulta;
    throw error;
  }
}

/** Lote acotado, con dos verificaciones simultáneas y reserva recuperable por fila. */
export async function conciliarLote(cliente: ClienteSupabase) {
  const { data, error } = await cliente.rpc("reclamar_conciliaciones", { p_limite: 5 });
  if (error) throw error;
  const pendientes = [...(data ?? [])];
  const resumen = { revisadas: 0, fallidas: 0, conMasPaginas: 0 };
  async function trabajar() {
    while (pendientes.length) {
      const fila = pendientes.shift()!;
      try {
        const resultado = await conciliarSuscripcion(cliente, fila.mp_id, fila.conciliacion_cursor, fila.conciliacion_intento_en);
        resumen.revisadas++;
        if (resultado.hayMas) resumen.conMasPaginas++;
      } catch {
        resumen.fallidas++;
      }
    }
  }
  await Promise.all([trabajar(), trabajar()]);
  return resumen;
}
