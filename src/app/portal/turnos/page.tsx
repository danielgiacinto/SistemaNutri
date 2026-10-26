import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ETIQUETAS_TIPO_CONSULTA } from "@/configuracion/clinica";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearFechaHora } from "@/lib/fechas";
import { listarMisTurnos, obtenerFichaPortal } from "@/servicios/portal";

export const metadata: Metadata = { title: "Mis turnos" };

export default function PaginaTurnosPortal() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Listado />
    </Suspense>
  );
}

async function Listado() {
  await requerirPaciente();
  const cliente = await crearClienteServidor();
  const [ficha, turnos] = await Promise.all([obtenerFichaPortal(cliente), listarMisTurnos(cliente)]);
  const zona = ficha?.zonaHoraria ?? "America/Argentina/Cordoba";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Turnos</h1>
      {turnos.length === 0 ? (
        <EstadoVacio icono={CalendarDays} titulo="Todavía no tenés turnos" descripcion="Cuando te agenden, aparecen acá." />
      ) : (
        <ul className="space-y-3">
          {turnos.map((turno) => (
            <li key={turno.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{formatearFechaHora(new Date(turno.inicio), zona)}</p>
                <InsigniaTurno estado={turno.estado} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {ETIQUETAS_TIPO_CONSULTA[turno.tipo]}
                {turno.motivo ? ` · ${turno.motivo}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
