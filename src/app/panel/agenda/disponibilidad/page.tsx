import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarBloqueos, listarHorarios } from "@/servicios/agenda";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioHorario } from "@/componentes/agenda/formulario-horario";
import { FormularioBloqueo } from "@/componentes/agenda/formulario-bloqueo";
import { BotonEliminarBloqueo, BotonEliminarHorario } from "@/componentes/agenda/boton-eliminar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { DIAS_SEMANA } from "@/configuracion/clinica";
import { formatearFechaHora, hoyEnZona, inicioDelDia } from "@/lib/fechas";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Disponibilidad" };

export default function PaginaDisponibilidad() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const hoy = hoyEnZona(contexto.consultorio.zonaHoraria);
  const [horarios, bloqueos] = await Promise.all([
    listarHorarios(cliente, contexto.consultorio.id),
    listarBloqueos(cliente, contexto.consultorio.id, inicioDelDia(hoy, contexto.consultorio.zonaHoraria)),
  ]);

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Horarios y bloqueos"
        descripcion="Si no cargás horarios, se puede agendar en cualquier momento. Cuando hay al menos uno, las reservas tienen que encajar en una franja."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horarios de atención</CardTitle>
            <CardDescription>Hora local del consultorio ({contexto.consultorio.zonaHoraria}).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {horarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay franjas. La agenda no restringe el horario.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {horarios.map((horario) => (
                  <li key={horario.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      {DIAS_SEMANA.find((dia) => dia.iso === horario.dia_semana)?.etiqueta} {horario.hora_inicio.slice(0, 5)} –{" "}
                      {horario.hora_fin.slice(0, 5)}
                    </span>
                    <BotonEliminarHorario id={horario.id} />
                  </li>
                ))}
              </ul>
            )}
            <FormularioHorario />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bloqueos</CardTitle>
            <CardDescription>Vacaciones, reuniones u otros intervalos no reservables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bloqueos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay bloqueos vigentes.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {bloqueos.map((bloqueo) => (
                  <li key={bloqueo.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      {formatearFechaHora(new Date(bloqueo.inicio), contexto.consultorio.zonaHoraria)} –{" "}
                      {formatearFechaHora(new Date(bloqueo.fin), contexto.consultorio.zonaHoraria)}
                      {bloqueo.motivo ? ` · ${bloqueo.motivo}` : ""}
                    </span>
                    <BotonEliminarBloqueo id={bloqueo.id} />
                  </li>
                ))}
              </ul>
            )}
            <FormularioBloqueo fechaPredeterminada={hoy} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
