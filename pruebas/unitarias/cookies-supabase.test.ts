import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { crearClienteRedireccion } from "@/lib/supabase/redireccion";

vi.mock("@/configuracion/entorno", () => ({
  obtenerEntornoPublico: () => ({ supabaseUrl: "https://ejemplo.supabase.co", supabaseClavePublica: "publica-de-prueba" }),
}));

afterEach(() => vi.unstubAllEnvs());

async function cookieOAuth(entorno: string, sitio: string) {
  vi.stubEnv("NODE_ENV", entorno);
  vi.stubEnv("NEXT_PUBLIC_SITIO_URL", sitio);
  const { cliente, redirigir } = crearClienteRedireccion(new NextRequest(`${sitio}/auth/google`));
  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google", options: { redirectTo: `${sitio}/auth/confirmar`, skipBrowserRedirect: true },
  });
  expect(error).toBeNull();
  expect(data.url).toBeTruthy();
  return redirigir(data.url!).headers.get("set-cookie") ?? "";
}

describe("cookies de la redirección OAuth", () => {
  it("publica el verificador PKCE con Secure y SameSite=Lax en producción", async () => {
    const cookie = await cookieOAuth("production", "https://nutrisfera.vercel.app");
    expect(cookie).toContain("code-verifier=");
    expect(cookie).toMatch(/;\s*Secure(?:;|$)/i);
    expect(cookie).toMatch(/;\s*SameSite=Lax/i);
  });
  it("permite ingresar desde el servidor local HTTP", async () => {
    const cookie = await cookieOAuth("development", "http://localhost:3000");
    expect(cookie).toContain("code-verifier=");
    expect(cookie).not.toMatch(/;\s*Secure(?:;|$)/i);
  });
  it("también protege un entorno de desarrollo configurado con HTTPS", async () => {
    expect(await cookieOAuth("development", "https://prueba.ejemplo.com")).toMatch(/;\s*Secure(?:;|$)/i);
  });
});
