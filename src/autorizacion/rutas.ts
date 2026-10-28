/** Rutas de la aplicación usadas por la autenticación y la navegación. */
export const RUTAS = {
  inicio: "/",
  ingresar: "/ingresar",
  registro: "/registro",
  recuperarContrasena: "/recuperar-contrasena",
  restablecerContrasena: "/restablecer-contrasena",
  confirmar: "/auth/confirmar",
  destino: "/auth/destino",
  bienvenida: "/bienvenida",
  invitacionAceptar: "/invitacion/aceptar",
  cuentaInactiva: "/cuenta-inactiva",
  facturacion: "/panel/facturacion",
  panel: "/panel",
  portal: "/portal",
  admin: "/admin",
} as const;

/** Prefijos que exigen sesión iniciada. La autorización por rol se verifica además en el servidor. */
const PREFIJOS_PROTEGIDOS = [
  RUTAS.panel,
  RUTAS.portal,
  RUTAS.admin,
  RUTAS.bienvenida,
  RUTAS.cuentaInactiva,
  RUTAS.restablecerContrasena,
];

/** Rutas que solo tienen sentido sin sesión iniciada. */
const RUTAS_SOLO_INVITADOS = [RUTAS.ingresar, RUTAS.registro, RUTAS.recuperarContrasena];

function coincideConPrefijo(ruta: string, prefijo: string): boolean {
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
}

export function esRutaProtegida(ruta: string): boolean {
  return PREFIJOS_PROTEGIDOS.some((prefijo) => coincideConPrefijo(ruta, prefijo));
}

export function esRutaSoloInvitados(ruta: string): boolean {
  return RUTAS_SOLO_INVITADOS.some((prefijo) => coincideConPrefijo(ruta, prefijo));
}

/** Invitación al portal: alta del paciente o aceptación pendiente. */
export function esRutaInvitacion(ruta: string | null | undefined): boolean {
  if (!ruta) return false;
  const camino = ruta.split("?")[0] ?? "";
  return coincideConPrefijo(camino, "/invitacion");
}

/** Arma `/ingresar?siguiente=…` o similar cuando hay un destino interno. */
export function rutaConSiguiente(ruta: string, siguiente: string | null): string {
  if (!siguiente) return ruta;
  return `${ruta}?siguiente=${encodeURIComponent(siguiente)}`;
}

/**
 * Devuelve la ruta interna a la que se puede redirigir después de autenticarse,
 * o `null` si el valor no es seguro. Evita redirecciones abiertas a otros dominios
 * (`//dominio`, `/\dominio`, `https://...`) y rutas de autenticación que provocarían bucles.
 */
export function sanearRutaSiguiente(valor: string | null | undefined): string | null {
  if (!valor || typeof valor !== "string") return null;
  if (valor.length > 512) return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\\]/.test(valor)) return null;

  let url: URL;
  try {
    url = new URL(valor, "http://base.invalida");
  } catch {
    return null;
  }
  if (url.origin !== "http://base.invalida") return null;
  if (url.pathname.startsWith("/auth/") || esRutaSoloInvitados(url.pathname)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}
