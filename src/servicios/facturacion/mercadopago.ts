import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import { registrarError } from "@/lib/errores";

export type ConfiguracionComercial = {
  pruebaCantidad: number;
  pruebaUnidad: "dias" | "meses";
  precioMensual: number | null;
  moneda: string;
  diasGracia: number;
  pruebasHabilitadas: boolean;
};

export function credencialesMercadoPago(): { token: string; clavePublica: string } | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const clavePublica = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim();
  if (!token || !clavePublica) return null;
  return { token, clavePublica };
}

export async function obtenerConfiguracionComercial(cliente: ClienteSupabase): Promise<ConfiguracionComercial> {
  const { data, error } = await cliente
    .from("configuracion_comercial")
    .select("prueba_cantidad, prueba_unidad, precio_mensual, moneda, dias_gracia, pruebas_habilitadas")
    .eq("id", true)
    .single();
  if (error || !data) {
    if (error) registrarError("configuracion_comercial", error);
    throw new Error("No se pudo cargar la configuración comercial.");
  }
  return {
    pruebaCantidad: data.prueba_cantidad,
    pruebaUnidad: data.prueba_unidad === "dias" ? "dias" : "meses",
    precioMensual: data.precio_mensual == null ? null : Number(data.precio_mensual),
    moneda: data.moneda,
    diasGracia: data.dias_gracia,
    pruebasHabilitadas: data.pruebas_habilitadas,
  };
}

export type OfertaPublica = {
  precioMensual: number | null;
  moneda: string;
  pruebaCantidad: number;
  pruebaUnidad: "dias" | "meses";
  pruebasHabilitadas: boolean;
};

/** Precio y prueba que se pueden mostrar sin sesión. Null si la consulta falla. */
export async function obtenerOfertaPublica(cliente: ClienteSupabase): Promise<OfertaPublica | null> {
  const { data, error } = await cliente.rpc("oferta_publica").maybeSingle();
  if (error || !data) {
    if (error) registrarError("oferta_publica", error);
    return null;
  }
  return {
    precioMensual: data.precio_mensual == null ? null : Number(data.precio_mensual),
    moneda: data.moneda,
    pruebaCantidad: data.prueba_cantidad,
    pruebaUnidad: data.prueba_unidad === "dias" ? "dias" : "meses",
    pruebasHabilitadas: data.pruebas_habilitadas,
  };
}

/** Mercado Pago no considera válida una back_url con localhost ni con una IP. */
const URL_RETORNO_RESPALDO = "https://www.mercadopago.com.ar";

export function urlRetornoMercadoPago(sitio: string | undefined): string {
  if (!sitio) return URL_RETORNO_RESPALDO;
  try {
    const url = new URL(`${sitio}/panel/facturacion`);
    const host = url.hostname.toLowerCase();
    const esIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
    const esLocal = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || esIp;
    if ((url.protocol === "http:" || url.protocol === "https:") && !esLocal && host.includes(".")) {
      return url.toString();
    }
  } catch {
    return URL_RETORNO_RESPALDO;
  }
  return URL_RETORNO_RESPALDO;
}

function mensajeAutorizacion(descripcion: string | undefined): string {
  if (!descripcion) return "Mercado Pago no pudo autorizar la suscripción.";
  if (/back_url/i.test(descripcion)) {
    return "Mercado Pago no aceptó la dirección de retorno. Recargá Facturación e intentá de nuevo.";
  }
  if (/payer and collector/i.test(descripcion)) {
    return "Con credenciales de prueba, el pagador tiene que ser otra cuenta de prueba, distinta de la que emitió las credenciales.";
  }
  if (/user bad request/i.test(descripcion)) {
    return "Mercado Pago no reconoce al pagador. El correo de prueba tiene que ser el email de otra cuenta (test_user_…@testuser.com), no el usuario que empieza con TESTUSER.";
  }
  return descripcion;
}

/** En prueba el pagador tiene que ser otra cuenta de prueba. En producción se usa el correo del titular. */
export function correoDelPagador(correoProfesional: string, correoPrueba: string | undefined): string {
  const prueba = correoPrueba?.trim();
  return prueba || correoProfesional.trim();
}

/**
 * Crea la autorización recurrente en Mercado Pago.
 * El primer cobro del plan empieza cuando vence nuestra prueba: no hay una segunda prueba en el proveedor.
 * Mercado Pago puede hacer un cobro mínimo de validación y devolverlo; no cuenta como mes de acceso
 * porque el monto es menor al precio de la suscripción.
 * back_url no redirige en este alta: la tarjeta se autoriza en la misma página.
 * Igual Mercado Pago la exige, y rechaza localhost.
 */
export async function crearAutorizacionRecurrente(entrada: {
  consultorioId: string;
  correo: string;
  precio: number;
  inicioCobro: Date;
  tokenTarjeta: string;
}): Promise<{ id: string } | { error: string }> {
  const credenciales = credencialesMercadoPago();
  if (!credenciales) return { error: "Mercado Pago no está configurado en el servidor." };

  const sitio = obtenerEntornoPublico().sitioUrl ?? "http://localhost:3000";
  const respuesta = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credenciales.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "Nutrisfera — suscripción mensual",
      external_reference: entrada.consultorioId,
      payer_email: correoDelPagador(entrada.correo, process.env.MERCADOPAGO_CORREO_PAGADOR_PRUEBA),
      card_token_id: entrada.tokenTarjeta,
      status: "authorized",
      back_url: urlRetornoMercadoPago(sitio),
      notification_url: `${sitio}/api/facturacion/mercadopago`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        start_date: entrada.inicioCobro.toISOString(),
        transaction_amount: entrada.precio,
        currency_id: "ARS",
      },
    }),
  });

  const cuerpo = (await respuesta.json()) as { id?: string; message?: string; cause?: { description?: string }[] };
  if (!respuesta.ok || !cuerpo.id) {
    registrarError("mercadopago_preapproval", {
      message: cuerpo.message ?? respuesta.statusText,
      cause: cuerpo.cause?.[0]?.description,
    });
    return { error: mensajeAutorizacion(cuerpo.cause?.[0]?.description || cuerpo.message) };
  }
  return { id: cuerpo.id };
}

export async function consultarRecursoMercadoPago(ruta: string): Promise<unknown | null> {
  const credenciales = credencialesMercadoPago();
  if (!credenciales) return null;
  const respuesta = await fetch(`https://api.mercadopago.com${ruta}`, {
    headers: { Authorization: `Bearer ${credenciales.token}` },
  });
  if (!respuesta.ok) {
    registrarError("mercadopago_consulta", { message: `${respuesta.status} ${ruta}` });
    return null;
  }
  return respuesta.json();
}
