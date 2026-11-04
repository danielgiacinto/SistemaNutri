import { beforeEach, describe, expect, it, vi } from "vitest";
import { conciliarSuscripcion } from "@/servicios/facturacion/conciliacion";
import { consultarRecursoMercadoPago, cancelarAutorizacionMercadoPago } from "@/servicios/facturacion/mercadopago";
import type { ClienteSupabase } from "@/lib/supabase/servidor";

vi.mock("@/servicios/facturacion/mercadopago", () => ({ consultarRecursoMercadoPago: vi.fn(), cancelarAutorizacionMercadoPago: vi.fn() }));
const cadena = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(),
  then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ error: null }).then(resolver) };
const rpc = vi.fn();
const cliente = { from: vi.fn(() => cadena), rpc } as unknown as ClienteSupabase;
const remota = { id: "mp-1", status: "authorized", external_reference: "consultorio-1", last_modified: "2026-11-04T12:00:00Z", auto_recurring: { transaction_amount: 10000, currency_id: "ARS" } };
const factura = { id: 1, preapproval_id: "mp-1", debit_date: "2026-11-01T12:00:00Z", payment: { id: 20, status: "approved" } };
const pago = { id: 20, status: "approved", transaction_amount: 10000, currency_id: "ARS", date_approved: "2026-11-02T12:00:00Z" };
let pagina: { results: typeof factura[]; paging: { offset: number; limit: number; total: number } };
beforeEach(() => {
  vi.clearAllMocks();
  cadena.maybeSingle.mockResolvedValue({ data: { id: "local-1", consultorio_id: "consultorio-1", precio: 10000, moneda: "ARS", cancelacion_solicitada_en: null }, error: null });
  rpc.mockResolvedValue({ error: null });
  pagina = { results: [factura], paging: { offset: 0, limit: 10, total: 1 } };
  vi.mocked(consultarRecursoMercadoPago).mockImplementation(async (ruta) => ruta.startsWith("/preapproval/") ? { ...remota } : ruta.startsWith("/authorized_payments/search") ? pagina : pago);
});
describe("reconciliación con el proveedor", () => {
  it("recupera un pago perdido, conserva su ciclo y no usa la fecha de recepción como cobertura", async () => {
    expect(await conciliarSuscripcion(cliente, "mp-1")).toEqual({ pagosRevisados: 1, hayMas: false });
    expect(rpc).toHaveBeenCalledWith("registrar_pago_verificado", expect.objectContaining({ p_mp_pago: "20", p_estado: "aprobado", p_inicio_periodo: "2026-11-01T12:00:00.000Z", p_cobrado_en: pago.date_approved }));
    expect(cadena.update).toHaveBeenCalledWith(expect.objectContaining({ conciliacion_cursor: 0, conciliacion_error: null }));
  });
  it("consulta el estado actual del pago y no acredita un aprobado embebido desactualizado", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockImplementation(async (ruta) => ruta.startsWith("/preapproval/") ? { ...remota } : ruta.startsWith("/authorized_payments/search") ? pagina : { ...pago, status: "rejected" });
    await conciliarSuscripcion(cliente, "mp-1");
    expect(rpc).toHaveBeenCalledWith("registrar_pago_verificado", expect.objectContaining({ p_estado: "rechazado" }));
  });
  it("guarda el cursor de historiales largos para continuar sin omitir páginas", async () => {
    pagina = { results: Array.from({ length: 10 }, () => factura), paging: { offset: 0, limit: 10, total: 12 } };
    expect((await conciliarSuscripcion(cliente, "mp-1")).hayMas).toBe(true);
    expect(cadena.update).toHaveBeenCalledWith(expect.objectContaining({ conciliacion_cursor: 10 }));
  });
  it("rechaza facturas de otra suscripción antes de acreditar", async () => {
    pagina.results = [{ ...factura, preapproval_id: "ajena" }];
    await expect(conciliarSuscripcion(cliente, "mp-1")).rejects.toThrow("otra suscripción");
    expect(rpc).not.toHaveBeenCalled();
    expect(cadena.update).toHaveBeenCalledWith({ conciliacion_error: "verificacion_pendiente" });
  });
  it("una caída del proveedor no cancela ni modifica cobertura", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockRejectedValue(new Error("red"));
    await expect(conciliarSuscripcion(cliente, "mp-1")).rejects.toThrow("red");
    expect(cadena.update).toHaveBeenCalledExactlyOnceWith({ conciliacion_error: "verificacion_pendiente" });
    expect(rpc).not.toHaveBeenCalled();
    expect(cancelarAutorizacionMercadoPago).not.toHaveBeenCalled();
  });
  it("recupera una cancelación solicitada tras un fallo y confirma el recurso nuevamente", async () => {
    cadena.maybeSingle.mockResolvedValue({ data: { id: "local-1", consultorio_id: "consultorio-1", precio: 10000, moneda: "ARS", cancelacion_solicitada_en: "2026-11-04T11:00:00Z" }, error: null });
    let lecturas = 0;
    vi.mocked(consultarRecursoMercadoPago).mockImplementation(async (ruta) => ruta.startsWith("/preapproval/") ? { ...remota, status: lecturas++ === 0 ? "authorized" : "cancelled" } : { results: [], paging: { offset: 0, total: 0, limit: 10 } });
    await conciliarSuscripcion(cliente, "mp-1");
    expect(cancelarAutorizacionMercadoPago).toHaveBeenCalledExactlyOnceWith("mp-1");
    expect(cadena.update).toHaveBeenCalledWith(expect.objectContaining({ estado_mp: "cancelled" }));
    expect(rpc).not.toHaveBeenCalled();
  });
});
