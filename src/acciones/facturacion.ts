"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cargarProfesional, requerirSuperadmin } from "@/autorizacion/sesion";
import { crearAutorizacionRecurrente, obtenerConfiguracionComercial } from "@/servicios/facturacion/mercadopago";
import { formatearPesos } from "@/lib/moneda";
import { registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function autorizarSuscripcion(tokenTarjeta: string): Promise<ResultadoAccion> {
  const contexto = await cargarProfesional();
  if (contexto.consultorio.rol !== "titular") {
    return { ok: false, mensaje: "Solo el titular del consultorio puede autorizar la suscripción." };
  }
  if (!tokenTarjeta || tokenTarjeta.length < 8) {
    return { ok: false, mensaje: "Mercado Pago no entregó un token de tarjeta válido." };
  }

  const cliente = await crearClienteServidor();
  const [configuracion, prueba] = await Promise.all([
    obtenerConfiguracionComercial(cliente),
    cliente.from("pruebas_profesionales").select("vence_en").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
  ]);
  if (!configuracion.precioMensual) {
    return { ok: false, mensaje: "El precio mensual todavía no está configurado." };
  }
  if (prueba.error) return { ok: false, mensaje: "No se pudo leer la prueba gratuita." };

  const inicioCobro = new Date(prueba.data?.vence_en ?? Date.now());
  if (inicioCobro.getTime() < new Date().getTime()) inicioCobro.setTime(new Date().getTime() + 60_000);

  const autorizacion = await crearAutorizacionRecurrente({
    consultorioId: contexto.consultorio.id,
    correo: contexto.correo ?? "",
    precio: configuracion.precioMensual,
    inicioCobro,
    tokenTarjeta,
  });
  if ("error" in autorizacion) return { ok: false, mensaje: autorizacion.error };

  // El titular puede insertar el precio, pero no actualizarlo. Un upsert lo intenta
  // igual en el conflicto y Postgres rechaza la sentencia completa.
  const { data: existente, error: errorLectura } = await cliente
    .from("suscripciones")
    .select("id")
    .eq("consultorio_id", contexto.consultorio.id)
    .maybeSingle();
  if (errorLectura) {
    registrarError("suscripcion_guardar", errorLectura);
    return { ok: false, mensaje: "La autorización se creó, pero no pudimos guardarla. Contactá a soporte." };
  }

  const { error } = existente
    ? await cliente
        .from("suscripciones")
        .update({ mp_id: autorizacion.id, estado_mp: "authorized" })
        .eq("id", existente.id)
    : await cliente.from("suscripciones").insert({
        consultorio_id: contexto.consultorio.id,
        mp_id: autorizacion.id,
        estado_mp: "authorized",
        precio: configuracion.precioMensual,
        moneda: "ARS",
      });
  if (error) {
    registrarError("suscripcion_guardar", error);
    return { ok: false, mensaje: "La autorización se creó, pero no pudimos guardarla. Contactá a soporte." };
  }

  refresh();
  return {
    ok: true,
    mensaje: "La suscripción quedó autorizada. El primer cobro del plan se intenta cuando termina la prueba, no antes.",
  };
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

export async function extenderPrueba(formulario: FormData): Promise<void> {
  await requerirSuperadmin();
  const consultorioId = String(formulario.get("consultorioId") ?? "");
  const vence = String(formulario.get("vence") ?? "");
  const motivo = String(formulario.get("motivo") ?? "");
  const cliente = await crearClienteServidor();
  await cliente.rpc("ajustar_prueba", {
    p_consultorio_id: consultorioId,
    p_vence_en: new Date(vence).toISOString(),
    p_motivo: motivo,
  });
  refresh();
}
