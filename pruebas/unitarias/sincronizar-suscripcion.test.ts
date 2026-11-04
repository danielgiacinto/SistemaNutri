import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarMiSuscripcion, actualizarSuscripcionProfesional } from "@/acciones/sincronizar-suscripcion";
import { requerirProfesionalParaFacturacion, requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { procesarNotificacionMercadoPago } from "@/servicios/facturacion/notificaciones";
import { credencialesMercadoPago } from "@/servicios/facturacion/mercadopago";
import { refresh } from "next/cache";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/autorizacion/sesion", () => ({ requerirProfesionalParaFacturacion: vi.fn(), requerirSuperadmin: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: vi.fn() }));
vi.mock("@/lib/supabase/servicio", () => ({ crearClienteServicio: vi.fn() }));
vi.mock("@/servicios/facturacion/notificaciones", () => ({ procesarNotificacionMercadoPago: vi.fn() }));
vi.mock("@/servicios/facturacion/mercadopago", () => ({ credencialesMercadoPago: vi.fn() }));
vi.mock("@/lib/errores", () => ({ registrarError: vi.fn() }));

const consultorioId = "c606abcc-47b4-4c93-96fa-25b665480133";
const servicio = {};
const consulta = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requerirProfesionalParaFacturacion).mockResolvedValue({ consultorio: { id: consultorioId, rol: "titular" } } as never);
  vi.mocked(requerirSuperadmin).mockResolvedValue({ esSuperadmin: true } as never);
  vi.mocked(crearClienteServidor).mockResolvedValue({ from: vi.fn(() => consulta) } as never);
  vi.mocked(crearClienteServicio).mockReturnValue(servicio as never);
  vi.mocked(credencialesMercadoPago).mockReturnValue({ token: "prueba" });
  vi.mocked(procesarNotificacionMercadoPago).mockResolvedValue(undefined);
  consulta.maybeSingle.mockResolvedValue({ data: { mp_id: "pre-verificado" }, error: null });
});

describe("sincronización explícita de autorización", () => {
  it("toma el consultorio de la sesión y reutiliza la verificación del webhook sin procesar un pago", async () => {
    expect((await actualizarMiSuscripcion()).ok).toBe(true);
    expect(consulta.eq).toHaveBeenCalledWith("consultorio_id", consultorioId);
    expect(procesarNotificacionMercadoPago).toHaveBeenCalledExactlyOnceWith(servicio, "subscription_preapproval", "pre-verificado");
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("no permite que un colaborador obtenga el cliente privilegiado", async () => {
    vi.mocked(requerirProfesionalParaFacturacion).mockResolvedValue({ consultorio: { id: consultorioId, rol: "profesional" } } as never);
    expect((await actualizarMiSuscripcion()).ok).toBe(false);
    expect(crearClienteServidor).not.toHaveBeenCalled();
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it("exige superadministrador antes de consultar un consultorio indicado", async () => {
    vi.mocked(requerirSuperadmin).mockRejectedValue(new Error("acceso_denegado"));
    await expect(actualizarSuscripcionProfesional(consultorioId)).rejects.toThrow("acceso_denegado");
    expect(crearClienteServidor).not.toHaveBeenCalled();
    expect(procesarNotificacionMercadoPago).not.toHaveBeenCalled();
  });
  it("valida el identificador administrativo y permite sincronizar uno válido", async () => {
    expect((await actualizarSuscripcionProfesional("invalido")).ok).toBe(false);
    expect(crearClienteServicio).not.toHaveBeenCalled();
    expect((await actualizarSuscripcionProfesional(consultorioId)).ok).toBe(true);
    expect(requerirSuperadmin).toHaveBeenCalledTimes(2);
  });
  it("no accede al proveedor sin una suscripción visible mediante RLS", async () => {
    consulta.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await actualizarMiSuscripcion()).ok).toBe(false);
    expect(crearClienteServicio).not.toHaveBeenCalled();
    expect(procesarNotificacionMercadoPago).not.toHaveBeenCalled();
  });
  it("no anuncia éxito cuando faltan credenciales de servidor", async () => {
    vi.mocked(crearClienteServicio).mockReturnValue(null);
    expect((await actualizarMiSuscripcion()).ok).toBe(false);
    expect(procesarNotificacionMercadoPago).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("mantiene el estado anterior y permite reintentar si falla la verificación", async () => {
    vi.mocked(procesarNotificacionMercadoPago).mockRejectedValue(new Error("proveedor_no_disponible"));
    const resultado = await actualizarMiSuscripcion();
    expect(resultado).toEqual({ ok: false, mensaje: expect.stringContaining("Conservamos") });
    expect(refresh).not.toHaveBeenCalled();
  });
});
