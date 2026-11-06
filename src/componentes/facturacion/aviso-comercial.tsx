import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearFecha } from "@/lib/fechas";
import { registrarError } from "@/lib/errores";
import { AvisoComercialDescartable } from "./aviso-comercial-descartable";

export async function AvisoComercial({ consultorioId, zona }: { consultorioId: string; zona: string }) {
  const cliente = await crearClienteServidor();
  const [estado, prueba, suscripcion] = await Promise.all([
    cliente.rpc("estado_acceso_comercial", { p_consultorio_id: consultorioId }),
    cliente.from("pruebas_profesionales").select("vence_en").eq("consultorio_id", consultorioId).maybeSingle(),
    cliente.from("suscripciones").select("id, estado_mp, cobertura_hasta, cancelacion_solicitada_en").eq("consultorio_id", consultorioId).maybeSingle(),
  ]);
  if (estado.error || prueba.error || suscripcion.error) { registrarError("aviso_comercial", estado.error ?? prueba.error ?? suscripcion.error); return null; }
  const s = suscripcion.data;
  const vencePrueba = prueba.data?.vence_en;
  const cobertura = s?.cobertura_hasta;
  const hasta = estado.data === "prueba" ? vencePrueba : cobertura && vencePrueba
    ? new Date(cobertura) > new Date(vencePrueba) ? cobertura : vencePrueba : cobertura ?? vencePrueba;
  const fin = hasta ? formatearFecha(new Date(hasta), zona, "long") : "la fecha de vencimiento";
  let clave: string; let texto: string; let alerta = false; let descartable = true;
  if (estado.data === "vencido" || estado.data === "suspendido_admin") {
    clave = `acceso-${estado.data}-${hasta}`; alerta = true; descartable = false;
    texto = estado.data === "vencido" ? `Tu acceso está suspendido desde el vencimiento del ${fin}. Regularizá la suscripción para retomar todas las funciones; tus datos se conservan.` : "Tu cuenta tiene una suspensión administrativa. Podés consultar facturación y administrar la renovación; contactá al soporte para recuperar el acceso.";
  } else if (estado.data === "gracia") {
    clave = `gracia-${hasta}`; alerta = true;
    texto = "No pudimos confirmar el último cobro. Estás en el período de gracia: revisá tu medio de pago en Mercado Pago para mantener el acceso.";
  } else if (s?.estado_mp === "cancelled" || s?.cancelacion_solicitada_en) {
    clave = `cancelacion-${s.id}-${s.estado_mp}`;
    texto = s.estado_mp === "cancelled" ? `La renovación está cancelada. Conservás el acceso hasta el ${fin}.` : "Tu cancelación está solicitada y pendiente de confirmación de Mercado Pago. Podés revisar su estado en Facturación.";
  } else if (estado.data === "prueba" && prueba.data) {
    const dias = Math.ceil((new Date(prueba.data.vence_en).getTime() - new Date().getTime()) / 86_400_000);
    clave = `prueba-${prueba.data.vence_en}-${dias <= 7 ? "proxima" : "inicio"}-${s?.estado_mp ?? "sin_autorizar"}`;
    alerta = dias <= 7 && s?.estado_mp !== "authorized";
    texto = s?.estado_mp === "authorized" ? `Tu prueba termina el ${fin}. La renovación mensual ya está autorizada en Mercado Pago.` : `Disfrutá tu prueba gratis hasta el ${fin}. Autorizá tu plan antes de esa fecha para continuar con todas las funciones.`;
  } else return null;
  return <AvisoComercialDescartable clave={`${consultorioId}-${clave}`} texto={texto} alerta={alerta} descartable={descartable} />;
}
