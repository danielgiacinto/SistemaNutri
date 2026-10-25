import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import type { Fila } from "@/tipos/entidades";

export type MetricasPlataforma = {
  consultoriosTotales: number;
  consultoriosActivos: number;
  cuentasProfesionales: number;
};

/**
 * Métricas comerciales de la plataforma. Solo devuelve datos a un
 * superadministrador: las políticas RLS filtran el resto de los casos.
 */
export async function obtenerMetricasPlataforma(cliente: ClienteSupabase): Promise<MetricasPlataforma> {
  const [totales, activos, profesionales] = await Promise.all([
    cliente.from("consultorios").select("id", { count: "exact", head: true }),
    cliente.from("consultorios").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    cliente.from("perfiles").select("id", { count: "exact", head: true }).eq("tipo_cuenta", "profesional"),
  ]);

  const error = totales.error ?? activos.error ?? profesionales.error;
  if (error) {
    registrarError("metricas_plataforma", error);
    throw new Error("No se pudieron calcular las métricas de la plataforma.");
  }

  return {
    consultoriosTotales: totales.count ?? 0,
    consultoriosActivos: activos.count ?? 0,
    cuentasProfesionales: profesionales.count ?? 0,
  };
}

export type ConsultorioReciente = Pick<Fila<"consultorios">, "id" | "nombre" | "estado" | "creado_en">;

export async function obtenerConsultoriosRecientes(
  cliente: ClienteSupabase,
  limite = 10,
): Promise<ConsultorioReciente[]> {
  const { data, error } = await cliente
    .from("consultorios")
    .select("id, nombre, estado, creado_en")
    .order("creado_en", { ascending: false })
    .limit(limite);

  if (error) {
    registrarError("consultorios_recientes", error);
    throw new Error("No se pudo obtener el listado de consultorios.");
  }
  return data;
}
