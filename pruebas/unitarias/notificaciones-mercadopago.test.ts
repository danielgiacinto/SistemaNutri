import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { consultarRecursoMercadoPago } from "@/servicios/facturacion/mercadopago";
import { procesarNotificacionMercadoPago } from "@/servicios/facturacion/notificaciones";

vi.mock("@/servicios/facturacion/mercadopago", () => ({ consultarRecursoMercadoPago: vi.fn() }));

const remota = { id: "pre-1", status: "authorized", external_reference: "consultorio-1", auto_recurring: { transaction_amount: 15999, currency_id: "ARS" } };
const pago = { id: 123, status: "approved", transaction_amount: 15999, currency_id: "ARS", date_approved: "2026-11-03T12:00:00Z" };
const cadena = {
  select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(), then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ error: null }).then(resolver),
};
const rpc = vi.fn();
const cliente = { from: vi.fn(() => cadena), rpc } as unknown as ClienteSupabase;

beforeEach(() => {
  vi.clearAllMocks();
  cadena.maybeSingle.mockResolvedValue({ data: { id: "local-1", consultorio_id: "consultorio-1", precio: 15999, moneda: "ARS" }, error: null });
  rpc.mockResolvedValue({ error: null });
});

describe("notificaciones verificadas", () => {
  it("confirma la autorización sin acreditar un mes pago", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue(remota);
    await procesarNotificacionMercadoPago(cliente, "subscription_preapproval", "pre-1");
    expect(cadena.update).toHaveBeenCalledWith(expect.objectContaining({ estado_mp: "authorized" }));
    expect(rpc).not.toHaveBeenCalled();
  });
  it("lee el pago dentro de la factura y usa su id para evitar duplicarlo con el evento payment", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValueOnce({ preapproval_id: "pre-1", payment: { id: 123 } }).mockResolvedValueOnce(pago).mockResolvedValueOnce(remota);
    await procesarNotificacionMercadoPago(cliente, "subscription_authorized_payment", "factura-1");
    expect(consultarRecursoMercadoPago).toHaveBeenNthCalledWith(2, "/v1/payments/123");
    expect(rpc).toHaveBeenCalledWith("registrar_pago_verificado", { p_mp_suscripcion: "pre-1", p_mp_pago: "123", p_estado: "aprobado", p_monto: 15999, p_moneda: "ARS", p_cobrado_en: pago.date_approved });
  });
  it("busca la factura si el evento payment no trae preapproval_id", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValueOnce(pago).mockResolvedValueOnce({ results: [{ preapproval_id: "pre-1", payment: { id: 123 } }] }).mockResolvedValueOnce(remota);
    await procesarNotificacionMercadoPago(cliente, "payment", "123");
    expect(rpc).toHaveBeenCalledWith("registrar_pago_verificado", expect.objectContaining({ p_mp_suscripcion: "pre-1", p_mp_pago: "123" }));
  });
  it("rechaza una suscripción cuya referencia no corresponde al consultorio", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue({ ...remota, external_reference: "otro-consultorio" });
    await expect(procesarNotificacionMercadoPago(cliente, "subscription_preapproval", "pre-1")).rejects.toThrow("no coincide");
    expect(cadena.update).not.toHaveBeenCalled();
  });
  it("propaga el fallo de base para que el webhook se reintente", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValueOnce({ ...pago, preapproval_id: "pre-1" }).mockResolvedValueOnce(remota);
    rpc.mockResolvedValue({ error: new Error("base no disponible") });
    await expect(procesarNotificacionMercadoPago(cliente, "payment", "123")).rejects.toThrow("base no disponible");
  });
  it("condiciona la escritura para no sustituir una versión más reciente ni revivir una cancelación", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue({ ...remota, last_modified: "2026-11-04T12:00:00Z" });
    await procesarNotificacionMercadoPago(cliente, "subscription_preapproval", "pre-1");
    expect(cadena.or).toHaveBeenCalledWith("mp_actualizado_en.is.null,mp_actualizado_en.lte.2026-11-04T12:00:00.000Z");
    expect(cadena.neq).toHaveBeenCalledWith("estado_mp", "cancelled");
  });
  it("permite guardar una cancelación verificada sin cambiar pagos ni cobertura", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue({ ...remota, status: "cancelled", last_modified: "2026-11-04T12:00:00Z" });
    await procesarNotificacionMercadoPago(cliente, "subscription_preapproval", "pre-1");
    expect(cadena.update).toHaveBeenCalledWith(expect.objectContaining({ estado_mp: "cancelled", cancelada_en: "2026-11-04T12:00:00Z" }));
    expect(cadena.neq).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rechaza fechas de versión inválidas antes de escribir", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue({ ...remota, last_modified: "fecha-invalida" });
    await expect(procesarNotificacionMercadoPago(cliente, "subscription_preapproval", "pre-1")).rejects.toThrow("Fecha");
    expect(cadena.update).not.toHaveBeenCalled();
  });
});
