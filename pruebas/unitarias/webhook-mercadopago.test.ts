import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/facturacion/mercadopago/route";
import { createClient } from "@supabase/supabase-js";
import { procesarNotificacionMercadoPago } from "@/servicios/facturacion/notificaciones";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/servicios/facturacion/notificaciones", () => ({ procesarNotificacionMercadoPago: vi.fn() }));
vi.mock("@/servicios/facturacion/firma", () => ({ verificarFirmaMercadoPago: () => true }));
vi.mock("@/servicios/facturacion/mercadopago", () => ({ credencialesMercadoPago: () => ({ token: "prueba" }) }));
vi.mock("@/configuracion/entorno", () => ({ obtenerEntornoPublico: () => ({ supabaseUrl: "https://base.demo.test" }) }));
vi.mock("@/lib/errores", () => ({ registrarError: vi.fn() }));

const cadena = {
  insert: vi.fn(), update: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(),
  then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ error: null }).then(resolver),
};
function peticion(id = "123") {
  return new NextRequest("https://nutrisfera.com.ar/api/facturacion/mercadopago?data.id=123", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "evento-1", type: "payment", data: { id } }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRETO", "secreto-prueba");
  vi.stubEnv("SUPABASE_SECRET_KEY", "clave-prueba");
  vi.mocked(createClient).mockReturnValue({ from: () => cadena } as never);
  vi.mocked(procesarNotificacionMercadoPago).mockResolvedValue(undefined);
  cadena.insert.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("entrega del webhook", () => {
  it("rechaza un id de cuerpo diferente del id firmado", async () => {
    expect((await POST(peticion("otro"))).status).toBe(400);
    expect(procesarNotificacionMercadoPago).not.toHaveBeenCalled();
  });
  it("devuelve 500 cuando falla la verificación del recurso para permitir reintentos", async () => {
    vi.mocked(procesarNotificacionMercadoPago).mockRejectedValue(new Error("proveedor no disponible"));
    expect((await POST(peticion())).status).toBe(500);
  });
  it("vuelve a procesar un evento duplicado que había fallado", async () => {
    cadena.insert.mockResolvedValue({ error: { code: "23505" } });
    cadena.single.mockResolvedValue({ data: { procesado_en: null }, error: null });
    expect((await POST(peticion())).status).toBe(200);
    expect(procesarNotificacionMercadoPago).toHaveBeenCalledOnce();
    expect(cadena.update).toHaveBeenCalledWith(expect.objectContaining({ error: null }));
  });
  it("no vuelve a acreditar un evento ya procesado", async () => {
    cadena.insert.mockResolvedValue({ error: { code: "23505" } });
    cadena.single.mockResolvedValue({ data: { procesado_en: "2026-11-03T12:00:00Z" }, error: null });
    expect((await POST(peticion())).status).toBe(200);
    expect(procesarNotificacionMercadoPago).not.toHaveBeenCalled();
  });
});
