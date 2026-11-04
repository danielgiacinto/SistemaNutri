"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesionalParaFacturacion, requerirSuperadmin } from "@/autorizacion/sesion";
import { consultarRecursoMercadoPago, crearPagoSuscripcion, esCambioDeVendedorDePrueba, obtenerConfiguracionComercial, urlPagoMercadoPago, type SuscripcionMercadoPago } from "@/servicios/facturacion/mercadopago";
import { formatearPesos } from "@/lib/moneda";
import { mensajeDeNegocio, registrarError } from "@/lib/errores";
import { esquemaUuid } from "@/esquemas/comunes";
import type { ResultadoAccion } from "@/tipos/acciones";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { sincronizarSuscripcion } from "@/servicios/facturacion/notificaciones";

export async function iniciarPagoSuscripcion(): Promise<ResultadoAccion<{ url: string }>> {
  const contexto = await requerirProfesionalParaFacturacion();
  if (contexto.consultorio.rol !== "titular") {
    return { ok: false, mensaje: "Solo el titular del consultorio puede autorizar la suscripción." };
  }
  const cliente = await crearClienteServidor();
  const [configuracion, prueba, existente] = await Promise.all([
    obtenerConfiguracionComercial(cliente),
    cliente.from("pruebas_profesionales").select("vence_en").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
    cliente.from("suscripciones").select("id, mp_id, precio, estado_mp, cobertura_hasta, cancelacion_solicitada_en").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
  ]);
  if (!configuracion.precioMensual) {
    return { ok: false, mensaje: "El precio mensual todavía no está configurado." };
  }
  if (prueba.error || existente.error) return { ok: false, mensaje: "No se pudo consultar tu suscripción. Intentá nuevamente." };
  if (!contexto.correo) return { ok: false, mensaje: "Tu cuenta necesita un correo para continuar con el pago." };

  if (existente.data?.mp_id) {
    try {
      const remota = await consultarRecursoMercadoPago(`/preapproval/${encodeURIComponent(existente.data.mp_id)}`) as SuscripcionMercadoPago | null;
      if (!remota || remota.external_reference !== contexto.consultorio.id) {
        return { ok: false, mensaje: "No pudimos verificar la suscripción actual. Contactá al soporte." };
      }
      if (remota.status === "authorized") {
        return { ok: false, mensaje: "Tu suscripción ya está autorizada. El acceso se actualiza cuando se confirma el cobro." };
      }
      if (remota.status === "paused" || (existente.data.cancelacion_solicitada_en && remota.status !== "cancelled" && remota.status !== "canceled")) {
        return { ok: false, mensaje: "Primero debe confirmarse la cancelación de la suscripción anterior para evitar cobros duplicados." };
      }
      if ((remota.status === "cancelled" || remota.status === "canceled") && existente.data.estado_mp !== "cancelled") {
        const servicio = crearClienteServicio();
        if (!servicio) return { ok: false, mensaje: "Falta sincronizar la cancelación anterior. Contactá al soporte." };
        await sincronizarSuscripcion(servicio, existente.data.mp_id);
      }
      // Continuar el mismo checkout evita crear otra suscripción al volver sin pagar.
      if (remota.status === "pending") {
        const url = urlPagoMercadoPago(remota.init_point);
        if (url && Number(remota.auto_recurring?.transaction_amount) === Number(existente.data.precio) && remota.auto_recurring?.currency_id === "ARS") {
          return { ok: true, datos: { url } };
        }
        return { ok: false, mensaje: "El pago pendiente necesita una revisión. Contactá al soporte." };
      }
    } catch (error) {
      // Solo se reemplaza un pendiente sin cobertura, en desarrollo y después
      // de verificar por API que el nuevo token también pertenece a una cuenta ficticia.
      const reemplazable = existente.data.estado_mp === "pending" && !existente.data.cobertura_hasta &&
        await esCambioDeVendedorDePrueba(error);
      if (!reemplazable) {
        registrarError("suscripcion_consultar", error);
        return { ok: false, mensaje: "No pudimos verificar el pago anterior con Mercado Pago. Intentá nuevamente o revisá las credenciales configuradas." };
      }
    }
  }

  const inicioCobro = new Date(Math.max(Date.now(), new Date(prueba.data?.vence_en ?? 0).getTime(), new Date(existente.data?.cobertura_hasta ?? 0).getTime()));
  const pago = await crearPagoSuscripcion({
    consultorioId: contexto.consultorio.id,
    correo: contexto.correo ?? "",
    precio: configuracion.precioMensual,
    inicioCobro: inicioCobro.getTime() > Date.now() ? inicioCobro : undefined,
  });
  if ("error" in pago) return { ok: false, mensaje: pago.error };

  const valores = { mp_id: pago.id, estado_mp: "pending", precio: configuracion.precioMensual, moneda: "ARS" };
  let guardado;
  if (existente.data) {
    const consulta = cliente.from("suscripciones").update({
      mp_id: pago.id,
      estado_mp: "pending",
      ...(Number(existente.data.precio) !== configuracion.precioMensual ? { precio: configuracion.precioMensual, moneda: "ARS" } : {}),
    }).eq("id", existente.data.id);
    // Si otra solicitud guardó un enlace mientras esperábamos a Mercado Pago,
    // este checkout no se entrega: el usuario reintentará con el enlace guardado.
    guardado = await (existente.data.mp_id ? consulta.eq("mp_id", existente.data.mp_id) : consulta.is("mp_id", null)).select("id").maybeSingle();
  } else {
    guardado = await cliente.from("suscripciones").insert({
      consultorio_id: contexto.consultorio.id,
      ...valores,
    }).select("id").single();
  }
  if (guardado.error || !guardado.data) {
    if (guardado.error) registrarError("suscripcion_guardar", guardado.error);
    return { ok: false, mensaje: "No pudimos preparar el pago. Volvé a intentarlo antes de continuar a Mercado Pago." };
  }
  return { ok: true, datos: { url: pago.url } };
}

