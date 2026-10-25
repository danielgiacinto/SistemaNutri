import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

export async function proxy(peticion: NextRequest) {
  return actualizarSesion(peticion);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, imágenes optimizadas y recursos públicos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
