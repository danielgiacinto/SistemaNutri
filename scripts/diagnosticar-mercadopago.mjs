/** Consulta de identidad y configuración. No crea pagos ni muestra el Access Token. */
const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
const correoComprador = process.env.MERCADOPAGO_CORREO_PAGADOR_PRUEBA?.trim();

if (!token) {
  console.error("Falta MERCADOPAGO_ACCESS_TOKEN en .env.local.");
  process.exitCode = 1;
} else {
  try {
    const respuesta = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!respuesta.ok) throw new Error(`Mercado Pago respondió HTTP ${respuesta.status}.`);
    const usuario = await respuesta.json();
    const esPrueba = Array.isArray(usuario.tags) && usuario.tags.includes("test_user");
    console.log("Cuenta que recibe los cobros (dueña del token):", usuario.nickname);
    console.log("Identificador del receptor:", usuario.id);
    console.log("País:", usuario.site_id);
    console.log("Cuenta de prueba confirmada:", esPrueba ? "sí" : "no");
    console.log("Correo pagador configurado:", correoComprador || "sin configurar (se usaría el correo profesional)");
    console.log("Webhook:", process.env.MERCADOPAGO_WEBHOOK_SECRETO?.trim() ? "configurado" : "pendiente");
    console.log("Clave de servicio Supabase:", process.env.SUPABASE_SECRET_KEY?.trim() ? "configurada" : "pendiente");
    console.log("El comprador debe ser otra cuenta. El nombre asignado en el panel no cambia quién es dueño del token.");
    if (correoComprador && usuario.email?.toLowerCase() === correoComprador.toLowerCase()) {
      console.error("El vendedor y el comprador configurados son la misma cuenta.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo consultar la identidad en Mercado Pago.");
    process.exitCode = 1;
  }
}
