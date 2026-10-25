import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import { fechaEnZona, inicioDelDia, inicioDelDiaSiguiente, ultimosDiasHabiles } from "@/lib/fechas";
import { contarPacientes } from "@/servicios/pacientes";
import { obtenerProximoTurno, obtenerTurnoEnCurso, type TurnoConPaciente } from "@/servicios/turnos";
import { listarEvolucionesRecientes } from "@/servicios/evoluciones";

export type MetricasConsultorio = {
  pacientesTotales: number;
  pacientesActivos: number;
  turnosHoy: number;
  atendidosHoy: number;
  consultasPendientes: number;
  proximosControles: number;
};

export type PuntoActividad = {
  fecha: string;
  cantidad: number;
};

export type DatosTablero = {
  metricas: MetricasConsultorio;
  proximoTurno: TurnoConPaciente | null;
  turnoEnCurso: TurnoConPaciente | null;
  evolucionesRecientes: Awaited<ReturnType<typeof listarEvolucionesRecientes>>;
  actividadHabil: PuntoActividad[];
};

export async function obtenerDatosTablero(
  cliente: ClienteSupabase,
  consultorioId: string,
  zonaHoraria: string,
  hoy: string,
): Promise<DatosTablero> {
  const inicioHoy = inicioDelDia(hoy, zonaHoraria);
  const inicioManana = inicioDelDiaSiguiente(hoy, zonaHoraria);
  const ahora = new Date().toISOString();
  const diasHabiles = ultimosDiasHabiles(hoy, 5);
  const inicioSerie = inicioDelDia(diasHabiles[0], zonaHoraria);

  const [pacientes, turnosHoy, atendidosHoy, pendientes, controles, proximoTurno, turnoEnCurso, evolucionesRecientes, actividad] =
    await Promise.all([
      contarPacientes(cliente, consultorioId),
      cliente
        .from("turnos")
        .select("id", { count: "exact", head: true })
        .eq("consultorio_id", consultorioId)
        .neq("estado", "cancelado")
        .gte("inicio", inicioHoy.toISOString())
        .lt("inicio", inicioManana.toISOString()),
      cliente
        .from("turnos")
        .select("id", { count: "exact", head: true })
        .eq("consultorio_id", consultorioId)
        .eq("estado", "completado")
        .gte("inicio", inicioHoy.toISOString())
        .lt("inicio", inicioManana.toISOString()),
      cliente
        .from("turnos")
        .select("id", { count: "exact", head: true })
        .eq("consultorio_id", consultorioId)
        .in("estado", ["programado", "confirmado"])
        .lt("fin", ahora),
      cliente
        .from("turnos")
        .select("id", { count: "exact", head: true })
        .eq("consultorio_id", consultorioId)
        .eq("tipo", "control")
        .in("estado", ["programado", "confirmado"])
        .gte("inicio", ahora),
      obtenerProximoTurno(cliente, consultorioId),
      obtenerTurnoEnCurso(cliente, consultorioId),
      listarEvolucionesRecientes(cliente, consultorioId, 5),
      cliente
        .from("turnos")
        .select("inicio, estado")
        .eq("consultorio_id", consultorioId)
        .neq("estado", "cancelado")
        .gte("inicio", inicioSerie.toISOString())
        .lt("inicio", inicioManana.toISOString()),
    ]);

  const error =
    turnosHoy.error ?? atendidosHoy.error ?? pendientes.error ?? controles.error ?? actividad.error;
  if (error) {
    registrarError("metricas_consultorio", error);
    throw new Error("No se pudieron calcular las métricas del consultorio.");
  }

  const conteoPorDia = new Map(diasHabiles.map((fecha) => [fecha, 0]));
  for (const turno of actividad.data ?? []) {
    const fecha = fechaEnZona(new Date(turno.inicio), zonaHoraria);
    if (conteoPorDia.has(fecha)) conteoPorDia.set(fecha, (conteoPorDia.get(fecha) ?? 0) + 1);
  }

  return {
    metricas: {
      pacientesTotales: pacientes.total,
      pacientesActivos: pacientes.activos,
      turnosHoy: turnosHoy.count ?? 0,
      atendidosHoy: atendidosHoy.count ?? 0,
      consultasPendientes: pendientes.count ?? 0,
      proximosControles: controles.count ?? 0,
    },
    proximoTurno,
    turnoEnCurso,
    evolucionesRecientes,
    actividadHabil: diasHabiles.map((fecha) => ({ fecha, cantidad: conteoPorDia.get(fecha) ?? 0 })),
  };
}
