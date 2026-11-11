import "server-only";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { enviarCorreoComercial, codigoErrorCorreo } from "./correo-comercial";

type Aviso = { consultorio_id: string; clave_evento: string; tipo: string; destinatario: string; asunto: string; texto: string };

/** Crea eventos acotados; la clave única en PostgreSQL evita avisos repetidos entre ejecuciones. */
export async function prepararAvisosComerciales(cliente: ClienteSupabase, ahora = new Date()) {
  if (!process.env.CORREO_COMERCIAL_USUARIO || !process.env.CORREO_COMERCIAL_CLAVE_APLICACION) {
    return { configurado: false, creados: 0 };
  }
  const { data: pruebas, error } = await cliente.from("pruebas_profesionales")
    .select("consultorio_id, correo, vence_en")
    .gte("vence_en", new Date(ahora.getTime() - 86_400_000).toISOString())
    .lte("vence_en", new Date(ahora.getTime() + 7 * 86_400_000).toISOString()).limit(100);
  if (error) throw error;
  const avisos: Aviso[] = [];
  const urlFacturacion = `${process.env.NEXT_PUBLIC_SITIO_URL?.replace(/\/$/, "") ?? "https://nutrisfera.vercel.app"}/panel/facturacion`;
  for (const prueba of pruebas ?? []) {
    if (!prueba.consultorio_id || !prueba.vence_en || !prueba.correo) continue;
    const { data: suscripcion, error: errorSuscripcion } = await cliente.from("suscripciones")
      .select("cobertura_hasta").eq("consultorio_id", prueba.consultorio_id).maybeSingle();
    if (errorSuscripcion) throw errorSuscripcion;
    if (suscripcion?.cobertura_hasta && new Date(suscripcion.cobertura_hasta) > ahora) continue;
    const vencio = new Date(prueba.vence_en) <= ahora;
    const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Cordoba" }).format(new Date(prueba.vence_en));
    avisos.push({
      consultorio_id: prueba.consultorio_id,
      clave_evento: `prueba-${vencio ? "vencida" : "por-vencer"}-${prueba.vence_en}`,
      tipo: vencio ? "prueba_vencida" : "prueba_por_vencer",
      destinatario: prueba.correo,
      asunto: vencio ? "Tu prueba de Nutrisfera terminó" : "Tu prueba de Nutrisfera está por terminar",
      texto: vencio
        ? `Tu período de prueba terminó el ${fecha}. Tus datos se conservan. Para recuperar el acceso a tu consultorio, ingresá a ${urlFacturacion} y revisá tu plan.\n\nNutrisfera`
        : `Tu período de prueba termina el ${fecha}. Si todavía no autorizaste la suscripción, podés hacerlo desde ${urlFacturacion} para continuar usando tu consultorio.\n\nNutrisfera`,
    });
  }
  const { data: pagos, error: errorPagos } = await cliente.from("pagos_suscripcion")
    .select("suscripcion_id, mp_pago_id, estado, cobrado_en, periodo_hasta")
    .gte("creado_en", new Date(ahora.getTime() - 2 * 86_400_000).toISOString())
    .in("estado", ["rechazado", "aprobado"]).limit(100);
  if (errorPagos) throw errorPagos;
  for (const pago of pagos ?? []) {
    if (pago.estado === "aprobado" && !pago.periodo_hasta) continue;
    const { data: suscripcion, error: errorSuscripcion } = await cliente.from("suscripciones")
      .select("consultorio_id").eq("id", pago.suscripcion_id).maybeSingle();
    if (errorSuscripcion) throw errorSuscripcion;
    if (!suscripcion) continue;
    const { data: prueba, error: errorPrueba } = await cliente.from("pruebas_profesionales")
      .select("correo").eq("consultorio_id", suscripcion.consultorio_id).maybeSingle();
    if (errorPrueba) throw errorPrueba;
    if (!prueba?.correo) continue;
    const rechazo = pago.estado === "rechazado";
    avisos.push({
      consultorio_id: suscripcion.consultorio_id,
      clave_evento: `pago-${pago.estado}-${pago.mp_pago_id}`,
      tipo: rechazo ? "cobro_rechazado" : "cobro_confirmado",
      destinatario: prueba.correo,
      asunto: rechazo ? "No pudimos confirmar tu cobro de Nutrisfera" : "Confirmamos tu cobro de Nutrisfera",
      texto: rechazo
        ? `El último intento de cobro de tu suscripción no se confirmó. Revisá tu medio de pago y el estado de acceso en ${urlFacturacion}. Si el pago ya se regularizó, ahí vas a ver la cobertura actualizada.\n\nNutrisfera`
        : `Confirmamos el cobro mensual de tu suscripción. Consultá el período cubierto y el historial en ${urlFacturacion}.\n\nNutrisfera`,
    });
  }
  for (const aviso of avisos) {
    const { error: errorInsertar } = await cliente.from("correos_comerciales").upsert(aviso, { onConflict: "consultorio_id,clave_evento", ignoreDuplicates: true });
    if (errorInsertar) throw errorInsertar;
  }
  return { configurado: true, creados: avisos.length };
}

export async function despacharAvisosComerciales(cliente: ClienteSupabase) {
  if (!process.env.CORREO_COMERCIAL_USUARIO || !process.env.CORREO_COMERCIAL_CLAVE_APLICACION) return { configurado: false, enviados: 0, fallidos: 0 };
  const { data, error } = await cliente.rpc("reclamar_correos_comerciales", { p_limite: 10 });
  if (error) throw error;
  let enviados = 0; let fallidos = 0;
  for (const aviso of data ?? []) {
    try {
      if (aviso.tipo === "prueba_por_vencer" || aviso.tipo === "prueba_vencida") {
        const { data: suscripcion, error: errorEstado } = await cliente.from("suscripciones")
          .select("cobertura_hasta").eq("consultorio_id", aviso.consultorio_id).maybeSingle();
        if (errorEstado) throw errorEstado;
        if (suscripcion?.cobertura_hasta && new Date(suscripcion.cobertura_hasta) > new Date()) {
          const { error: descartar } = await cliente.from("correos_comerciales").delete().eq("id", aviso.id).eq("reclamado_en", aviso.reclamado_en!);
          if (descartar) throw descartar;
          continue;
        }
      }
      const mensajeId = await enviarCorreoComercial({ destinatario: aviso.destinatario, asunto: aviso.asunto, texto: aviso.texto, tipo: aviso.tipo });
      const { error: guardar } = await cliente.from("correos_comerciales").update({ enviado_en: new Date().toISOString(), mensaje_id: mensajeId, ultimo_error: null })
        .eq("id", aviso.id).eq("reclamado_en", aviso.reclamado_en!);
      if (guardar) throw guardar;
      enviados++;
    } catch (error) {
      const codigo = codigoErrorCorreo(error);
      console.error("[correo_comercial]", { codigo });
      await cliente.from("correos_comerciales").update({ ultimo_error: codigo }).eq("id", aviso.id);
      fallidos++;
    }
  }
  return { configurado: true, enviados, fallidos };
}
