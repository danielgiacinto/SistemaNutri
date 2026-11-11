"use client";

import { useSearchParams } from "next/navigation";
import { CalendarioAgenda, GrillaHoraria, type PropiedadesCalendario } from "./calendario-agenda";
import { DiaSeleccionadoMes, VistaDiaAgenda } from "./vista-dia-agenda";
import { CobroRapido } from "@/componentes/finanzas/cobro-rapido";
import { filtrarPeriodoAgenda } from "./filtrar-periodo";
import type { VistaAgenda } from "@/configuracion/clinica";

export function AgendaInteractiva({ profesionalId, ...propiedades }: PropiedadesCalendario & { profesionalId: string }) {
  const parametros = useSearchParams();
  const vistaParam = parametros.get("vista");
  const vista = vistaParam === "dia" || vistaParam === "semana" || vistaParam === "mes" ? vistaParam : propiedades.vista;
  const turnos = filtrarPeriodoAgenda(propiedades.turnos, vista, propiedades.fecha, propiedades.zonaHoraria);
  const propios = turnos.filter(turno => turno.profesional_id === profesionalId);
  const mostrarHorarios = parametros.get("detalle") === "horarios";

  function cambiarPresentacion(horarios: boolean) {
    const consulta = new URLSearchParams(parametros.toString());
    consulta.set("vista", "dia");
    consulta.set("fecha", propiedades.fecha);
    if (horarios) consulta.set("detalle", "horarios");
    else consulta.delete("detalle");
    window.history.pushState(null, "", `?${consulta.toString()}`);
  }

  function cambiarVista(siguiente: VistaAgenda) {
    const consulta = new URLSearchParams(parametros.toString());
    consulta.set("vista", siguiente);
    consulta.set("fecha", propiedades.fecha);
    window.history.pushState(null, "", `?${consulta.toString()}`);
  }

  return <>
    <CalendarioAgenda {...propiedades} vista={vista} turnos={turnos} parametros={parametros.toString()} alCambiarVista={cambiarVista} mostrarLeyendaDia={mostrarHorarios}
      contenidoMes={vista === "mes" ? <DiaSeleccionadoMes fecha={propiedades.fecha} zona={propiedades.zonaHoraria} profesionalId={profesionalId} turnos={filtrarPeriodoAgenda(propiedades.turnos,"dia",propiedades.fecha,propiedades.zonaHoraria)} parametros={parametros.toString()}/> : undefined}
      contenidoDia={vista === "dia" ? <VistaDiaAgenda fecha={propiedades.fecha} fechaHoy={propiedades.fechaHoy} zonaHoraria={propiedades.zonaHoraria} profesionalId={profesionalId} turnos={turnos} turnosDelRango={propiedades.turnos} parametros={parametros.toString()} mostrarHorarios={mostrarHorarios} alCambiarPresentacion={cambiarPresentacion}>
        <GrillaHoraria {...propiedades} vista="dia" turnos={turnos} dias={[propiedades.fecha]} parametros={parametros.toString()} />
      </VistaDiaAgenda> : undefined} />
    {vista === "semana" || (vista === "dia" && mostrarHorarios) ? <section className="grid gap-3 rounded-xl border bg-card p-4" aria-label="Cobro rápido de los turnos">
      <h2 className="font-semibold">Cobros de esta agenda</h2>
      {propios.map(turno => <div key={turno.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span>{turno.pacientes?.nombre} {turno.pacientes?.apellido} · {new Date(turno.inicio).toLocaleString("es-AR", { timeZone: propiedades.zonaHoraria })}</span>
        <CobroRapido zona={propiedades.zonaHoraria} turnoId={turno.id} estado={turno.estadoEconomico ?? "Sin configurar"} />
      </div>)}
      {!propios.length && <p className="text-sm text-muted-foreground">Sin turnos en este período.</p>}
    </section> : null}
  </>;
}
