import { formatearFechaIso } from "@/lib/fechas";
import type { resumirCaja } from "@/lib/caja-consultorio";
import { dineroFinanzas } from "@/tipos/finanzas";

const dinero = (importe: number) => dineroFinanzas(importe, "ARS");
type Resumen = ReturnType<typeof resumirCaja>;

export function TableroCaja({ resumen }: { resumen: Resumen }) {
  const mayorDia = Math.max(...resumen.dias.map(dia => dia.importe), 1);
  const variacion = resumen.importeAnterior > 0 ? (resumen.cobrado / resumen.importeAnterior - 1) * 100 : null;

  return <details className="min-w-0 overflow-hidden rounded-2xl border bg-card">
    <summary className="cursor-pointer px-5 py-4 text-sm font-medium">Detalle de ingresos de consultas</summary>
    <div className="space-y-5 border-t p-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {[{ titulo: "Cobrado de consultas", valor: dinero(resumen.cobrado) }, { titulo: "Consultas con cobros", valor: String(resumen.consultas) }, { titulo: "Promedio por consulta", valor: resumen.promedio === null ? "—" : dinero(resumen.promedio) }].map(({ titulo, valor }) => <div key={titulo}><dt className="text-xs text-muted-foreground">{titulo}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{valor}</dd></div>)}
      </dl>
      <p className="text-xs text-muted-foreground">{variacion === null ? "Sin cobros en el período anterior." : `${variacion >= 0 ? "+" : ""}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(variacion)} % respecto del mes anterior${resumen.comparacionParcial ? " a igual día y hora" : " completo"}.`} Incluye pagos parciales y anticipos.</p>
      <div>
        <h3 className="mb-3 text-sm font-medium">Cobros día por día</h3>
        <ol className="flex h-16 items-end gap-1" aria-label="Importes cobrados por día">
          {resumen.dias.map(dia => <li key={dia.fecha} title={`${formatearFechaIso(dia.fecha)}: ${dinero(dia.importe)}`} className="flex h-full min-w-0 flex-1 items-end"><span className="w-full rounded-t-sm bg-primary/75" style={{ height: `${Math.max(dia.importe > 0 ? 5 : 2, dia.importe / mayorDia * 100)}%` }} aria-hidden="true" /><span className="sr-only">{formatearFechaIso(dia.fecha)}: {dinero(dia.importe)}</span></li>)}
        </ol>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>1</span><span>{resumen.dias.length}</span></div>
      </div>
      <section aria-label="Ingresos por servicio" className="border-t pt-4">
        <h3 className="text-sm font-medium">Por servicio</h3>
        {resumen.servicios.length ? <ul className="mt-3 space-y-3">{resumen.servicios.map(servicio => <li key={servicio.nombre} className="flex flex-wrap items-start justify-between gap-2 text-sm"><div className="min-w-0"><p className="wrap-anywhere">{servicio.nombre}</p><p className="mt-1 text-xs text-muted-foreground">{servicio.cantidad} {servicio.cantidad === 1 ? "consulta" : "consultas"} con cobros</p></div><span className="font-semibold tabular-nums">{dinero(servicio.importe)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Todavía no hay cobros de consultas en este mes.</p>}
      </section>
    </div>
  </details>;
}
