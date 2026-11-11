import { ArrowDownLeft, ArrowUpRight, Clock3, Wallet } from "lucide-react";
import { nombreMes } from "@/lib/fechas";
import { dineroFinanzas } from "@/tipos/finanzas";
import { cn } from "@/lib/utilidades";

export function IndicadoresFinanzas({ ingresos, deuda, egresos, mes }: { ingresos: number; deuda: number; egresos: number; mes: string }) {
  const indicadores = [
    { titulo: "Ingresos del mes", importe: ingresos, detalle: "Dinero recibido en el mes", icono: ArrowDownLeft, fondo: "border-exito/15 bg-exito/5", color: "bg-exito/10 text-exito" },
    { titulo: "Deuda de consultas atendidas", importe: deuda, detalle: "Saldo pendiente acumulado", icono: Clock3, fondo: "border-advertencia/15 bg-advertencia/5", color: "bg-advertencia/10 text-advertencia" },
    { titulo: "Egresos del mes", importe: egresos, detalle: "Gastos y devoluciones del mes", icono: ArrowUpRight, fondo: "border-border bg-muted/25", color: "bg-muted text-muted-foreground" },
  ];

  return <section aria-label="Resumen económico del consultorio" className="@container/resumen min-w-0 overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Wallet className="size-5" aria-hidden="true" /></span>
        <div><h2 className="font-semibold">Tu consultorio en números</h2><p className="mt-0.5 text-xs text-muted-foreground">Ingresos, pendientes y salidas de dinero.</p></div>
      </div>
      <span className="rounded-xl border bg-muted/30 px-3 py-2 text-xs font-medium">{nombreMes(`${mes}-01`)}</span>
    </header>
    <dl className="grid min-w-0 gap-3 p-5 sm:p-6 @min-[640px]/resumen:grid-cols-3">
      {indicadores.map(({ titulo, importe, detalle, icono: Icono, fondo, color }) => <div key={titulo} className={cn("min-w-0 rounded-2xl border p-4", fondo)}>
        <dt className="flex min-w-0 items-center gap-2.5 text-xs font-medium text-muted-foreground @min-[640px]/resumen:min-h-10">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", color)}><Icono className="size-4" aria-hidden="true" /></span><span>{titulo}</span>
        </dt>
        <dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums wrap-anywhere">{dineroFinanzas(importe, "ARS")}</dd>
        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalle}</dd>
      </div>)}
    </dl>
  </section>;
}
