import "server-only";
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

export function credencialesMercadoPago(): { token: string } | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  return token ? { token } : null;
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
    const url = new URL("/panel/facturacion", sitio);
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
  return "No pudimos abrir el pago en Mercado Pago. Intentá nuevamente en unos minutos.";
}

/** En prueba el pagador tiene que ser otra cuenta de prueba. En producción se usa el correo del titular. */
export function correoDelPagador(correoProfesional: string, correoPrueba: string | undefined): string {
  const prueba = correoPrueba?.trim();
  return prueba || correoProfesional.trim();
}

export type SuscripcionMercadoPago = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference?: string;
  init_point?: string;
  next_payment_date?: string;
  last_modified?: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string; start_date?: string };
};

/** Solo se permite redirigir al checkout oficial argentino. */
export function urlPagoMercadoPago(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol === "https:" && url.hostname === "www.mercadopago.com.ar" &&
        url.pathname === "/subscriptions/checkout" && !url.username && !url.password && !url.port &&
        url.searchParams.has("preapproval_id")) return url.toString();
  } catch {
    return null;
  }
  return null;
}

/** Crea un enlace pendiente: la autorización y la tarjeta se completan en Mercado Pago. */
export async function crearPagoSuscripcion(entrada: {
  consultorioId: string;
  correo: string;
  precio: number;
  inicioCobro?: Date;
}): Promise<{ id: string; url: string } | { error: string }> {
  const credenciales = credencialesMercadoPago();
  if (!credenciales) return { error: "Mercado Pago no está configurado en el servidor." };

  const sitio = obtenerEntornoPublico().sitioUrl ?? "http://localhost:3000";
  try {
    const respuesta = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${credenciales.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Nutrisfera — suscripción mensual",
        external_reference: entrada.consultorioId,
        payer_email: correoDelPagador(entrada.correo, process.env.MERCADOPAGO_CORREO_PAGADOR_PRUEBA),
        status: "pending",
        back_url: urlRetornoMercadoPago(sitio),
        ...(urlRetornoMercadoPago(sitio) !== URL_RETORNO_RESPALDO
          ? { notification_url: `${new URL(sitio).origin}/api/facturacion/mercadopago` }
          : {}),
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          ...(entrada.inicioCobro && entrada.inicioCobro.getTime() > Date.now()
            ? { start_date: entrada.inicioCobro.toISOString() }
            : {}),
          transaction_amount: entrada.precio,
          currency_id: "ARS",
        },
      }),
    });

    const cuerpo = (await respuesta.json()) as { id?: string; init_point?: string; message?: string; cause?: { description?: string }[] };
    const url = urlPagoMercadoPago(cuerpo.init_point);
    if (!respuesta.ok || !cuerpo.id || !url || new URL(url).searchParams.get("preapproval_id") !== cuerpo.id) {
      registrarError("mercadopago_preapproval", {
        message: cuerpo.message ?? respuesta.statusText,
        cause: cuerpo.cause?.[0]?.description,
      });
      return { error: mensajeAutorizacion(cuerpo.cause?.[0]?.description || cuerpo.message) };
    }
    return { id: cuerpo.id, url };
  } catch (error) {
    registrarError("mercadopago_checkout", error);
    return { error: "No pudimos conectar con Mercado Pago. Intentá nuevamente en unos minutos." };
  }
}

export class ErrorConsultaMercadoPago extends Error {
  constructor(public readonly estado: number, public readonly perteneceAOtroVendedor = false) {
    super("No se pudo consultar Mercado Pago.");
    this.name = "ErrorConsultaMercadoPago";
  }
}

/** Permite cambiar de vendedor ficticio sin reutilizar el checkout de otro token. */
export async function esCambioDeVendedorDePrueba(error: unknown): Promise<boolean> {
  if (process.env.NODE_ENV !== "development" ||
      !/@testuser\.com$/i.test(process.env.MERCADOPAGO_CORREO_PAGADOR_PRUEBA?.trim() ?? "") ||
      !(error instanceof ErrorConsultaMercadoPago) ||
      !([403, 404].includes(error.estado) || (error.estado === 400 && error.perteneceAOtroVendedor))) return false;
  try {
    const vendedor = await consultarRecursoMercadoPago("/users/me") as { tags?: string[] } | null;
    return vendedor?.tags?.includes("test_user") === true;
  } catch {
    return false;
  }
}

export async function consultarRecursoMercadoPago(ruta: string): Promise<unknown | null> {
  const credenciales = credencialesMercadoPago();
  if (!credenciales) return null;
  const respuesta = await fetch(`https://api.mercadopago.com${ruta}`, {
    headers: { Authorization: `Bearer ${credenciales.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!respuesta.ok) {
    registrarError("mercadopago_consulta", { message: `${respuesta.status} ${ruta}` });
    const cuerpo = await respuesta.json().catch(() => null) as { message?: string } | null;
    const perteneceAOtroVendedor = cuerpo?.message === "the preapprovalId is not valid for callerId";
    throw new ErrorConsultaMercadoPago(respuesta.status, perteneceAOtroVendedor);
  }
  return respuesta.json();
}
