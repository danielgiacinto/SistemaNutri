"use server";

import { refresh } from "next/cache";
import { requerirProfesionalParaFacturacion } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { cancelarAutorizacionMercadoPago, credencialesMercadoPago } from "@/servicios/facturacion/mercadopago";
import { sincronizarSuscripcion } from "@/servicios/facturacion/notificaciones";
import { registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function cancelarMiSuscripcion(formulario: FormData): Promise<ResultadoAccion> {
  const contexto = await requerirProfesionalParaFacturacion();
  if (contexto.consultorio.rol !== "titular") return { ok: false, mensaje: "Solo el titular puede cancelar la renovación." };
  const motivo = String(formulario.get("motivo") ?? "").trim();
  if (formulario.get("confirmacion") !== "si" || motivo.length < 5 || motivo.length > 500) {
    return { ok: false, mensaje: "Confirmá la cancelación e indicá un motivo de entre 5 y 500 caracteres." };
  }
  const servicio = crearClienteServicio();
  if (!servicio || !credencialesMercadoPago()) return { ok: false, mensaje: "La conexión de facturación no está configurada. Contactá al soporte." };
  const cliente = await crearClienteServidor();
  // La función obtiene el consultorio y el actor de auth.uid(), nunca de FormData.
  const { data: mpId, error } = await cliente.rpc("solicitar_cancelacion_suscripcion", { p_motivo: motivo });
  if (error || !mpId) return { ok: false, mensaje: "No pudimos registrar la solicitud de cancelación." };
  try {
    let verificada = await sincronizarSuscripcion(servicio, mpId);
    if (verificada.local.consultorio_id !== contexto.consultorio.id) throw new Error("Suscripción de otro consultorio.");
    if (verificada.remota.status !== "cancelled") {
      await cancelarAutorizacionMercadoPago(mpId);
      verificada = await sincronizarSuscripcion(servicio, mpId);
    }
    if (verificada.remota.status !== "cancelled") throw new Error("Cancelación pendiente.");
    refresh();
    return { ok: true, mensaje: "La renovación está cancelada. Conservás el acceso hasta el fin de la prueba o del período ya pagado." };
  } catch (error) {
    registrarError("cancelacion_suscripcion", error);
    refresh();
    return { ok: false, mensaje: "Tu solicitud quedó registrada, pero Mercado Pago todavía no confirmó la cancelación. La volveremos a verificar; no la damos por finalizada." };
  }
}