export async function guardarConfiguracionComercial(formulario: FormData): Promise<ResultadoAccion> {
  await requerirSuperadmin();
  const cantidad = Number(formulario.get("pruebaCantidad"));
  const unidad = formulario.get("pruebaUnidad") === "dias" ? "dias" : "meses";
  const precio = formulario.get("precioMensual");
  const diasGracia = Number(formulario.get("diasGracia"));
  const pruebasHabilitadas = formulario.get("pruebasHabilitadas") === "si";
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 36) {
    return { ok: false, mensaje: "La duración de la prueba tiene que ser un entero entre 1 y 36." };
  }
  if (!Number.isInteger(diasGracia) || diasGracia < 0 || diasGracia > 30) {
    return { ok: false, mensaje: "Los días de gracia tienen que estar entre 0 y 30." };
  }
  const precioNumero = precio === "" || precio == null ? null : Number(precio);
  if (precioNumero != null && (!Number.isFinite(precioNumero) || precioNumero <= 0)) {
    return { ok: false, mensaje: "El precio mensual tiene que ser mayor a cero." };
  }

  const cliente = await crearClienteServidor();
  const { data, error } = await cliente
    .from("configuracion_comercial")
    .update({
      prueba_cantidad: cantidad,
      prueba_unidad: unidad,
      precio_mensual: precioNumero,
      dias_gracia: diasGracia,
      pruebas_habilitadas: pruebasHabilitadas,
    })
    .eq("id", true)
    .select("precio_mensual")
    .single();
  if (error || !data) return { ok: false, mensaje: "No se pudo guardar la configuración comercial." };

  const vigente = formatearPesos(data.precio_mensual);
  return {
    ok: true,
    mensaje: vigente
      ? `Configuración guardada. El plan queda en ${vigente} por mes.`
      : "Configuración guardada. El plan quedó sin precio mensual.",
  };
}

export async function extenderPrueba(formulario: FormData): Promise<ResultadoAccion> {
  await requerirSuperadmin();
  const consultorioId = String(formulario.get("consultorioId") ?? "");
  const vence = String(formulario.get("vence") ?? "");
  const motivo = String(formulario.get("motivo") ?? "").trim();
  if (!esquemaUuid.safeParse(consultorioId).success) return { ok: false, mensaje: "No encontramos ese consultorio." };
  if (!vence || !Number.isFinite(new Date(vence).getTime())) {
    return { ok: false, mensaje: "Elegí una fecha y hora de vencimiento válidas." };
  }
  if (motivo.length < 5 || motivo.length > 500) {
    return { ok: false, mensaje: "El motivo debe tener entre 5 y 500 caracteres." };
  }

  const cliente = await crearClienteServidor();
  const { error } = await cliente.rpc("ajustar_prueba", {
    p_consultorio_id: consultorioId,
    p_vence_en: new Date(vence).toISOString(),
    p_motivo: motivo,
  });
  if (error) {
    const mensaje = mensajeDeNegocio(error, {
      sin_permiso: "No tenés permiso para ajustar esta prueba.",
      prueba_inexistente: "No encontramos una prueba vigente para este consultorio.",
      motivo_obligatorio: "El motivo debe tener al menos 5 caracteres.",
      fecha_invalida: "Elegí una fecha de vencimiento válida.",
    });
    if (!mensaje) registrarError("ajustar_prueba", error);
    return { ok: false, mensaje: mensaje ?? "No se pudo ajustar la prueba gratuita. Intentá nuevamente." };
  }
  refresh();
  return { ok: true, mensaje: "La prueba gratuita quedó ajustada." };
}
