/** Conserva HTTP en desarrollo local y exige HTTPS para las cookies desplegadas. */
export function opcionesCookiesSesion() {
  return {
    secure: process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SITIO_URL?.startsWith("https://") === true,
  };
}
