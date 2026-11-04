import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelarMiSuscripcion } from "@/acciones/cancelar-suscripcion";
import { requerirProfesionalParaFacturacion } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { sincronizarSuscripcion } from "@/servicios/facturacion/notificaciones";
import { cancelarAutorizacionMercadoPago } from "@/servicios/facturacion/mercadopago";
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/autorizacion/sesion", () => ({ requerirProfesionalParaFacturacion: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: vi.fn() }));
vi.mock("@/lib/supabase/servicio", () => ({ crearClienteServicio: vi.fn() }));
vi.mock("@/servicios/facturacion/notificaciones", () => ({ sincronizarSuscripcion: vi.fn() }));
vi.mock("@/servicios/facturacion/mercadopago", () => ({ cancelarAutorizacionMercadoPago: vi.fn(), credencialesMercadoPago: () => ({ token: "prueba" }) }));
vi.mock("@/lib/errores", () => ({ registrarError: vi.fn() }));
const rpc = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requerirProfesionalParaFacturacion).mockResolvedValue({ consultorio: { id: "propio", rol: "titular" } } as never);
  vi.mocked(crearClienteServidor).mockResolvedValue({ rpc } as never);
  vi.mocked(crearClienteServicio).mockReturnValue({} as never);
  rpc.mockResolvedValue({ data: "mp-propio", error: null });
  vi.mocked(sincronizarSuscripcion).mockResolvedValue({ local: { consultorio_id: "propio" }, remota: { status: "cancelled" } } as never);
});
function formulario() { const datos = new FormData(); datos.set("confirmacion", "si"); datos.set("motivo", "No quiero renovar"); datos.set("mp_id", "intento-ajeno"); return datos; }
describe("cancelación solicitada por el titular", () => {
  it("toma la suscripción de la función autenticada e ignora identificadores del formulario", async () => {
    expect((await cancelarMiSuscripcion(formulario())).ok).toBe(true);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("solicitar_cancelacion_suscripcion", { p_motivo: "No quiero renovar" });
    expect(sincronizarSuscripcion).toHaveBeenCalledWith(expect.anything(), "mp-propio");
    expect(cancelarAutorizacionMercadoPago).not.toHaveBeenCalled();
  });
  it("no permite cancelar sin confirmación ni desde un colaborador", async () => {
    const datos = formulario(); datos.delete("confirmacion");
    expect((await cancelarMiSuscripcion(datos)).ok).toBe(false);
    vi.mocked(requerirProfesionalParaFacturacion).mockResolvedValue({ consultorio: { id: "propio", rol: "profesional" } } as never);
    expect((await cancelarMiSuscripcion(formulario())).ok).toBe(false);
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it("verifica de nuevo al proveedor después de solicitar el cese de débitos", async () => {
    vi.mocked(sincronizarSuscripcion).mockResolvedValueOnce({ local: { consultorio_id: "propio" }, remota: { status: "authorized" } } as never);
    expect((await cancelarMiSuscripcion(formulario())).ok).toBe(true);
    expect(cancelarAutorizacionMercadoPago).toHaveBeenCalledExactlyOnceWith("mp-propio");
    expect(sincronizarSuscripcion).toHaveBeenCalledTimes(2);
  });
  it("una caída posterior a registrar la solicitud no anuncia cancelación confirmada", async () => {
    vi.mocked(sincronizarSuscripcion).mockRejectedValue(new Error("red"));
    const resultado = await cancelarMiSuscripcion(formulario());
    expect(resultado).toEqual({ ok: false, mensaje: expect.stringContaining("solicitud quedó registrada") });
    expect(cancelarAutorizacionMercadoPago).not.toHaveBeenCalled();
  });
  it("una referencia ajena nunca se manda a cancelar", async () => {
    vi.mocked(sincronizarSuscripcion).mockResolvedValue({ local: { consultorio_id: "ajeno" }, remota: { status: "authorized" } } as never);
    expect((await cancelarMiSuscripcion(formulario())).ok).toBe(false);
    expect(cancelarAutorizacionMercadoPago).not.toHaveBeenCalled();
  });
});
