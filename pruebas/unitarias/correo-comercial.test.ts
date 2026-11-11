import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { enviarCorreoComercial } from "@/servicios/facturacion/correo-comercial";
import { crearHtmlCorreoComercial } from "@/servicios/facturacion/plantilla-correo";
import paleta from "@/configuracion/paleta-correo.json";

const { enviar } = vi.hoisted(() => ({ enviar: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: enviar }) } }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("correo comercial", () => {
  it("identifica una confirmación de muestra sin afirmar un cobro real fuera de contexto", async () => {
    vi.stubEnv("CORREO_COMERCIAL_USUARIO", "nutrisfera@prueba.test");
    vi.stubEnv("CORREO_COMERCIAL_CLAVE_APLICACION", "clave");
    enviar.mockResolvedValue({ accepted: ["profesional@prueba.test"], messageId: "muestra" });
    await enviarCorreoComercial({ destinatario: "profesional@prueba.test", asunto: "Confirmamos tu cobro", texto: "Muestra de confirmación.", tipo: "cobro_confirmado", prueba: true });
    const mensaje = enviar.mock.calls[0][0];
    expect(mensaje.subject).toMatch(/^\[PRUEBA\]/);
    expect(mensaje.text).toContain("SIN COBRO REAL");
    expect(mensaje.html).toContain("SIN COBRO REAL");
  });
  it("envía la confirmación en HTML y conserva la alternativa de texto", async () => {
    vi.stubEnv("CORREO_COMERCIAL_USUARIO", "nutrisfera@prueba.test");
    vi.stubEnv("CORREO_COMERCIAL_CLAVE_APLICACION", "clave");
    vi.stubEnv("NEXT_PUBLIC_SITIO_URL", "https://nutrisfera.prueba.test");
    enviar.mockResolvedValue({ accepted: ["profesional@prueba.test"], messageId: "confirmacion" });
    await enviarCorreoComercial({ destinatario: "profesional@prueba.test", asunto: "Confirmamos tu cobro de Nutrisfera", texto: "Cobro confirmado.", tipo: "cobro_confirmado" });
    const mensaje = enviar.mock.calls[0][0];
    expect(mensaje.text).toBe("Cobro confirmado.");
    expect(mensaje.html).toContain("Tu pago está confirmado");
    expect(mensaje.html).toContain('href="https://nutrisfera.prueba.test/panel/facturacion"');
  });

  it("escapa contenido y atributos sin convertir un rechazo en pago confirmado", () => {
    const html = crearHtmlCorreoComercial({ asunto: '<img src=x onerror="alert(1)">', texto: '<script>alert(1)</script>\n\nSaldo & cuenta', tipo: "cobro_rechazado" }, "https://nutrisfera.prueba.test");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Saldo &amp; cuenta");
    expect(html).not.toContain("PAGO CONFIRMADO");
    expect(() => crearHtmlCorreoComercial({ asunto: "Prueba", texto: "" }, "javascript:alert(1)")).toThrow();
  });

  it("mantiene los colores generados sincronizados con globals.css", () => {
    const estilos = readFileSync("src/app/globals.css", "utf8");
    for (const [nombre, valor] of Object.entries(paleta)) {
      expect(estilos).toContain(`--correo-${nombre}: ${valor};`);
    }
  });
});
