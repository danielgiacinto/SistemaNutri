import { ArrowDownLeft, ArrowUpRight, Clock3, Wallet } from "lucide-react";
import { dineroFinanzas } from "@/tipos/finanzas";
import { cn } from "@/lib/utilidades";

export function IndicadoresFinanzas({ ingresos, deuda, egresos, neto }: { ingresos: number; deuda: number; egresos: number; neto: number }) {
  const indicadores = [
    { titulo: "Ingresos", importe: ingresos, detalle: "Cobros y otros ingresos del mes", icono: ArrowDownLeft, color: "text-exito" },
    { titulo: "Egresos", importe: egresos, detalle: "Gastos y devoluciones del mes", icono: ArrowUpRight, color: "text-muted-foreground" },
    { titulo: "Neto del mes", importe: neto, detalle: "Ingresos menos egresos", icono: Wallet, color: "text-primary" },
    { titulo: "Pendiente de cobro", importe: deuda, detalle: "Consultas atendidas · Todas las fechas", icono: Clock3, color: "text-advertencia" },
  ];

  return <section aria-label="Resumen económico del consultorio">
    <dl className="grid min-w-0 gap-3 sm:grid-cols-2 @min-[760px]/finanzas:grid-cols-4">
      {indicadores.map(({ titulo, importe, detalle, icono: Icono, color }) => <div key={titulo} className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icono className={cn("size-4 shrink-0", color)} aria-hidden="true" />{titulo}</dt>
        <dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums wrap-anywhere">{dineroFinanzas(importe, "ARS")}</dd>
        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalle}</dd>
      </div>)}
    </dl>
  </section>;
}
