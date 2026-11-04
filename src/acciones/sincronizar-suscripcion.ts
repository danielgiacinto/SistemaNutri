"use server";

import { refresh } from "next/cache";
import { requerirProfesionalParaFacturacion, requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor, type ClienteSupabase } from "@/lib/supabase/servidor";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { esquemaUuid } from "@/esquemas/comunes";
import { registrarError } from "@/lib/errores";
import { credencialesMercadoPago } from "@/servicios/facturacion/mercadopago";
import { procesarNotificacionMercadoPago } from "@/servicios/facturacion/notificaciones";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function actualizarMiSuscripcion(): Promise<ResultadoAccion> {
  const contexto = await requerirProfesionalParaFacturacion();
  if (contexto.consultorio.rol !== "titular") {
    return { ok: false, mensaje: "Solo el titular puede sincronizar la suscripción." };
  }
  return actualizarSuscripcion(await crearClienteServidor(), contexto.consultorio.id);
}

export async function actualizarSuscripcionProfesional(consultorioId: string): Promise<ResultadoAccion> {
  await requerirSuperadmin();
  if (!esquemaUuid.safeParse(consultorioId).success) {
    return { ok: false, mensaje: "No encontramos ese consultorio." };
  }
  return actualizarSuscripcion(await crearClienteServidor(), consultorioId);
}

async function actualizarSuscripcion(cliente: ClienteSupabase, consultorioId: string): Promise<ResultadoAccion> {
  // La lectura sigue usando RLS antes de obtener el cliente privilegiado.
  const { data, error } = await cliente.from("suscripciones").select("mp_id").eq("consultorio_id", consultorioId).maybeSingle();
  if (error) {
    registrarError("suscripcion_sincronizar_lectura", error);
    return { ok: false, mensaje: "No pudimos consultar la suscripción. Intentá nuevamente." };
  }
  if (!data?.mp_id) return { ok: false, mensaje: "Este consultorio todavía no tiene una suscripción en Mercado Pago." };
  if (!credencialesMercadoPago()) return { ok: false, mensaje: "La conexión con Mercado Pago todavía no está configurada." };
  const servicio = crearClienteServicio();
  if (!servicio) return { ok: false, mensaje: "Falta configurar la sincronización en el servidor. Contactá al soporte." };
  try {
    // Reutiliza las mismas comprobaciones de referencia, moneda y precio del webhook.
    await procesarNotificacionMercadoPago(servicio, "subscription_preapproval", data.mp_id);
  } catch (error) {
    registrarError("suscripcion_sincronizar", error);
    return { ok: false, mensaje: "No pudimos verificar el estado con Mercado Pago. Conservamos la información anterior; intentá nuevamente." };
  }
  refresh();
  return { ok: true, mensaje: "Suscripción sincronizada. Los cobros y la cobertura se confirman por separado." };
}
