import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/facturacion/conciliar/route";
import { conciliarLote } from "@/servicios/facturacion/conciliacion";
import { crearClienteServicio } from "@/lib/supabase/servicio";
vi.mock("@/servicios/facturacion/conciliacion", () => ({ conciliarLote: vi.fn() }));
vi.mock("@/lib/supabase/servicio", () => ({ crearClienteServicio: vi.fn() }));
vi.mock("@/servicios/facturacion/mercadopago", () => ({ credencialesMercadoPago: () => ({ token: "prueba" }) }));
vi.mock("@/lib/errores", () => ({ registrarError: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("CRON_SECRET", "secreto-prueba"); vi.mocked(crearClienteServicio).mockReturnValue({} as never); vi.mocked(conciliarLote).mockResolvedValue({ revisadas: 1, fallidas: 0, conMasPaginas: 0 }); });
afterEach(() => vi.unstubAllEnvs());
function solicitud(autorizacion?: string) { return new NextRequest("https://ejemplo.test/api/facturacion/conciliar", { headers: autorizacion ? { authorization: autorizacion } : {} }); }
describe("cron de facturación", () => {
  it("rechaza secretos ausentes o incorrectos sin leer la base", async () => {
    expect((await GET(solicitud())).status).toBe(401);
    expect((await GET(solicitud("Bearer incorrecto"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(solicitud("Bearer "))).status).toBe(401);
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it("ejecuta el lote solamente con el secreto correcto", async () => {
    const respuesta = await GET(solicitud("Bearer secreto-prueba"));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ revisadas: 1, fallidas: 0, conMasPaginas: 0 });
  });
  it("informa fallos para poder revisarlos sin anunciar conciliación completa", async () => {
    vi.mocked(conciliarLote).mockResolvedValue({ revisadas: 1, fallidas: 1, conMasPaginas: 0 });
    expect((await GET(solicitud("Bearer secreto-prueba"))).status).toBe(503);
  });
});
