"use client";

import { useSearchParams } from "next/navigation";
import { CalendarioAgenda, type PropiedadesCalendario } from "./calendario-agenda";
import { CobroRapido } from "@/componentes/finanzas/cobro-rapido";
import { filtrarPeriodoAgenda } from "./filtrar-periodo";
import type { VistaAgenda } from "@/configuracion/clinica";

export function AgendaInteractiva({ profesionalId, ...propiedades }: PropiedadesCalendario & { profesionalId: string }) {
  const parametros = useSearchParams();
  const vistaParam = parametros.get("vista");
  const vista = vistaParam === "dia" || vistaParam === "semana" || vistaParam === "mes" ? vistaParam : propiedades.vista;
  const turnos = filtrarPeriodoAgenda(propiedades.turnos, vista, propiedades.fecha, propiedades.zonaHoraria);
  const propios = turnos.filter(turno => turno.profesional_id === profesionalId);

  function cambiarVista(siguiente: VistaAgenda) {
    const consulta = new URLSearchParams(parametros.toString());
    consulta.set("vista", siguiente);
    consulta.set("fecha", propiedades.fecha);
    window.history.pushState(null, "", `?${consulta.toString()}`);
  }

  return <>
    <CalendarioAgenda {...propiedades} vista={vista} turnos={turnos} alCambiarVista={cambiarVista} />
    <section className="grid gap-3 rounded-xl border bg-card p-4" aria-label="Cobro rápido de los turnos">
      <h2 className="font-semibold">Cobros de esta agenda</h2>
      {propios.map(turno => <div key={turno.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span>{turno.pacientes?.nombre} {turno.pacientes?.apellido} · {new Date(turno.inicio).toLocaleString("es-AR", { timeZone: propiedades.zonaHoraria })}</span>
        <CobroRapido zona={propiedades.zonaHoraria} turnoId={turno.id} estado={turno.estadoEconomico ?? "Sin configurar"} />
      </div>)}
      {!propios.length && <p className="text-sm text-muted-foreground">Sin turnos en este período.</p>}
    </section>
  </>;
}
