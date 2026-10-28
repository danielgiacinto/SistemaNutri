import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { listarEvoluciones } from "@/servicios/evoluciones";
import { listarMediciones } from "@/servicios/mediciones";
import { listarObjetivos } from "@/servicios/objetivos";
import { listarTurnosDelPaciente } from "@/servicios/turnos";

export type TipoEventoLinea = "evolucion" | "medicion" | "objetivo" | "turno" | "plan";

export type EventoLineaTiempo = {
  id: string;
  tipo: TipoEventoLinea;
  instante: string;
  titulo: string;
  resumen: string;
  href?: string;
  destacado?: string;
};

export async function obtenerLineaDeTiempo(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<EventoLineaTiempo[]> {
  const [evoluciones, mediciones, objetivos, turnos, publicaciones] = await Promise.all([
    listarEvoluciones(cliente, consultorioId, pacienteId),
    listarMediciones(cliente, consultorioId, pacienteId),
    listarObjetivos(cliente, consultorioId, pacienteId),
    listarTurnosDelPaciente(cliente, consultorioId, pacienteId),
    listarPublicacionesDelPaciente(cliente, consultorioId, pacienteId),
  ]);

  const eventos: EventoLineaTiempo[] = [];

  for (const evolucion of evoluciones) {
    eventos.push({
      id: `evolucion-${evolucion.id}`,
      tipo: "evolucion",
      instante: evolucion.creado_en,
      titulo: evolucion.titulo || (evolucion.es_borrador ? "Borrador de evolución" : "Evolución clínica"),
      resumen: evolucion.contenido.slice(0, 180),
      href: `/panel/pacientes/${pacienteId}/historia/${evolucion.id}`,
      destacado: evolucion.es_borrador ? "Borrador" : evolucion.visible_para_paciente ? "Compartida" : "Privada",
    });
  }

  for (const medicion of mediciones) {
    const partes = [
      medicion.peso_kg != null ? `${medicion.peso_kg} kg` : null,
      medicion.talla_cm != null ? `${medicion.talla_cm} cm` : null,
    ].filter(Boolean);
    eventos.push({
      id: `medicion-${medicion.id}`,
      tipo: "medicion",
      instante: medicion.registrado_en,
      titulo: "Medición antropométrica",
      resumen: partes.join(" · ") || "Registro de composición corporal",
      href: `/panel/pacientes/${pacienteId}/mediciones`,
    });
  }

  for (const objetivo of objetivos) {
    eventos.push({
      id: `objetivo-${objetivo.id}`,
      tipo: "objetivo",
      instante: objetivo.creado_en,
      titulo: objetivo.titulo,
      resumen: objetivo.descripcion?.slice(0, 180) || "Objetivo nutricional",
      href: `/panel/pacientes/${pacienteId}/objetivos`,
      destacado: objetivo.estado,
    });
  }

  for (const turno of turnos) {
    eventos.push({
      id: `turno-${turno.id}`,
      tipo: "turno",
      instante: turno.inicio,
      titulo: "Turno",
      resumen: turno.motivo || turno.tipo.replaceAll("_", " "),
      href: `/panel/agenda/${turno.id}`,
      destacado: turno.estado,
    });
  }

  for (const publicacion of publicaciones) {
    eventos.push({
      id: `plan-${publicacion.id}`,
      tipo: "plan",
      instante: publicacion.publicada_en,
      titulo: publicacion.titulo,
      resumen: `Versión ${publicacion.numero} publicada para el paciente`,
      href: `/panel/pacientes/${pacienteId}/planes/${publicacion.plan_id}`,
      destacado: "Publicado",
    });
  }

  return eventos.sort((a, b) => (a.instante < b.instante ? 1 : a.instante > b.instante ? -1 : 0));
}

async function listarPublicacionesDelPaciente(cliente: ClienteSupabase, consultorioId: string, pacienteId: string) {
  const { data, error } = await cliente
    .from("planes_publicaciones")
    .select("id, plan_id, titulo, numero, publicada_en")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId);

  if (error) throw new Error("No se pudieron cargar los planes de la historia.");
  return data;
}
