"use client";

import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, ChartColumn, CircleDollarSign, Clock3, ReceiptText, Tags, Wallet } from "lucide-react";
import { formatearFechaIso, nombreMes } from "@/lib/fechas";
import type { resumirCaja } from "@/lib/caja-consultorio";
import { dineroFinanzas, saldoOperacion, type DatosFinanzas } from "@/tipos/finanzas";
import { Button } from "@/componentes/ui/button";
import { CobroRapido } from "./cobro-rapido";

const dinero = (importe: number) => dineroFinanzas(importe, "ARS");
type Resumen = ReturnType<typeof resumirCaja>;

export function TableroCaja({ resumen, datos, mes, zona, alVerDeuda, children }: { resumen: Resumen; datos: DatosFinanzas; mes: string; zona: string; alVerDeuda: () => void; children: ReactNode }) {
  const mayorDia = Math.max(...resumen.dias.map(dia => dia.importe), 1);
  const variacion = resumen.importeAnterior > 0 ? (resumen.cobrado / resumen.importeAnterior - 1) * 100 : null;
  const indicadores = [
    { nombre: "Cobrado de consultas", valor: dinero(resumen.cobrado), icono: CircleDollarSign, texto: variacion === null ? "Sin cobros en el período anterior" : `${variacion >= 0 ? "+" : ""}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(variacion)} % respecto del período anterior` },
    { nombre: "Consultas con cobros", valor: String(resumen.consultas), icono: ReceiptText, texto: "Turnos distintos; incluye pagos parciales y anticipos." },
    { nombre: "Falta cobrar del mes", valor: dinero(resumen.deudaMes), icono: Clock3, texto: `${resumen.deudasMes.length} ${resumen.deudasMes.length === 1 ? "consulta atendida" : "consultas atendidas"} en este mes con saldo.` },
    { nombre: "Promedio por consulta", valor: resumen.promedio === null ? "—" : dinero(resumen.promedio), icono: ChartColumn, texto: "Cobrado dividido por turnos distintos con cobros." },
  ];

  return <div className="min-w-0 space-y-5">
    <section aria-label={`Caja de ${nombreMes(`${mes}-01`)}`} className="overflow-hidden rounded-2xl border border-primary/25 bg-card">
      <header className="flex items-center gap-3 border-b p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary"><Wallet className="size-5" aria-hidden="true" /></span><div><h2 className="font-semibold">Tu caja, con claridad</h2><p className="mt-1 text-xs text-muted-foreground">{nombreMes(`${mes}-01`)} · Ingresos de consultas en pesos</p></div></header>
      <dl className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
        {indicadores.map(({ nombre, valor, icono: Icono, texto }) => <div key={nombre} className="min-w-0 rounded-2xl border border-primary/10 bg-accent/25 p-4"><dt className="flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><Icono className="size-4 shrink-0 text-primary" aria-hidden="true" />{nombre}</dt><dd className="mt-2 wrap-anywhere text-2xl font-semibold tracking-tight tabular-nums">{valor}</dd><dd className="mt-2 text-xs leading-relaxed text-muted-foreground">{texto}</dd></div>)}
      </dl>
      <div className="border-t px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><h3 className="font-medium">Cobros día por día</h3><span className="text-muted-foreground">Comparación: {resumen.comparacionParcial ? "a igual día y hora del mes anterior" : "mes anterior completo"}</span></div>
        <ol className="flex h-16 items-end gap-1" aria-label="Importes cobrados por día">
          {resumen.dias.map(dia => <li key={dia.fecha} title={`${formatearFechaIso(dia.fecha)}: ${dinero(dia.importe)}`} className="flex h-full min-w-0 flex-1 items-end"><span className="w-full rounded-t-sm bg-primary/75" style={{ height: `${Math.max(dia.importe > 0 ? 5 : 2, dia.importe / mayorDia * 100)}%` }} aria-hidden="true" /><span className="sr-only">{formatearFechaIso(dia.fecha)}: {dinero(dia.importe)}</span></li>)}
        </ol>
        <div className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground"><span>1</span><span>{resumen.dias.length}</span></div>
      </div>
      <dl className="grid gap-4 border-t bg-muted/20 p-5 sm:grid-cols-3">
        {[{ etiqueta: "Ingresos totales", valor: resumen.ingresos, icono: ArrowDownLeft }, { etiqueta: "Egresos y devoluciones", valor: resumen.egresos, icono: ArrowUpRight }, { etiqueta: "Neto de caja", valor: resumen.neto, icono: Wallet }].map(({ etiqueta, valor, icono: Icono }) => <div key={etiqueta}><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icono className="size-3.5" aria-hidden="true" />{etiqueta}</dt><dd className="mt-1 font-semibold tabular-nums">{dinero(valor)}</dd></div>)}
      </dl>
      <p className="border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">Cobrado muestra ingresos brutos efectivos de consultas por fecha de pago; las devoluciones se muestran en egresos. Ingresos totales y neto incluyen movimientos manuales. Las correcciones por error no suman.</p>
    </section>

    {children}
    <div className="grid items-start gap-5 lg:grid-cols-2">
    <section className="rounded-2xl border bg-card p-5" aria-label="Ingresos por servicio">
      <h2 className="flex items-center gap-2 font-semibold"><Tags className="size-4 text-primary" aria-hidden="true" />Qué cobraste</h2><p className="mt-1 text-xs text-muted-foreground">Servicios históricos de las consultas con cobros en el mes.</p>
      {resumen.servicios.length ? <ul className="mt-5 space-y-4">{resumen.servicios.map(servicio => <li key={servicio.nombre}><div className="mb-2 flex flex-wrap items-start justify-between gap-2 text-sm"><div className="min-w-0"><p className="wrap-anywhere font-medium">{servicio.nombre}</p><p className="mt-1 text-xs text-muted-foreground">{servicio.cantidad} {servicio.cantidad === 1 ? "consulta" : "consultas"} con cobros · {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(servicio.porcentaje)} %</p></div><span className="font-semibold tabular-nums">{dinero(servicio.importe)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-chart-2" style={{ width: `${servicio.porcentaje}%` }} /></div></li>)}</ul> : <p className="mt-5 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">Todavía no hay cobros de consultas en este mes.</p>}
    </section>

    <section className="overflow-hidden rounded-2xl border bg-card" aria-label="Consultas atendidas pendientes de cobro">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Falta cobrar</h2><p className="mt-1 text-xs text-muted-foreground">Consultas atendidas en el mes seleccionado, con saldo exigible.</p></div><span className="rounded-xl bg-advertencia/10 px-3 py-2 font-semibold tabular-nums">{dinero(resumen.deudaMes)}</span></header>
      {resumen.deudasMes.length ? <ul className="divide-y">{resumen.deudasMes.map(operacion => <li key={operacion.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="wrap-anywhere text-sm font-medium">{operacion.paciente}</p><p className="mt-1 wrap-anywhere text-xs text-muted-foreground">{operacion.servicio_nombre} · Saldo {dinero(saldoOperacion(operacion))}</p></div><CobroRapido zona={zona} turnoId={operacion.turno_id} inicial={datos} mostrarEstado={false} /></li>)}</ul> : <p className="p-5 text-sm text-muted-foreground">Las consultas atendidas de este mes no tienen saldos pendientes.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 p-5"><p className="text-xs text-muted-foreground">Deuda acumulada de todas las fechas: <span className="font-semibold text-foreground">{dinero(resumen.deudaAcumulada)}</span></p><Button size="sm" variant="outline" onClick={alVerDeuda}>Ver toda la deuda</Button></div>
      {resumen.anticipos.length > 0 && <details className="border-t p-5"><summary className="cursor-pointer text-sm font-medium">Anticipos por resolver · {resumen.anticipos.length}</summary><p className="mt-2 text-xs text-muted-foreground">Turnos cancelados o ausentes con dinero recibido. Se muestran aparte de la deuda.</p><ul className="mt-4 space-y-3">{resumen.anticipos.map(operacion => <li key={operacion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><span className="text-sm">{operacion.paciente} · {dinero(operacion.abonado)}</span><CobroRapido turnoId={operacion.turno_id} zona={zona} inicial={datos} mostrarEstado={false} /></li>)}</ul></details>}
    </section>
    </div>
  </div>;
}
