"use server";
import { refresh } from "next/cache";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function cambiarEstadoComercial(datos: FormData): Promise<ResultadoAccion> {
  await requerirSuperadmin();
  const id = String(datos.get("consultorioId") ?? "");
  const motivo = String(datos.get("motivo") ?? "").trim();
  const estado = datos.get("estado");
  if (!esquemaUuid.safeParse(id).success || !["activo", "suspendido"].includes(String(estado)) ||
    datos.get("confirmacion") !== "si" || motivo.length < 5 || motivo.length > 500) {
    return { ok: false, mensaje: "Confirmá la acción e indicá un consultorio y motivo válidos." };
  }
  const cliente = await crearClienteServidor();
  const { error } = await cliente.rpc("cambiar_estado_comercial_consultorio", {
    p_consultorio_id: id, p_suspendido: estado === "suspendido", p_motivo: motivo,
  });
  if (error) return { ok: false, mensaje: "No pudimos cambiar el estado de este consultorio." };
  refresh();
  return { ok: true, mensaje: estado === "suspendido" ? "Consultorio suspendido. Los datos se conservan y la renovación se administra por separado." : "Suspensión administrativa retirada. El acceso depende de la prueba o cobertura vigente." };
}
