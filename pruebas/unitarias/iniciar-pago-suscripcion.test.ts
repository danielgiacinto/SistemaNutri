import { beforeEach, describe, expect, it, vi } from "vitest";
import { iniciarPagoSuscripcion } from "@/acciones/facturacion";
import { requerirProfesionalParaFacturacion } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { consultarRecursoMercadoPago, crearPagoSuscripcion, esCambioDeVendedorDePrueba, obtenerConfiguracionComercial } from "@/servicios/facturacion/mercadopago";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/autorizacion/sesion", () => ({ requerirProfesionalParaFacturacion: vi.fn(), requerirSuperadmin: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: vi.fn() }));
vi.mock("@/lib/errores", () => ({ registrarError: vi.fn() }));
vi.mock("@/servicios/facturacion/mercadopago", async (original) => ({
  ...await original<typeof import("@/servicios/facturacion/mercadopago")>(),
  consultarRecursoMercadoPago: vi.fn(), crearPagoSuscripcion: vi.fn(), esCambioDeVendedorDePrueba: vi.fn(), obtenerConfiguracionComercial: vi.fn(),
}));

const url = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-1";
function consulta(datos: unknown, error: unknown = null) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: datos, error }), single: vi.fn().mockResolvedValue({ data: datos, error }) };
}
let prueba: ReturnType<typeof consulta>;
let suscripcion: ReturnType<typeof consulta>;
let escritura: ReturnType<typeof consulta>;
const desde = vi.fn();
const contexto = { correo: "titular@demo.test", consultorio: { id: "consultorio-sesion", rol: "titular" } };

beforeEach(() => {
  vi.clearAllMocks();
  prueba = consulta({ vence_en: "2099-01-01T00:00:00.000Z" });
  suscripcion = consulta(null);
  escritura = consulta({ id: "local-1" });
  let lecturas = 0;
  desde.mockImplementation((tabla: string) => tabla === "pruebas_profesionales" ? prueba : lecturas++ === 0 ? suscripcion : escritura);
  vi.mocked(crearClienteServidor).mockResolvedValue({ from: desde } as never);
  vi.mocked(requerirProfesionalParaFacturacion).mockResolvedValue(contexto as never);
  vi.mocked(obtenerConfiguracionComercial).mockResolvedValue({ precioMensual: 15999 } as never);
  vi.mocked(crearPagoSuscripcion).mockResolvedValue({ id: "pre-1", url });
  vi.mocked(esCambioDeVendedorDePrueba).mockResolvedValue(false);
});

describe("elección del plan", () => {
  it("usa el consultorio y el precio del servidor y guarda el pendiente antes de entregar el enlace", async () => {
    expect(await iniciarPagoSuscripcion()).toEqual({ ok: true, datos: { url } });
    expect(crearPagoSuscripcion).toHaveBeenCalledWith({ consultorioId: "consultorio-sesion", correo: contexto.correo, precio: 15999, inicioCobro: new Date("2099-01-01T00:00:00.000Z") });
    expect(escritura.insert).toHaveBeenCalledWith({ consultorio_id: "consultorio-sesion", mp_id: "pre-1", estado_mp: "pending", precio: 15999, moneda: "ARS" });
  });
  it("permite regularizar una cuenta vencida y cobra al terminar la cobertura restante", async () => {
    prueba.maybeSingle.mockResolvedValue({ data: { vence_en: "2020-01-01" }, error: null });
    suscripcion.maybeSingle.mockResolvedValue({ data: { id: "local-1", mp_id: null, cobertura_hasta: "2099-02-01T00:00:00.000Z" }, error: null });
    expect((await iniciarPagoSuscripcion()).ok).toBe(true);
    expect(crearPagoSuscripcion).toHaveBeenCalledWith(expect.objectContaining({ inicioCobro: new Date("2099-02-01T00:00:00.000Z") }));
  });
  it("impide que un colaborador inicie el pago", async () => {
    vi.mocked(requerirProfesionalParaFacturacion).mockResolvedValue({ ...contexto, consultorio: { ...contexto.consultorio, rol: "profesional" } } as never);
    expect((await iniciarPagoSuscripcion()).ok).toBe(false);
    expect(crearPagoSuscripcion).not.toHaveBeenCalled();
    expect(crearClienteServidor).not.toHaveBeenCalled();
  });
  it("retoma el checkout pendiente sin crear otra suscripción", async () => {
    suscripcion.maybeSingle.mockResolvedValue({ data: { id: "local-1", mp_id: "pre-1", precio: 15999 }, error: null });
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue({ id: "pre-1", external_reference: contexto.consultorio.id, status: "pending", init_point: url, auto_recurring: { transaction_amount: 15999, currency_id: "ARS" } });
    expect(await iniciarPagoSuscripcion()).toEqual({ ok: true, datos: { url } });
    expect(crearPagoSuscripcion).not.toHaveBeenCalled();
    expect(escritura.update).not.toHaveBeenCalled();
  });
  it("no crea otra suscripción si Mercado Pago ya autorizó la existente", async () => {
    suscripcion.maybeSingle.mockResolvedValue({ data: { id: "local-1", mp_id: "pre-1" }, error: null });
    vi.mocked(consultarRecursoMercadoPago).mockResolvedValue({ external_reference: contexto.consultorio.id, status: "authorized" });
    expect((await iniciarPagoSuscripcion()).ok).toBe(false);
    expect(crearPagoSuscripcion).not.toHaveBeenCalled();
  });
  it("no entrega un enlace si falla el guardado local", async () => {
    escritura.single.mockResolvedValue({ data: null, error: { code: "23505" } });
    const resultado = await iniciarPagoSuscripcion();
    expect(resultado.ok).toBe(false);
    expect(resultado).not.toHaveProperty("datos");
  });
  it("reemplaza el pendiente del vendedor anterior después de verificar el entorno de prueba", async () => {
    suscripcion.maybeSingle.mockResolvedValue({ data: { id: "local-1", mp_id: "pre-anterior", precio: 15999, estado_mp: "pending", cobertura_hasta: null }, error: null });
    vi.mocked(consultarRecursoMercadoPago).mockRejectedValue(new Error("recurso de otro vendedor"));
    vi.mocked(esCambioDeVendedorDePrueba).mockResolvedValue(true);
    expect(await iniciarPagoSuscripcion()).toEqual({ ok: true, datos: { url } });
    expect(escritura.update).toHaveBeenCalledWith({ mp_id: "pre-1", estado_mp: "pending" });
    expect(escritura.eq).toHaveBeenCalledWith("mp_id", "pre-anterior");
  });
  it("no reemplaza una autorización existente ni una suscripción con cobertura", async () => {
    vi.mocked(consultarRecursoMercadoPago).mockRejectedValue(new Error("recurso inaccesible"));
    vi.mocked(esCambioDeVendedorDePrueba).mockResolvedValue(true);
    for (const datos of [{ estado_mp: "authorized", cobertura_hasta: null }, { estado_mp: "pending", cobertura_hasta: "2099-01-01" }]) {
      suscripcion.maybeSingle.mockResolvedValue({ data: { id: "local-1", mp_id: "pre-anterior", ...datos }, error: null });
      // Cada ejecución vuelve a hacer la consulta inicial de la suscripción.
      desde.mockImplementation((tabla: string) => tabla === "pruebas_profesionales" ? prueba : suscripcion);
      expect((await iniciarPagoSuscripcion()).ok).toBe(false);
    }
    expect(crearPagoSuscripcion).not.toHaveBeenCalled();
  });
});
