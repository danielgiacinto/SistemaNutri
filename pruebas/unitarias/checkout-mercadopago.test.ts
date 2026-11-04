import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearPagoSuscripcion, ErrorConsultaMercadoPago, esCambioDeVendedorDePrueba, urlPagoMercadoPago } from "@/servicios/facturacion/mercadopago";

vi.mock("@/configuracion/entorno", () => ({ obtenerEntornoPublico: () => ({ sitioUrl: "https://nutrisfera.com.ar" }) }));

const url = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-1";
const entrada = { consultorioId: "consultorio-1", correo: "titular@demo.test", precio: 15999 };
const solicitud = vi.fn();

beforeEach(() => {
  vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "token-de-prueba");
  vi.stubEnv("MERCADOPAGO_CORREO_PAGADOR_PRUEBA", "");
  vi.stubGlobal("fetch", solicitud);
  vi.spyOn(console, "error").mockImplementation(() => {});
  solicitud.mockResolvedValue(Response.json({ id: "pre-1", init_point: url }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); solicitud.mockReset(); });

describe("checkout de suscripción", () => {
  it("crea un enlace pendiente, sin recibir datos de tarjeta ni exigir clave pública", async () => {
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");
    const resultado = await crearPagoSuscripcion(entrada);
    expect(resultado).toEqual({ id: "pre-1", url });
    const opciones = solicitud.mock.calls[0][1];
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo).toMatchObject({ status: "pending", external_reference: entrada.consultorioId, payer_email: entrada.correo,
      back_url: "https://nutrisfera.com.ar/panel/facturacion", notification_url: "https://nutrisfera.com.ar/api/facturacion/mercadopago",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 15999, currency_id: "ARS" } });
    expect(cuerpo).not.toHaveProperty("card_token_id");
    expect(cuerpo.auto_recurring).not.toHaveProperty("start_date");
    expect(opciones.cache).toBe("no-store");
  });
  it("respeta los días restantes de prueba y no agrega otra prueba en el proveedor", async () => {
    const inicioCobro = new Date(Date.now() + 86_400_000);
    await crearPagoSuscripcion({ ...entrada, inicioCobro });
    const cuerpo = JSON.parse(solicitud.mock.calls[0][1].body);
    expect(cuerpo.auto_recurring.start_date).toBe(inicioCobro.toISOString());
    expect(cuerpo.auto_recurring).not.toHaveProperty("free_trial");
  });
  it("no entrega un enlace inválido ni un checkout de otra suscripción", async () => {
    solicitud.mockResolvedValueOnce(Response.json({ id: "otra", init_point: url }));
    expect(await crearPagoSuscripcion(entrada)).toHaveProperty("error");
    solicitud.mockResolvedValueOnce(Response.json({ id: "pre-1", init_point: "https://otro-sitio.test/pago" }));
    expect(await crearPagoSuscripcion(entrada)).toHaveProperty("error");
  });
  it("muestra un error recuperable ante una caída de red o una respuesta rechazada", async () => {
    solicitud.mockRejectedValueOnce(new Error("sin red"));
    expect(await crearPagoSuscripcion(entrada)).toHaveProperty("error");
    solicitud.mockResolvedValueOnce(Response.json({ message: "detalle interno" }, { status: 500 }));
    expect(await crearPagoSuscripcion(entrada)).toEqual({ error: "No pudimos abrir el pago en Mercado Pago. Intentá nuevamente en unos minutos." });
  });
  it("no llama al proveedor si falta el token del servidor", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    expect(await crearPagoSuscripcion(entrada)).toHaveProperty("error");
    expect(solicitud).not.toHaveBeenCalled();
  });
});

describe("destino del pago", () => {
  it("acepta únicamente el checkout oficial", () => {
    expect(urlPagoMercadoPago(url)).toBe(url);
    for (const valor of [undefined, "javascript:alert(1)", "https://www.mercadopago.com.ar.ejemplo.com/subscriptions/checkout?preapproval_id=1", "https://usuario@www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=1", "http://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=1", "https://www.mercadopago.com.ar/otro"]) {
      expect(urlPagoMercadoPago(valor)).toBeNull();
    }
  });
});

describe("cambio de vendedor ficticio", () => {
  it("permite regenerar un recurso inaccesible solo con un nuevo vendedor de prueba verificado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MERCADOPAGO_CORREO_PAGADOR_PRUEBA", "comprador@testuser.com");
    solicitud.mockResolvedValue(Response.json({ tags: ["test_user", "normal"] }));
    expect(await esCambioDeVendedorDePrueba(new ErrorConsultaMercadoPago(404))).toBe(true);
    solicitud.mockResolvedValue(Response.json({ tags: ["test_user"] }));
    expect(await esCambioDeVendedorDePrueba(new ErrorConsultaMercadoPago(400, true))).toBe(true);
    expect(await esCambioDeVendedorDePrueba(new ErrorConsultaMercadoPago(400))).toBe(false);
  });
  it("rechaza producción, fallos de red y tokens de cuentas reales", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MERCADOPAGO_CORREO_PAGADOR_PRUEBA", "comprador@testuser.com");
    expect(await esCambioDeVendedorDePrueba(new ErrorConsultaMercadoPago(404))).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(await esCambioDeVendedorDePrueba(new ErrorConsultaMercadoPago(500))).toBe(false);
    expect(await esCambioDeVendedorDePrueba(new Error("sin red"))).toBe(false);
    solicitud.mockResolvedValue(Response.json({ tags: ["normal"] }));
    expect(await esCambioDeVendedorDePrueba(new ErrorConsultaMercadoPago(403))).toBe(false);
  });
});
