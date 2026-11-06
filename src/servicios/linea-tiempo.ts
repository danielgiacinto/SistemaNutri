import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { listarEvoluciones } from "@/servicios/evoluciones";

export type TipoEventoLinea = "evolucion";

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
  const evoluciones = await listarEvoluciones(cliente, consultorioId, pacienteId);

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

  return eventos.sort((a, b) => (a.instante < b.instante ? 1 : a.instante > b.instante ? -1 : 0));
}
