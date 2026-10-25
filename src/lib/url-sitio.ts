import "server-only";
import { headers } from "next/headers";
import { obtenerEntornoPublico } from "@/configuracion/entorno";

/**
 * URL base del sitio para construir enlaces de redirección de Supabase Auth.
 * Prioriza NEXT_PUBLIC_SITIO_URL; si no está definida (por ejemplo en previews
 * de Vercel) usa el host de la petición. Supabase solo acepta redirecciones a
 * URLs de su lista permitida, por lo que un host falsificado no tiene efecto.
 */
export async function obtenerUrlSitio(): Promise<string> {
  const { sitioUrl } = obtenerEntornoPublico();
  if (sitioUrl) return sitioUrl;

  const encabezados = await headers();
  const host = encabezados.get("x-forwarded-host") ?? encabezados.get("host");
  if (!host) {
    throw new Error("No se pudo determinar la URL del sitio. Definí NEXT_PUBLIC_SITIO_URL.");
  }
  const esLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocolo = encabezados.get("x-forwarded-proto") ?? (esLocal ? "http" : "https");
  return `${protocolo}://${host}`;
}
