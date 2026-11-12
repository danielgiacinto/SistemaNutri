"use client";

import { useId, useMemo, useState } from "react";
import { ArrowLeftRight, Banknote, ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight, CreditCard, Smartphone, Wallet } from "lucide-react";
import { fechaEnZona, nombreMes } from "@/lib/fechas";
import { resumirMediosPago } from "@/lib/medios-pago";
import { dineroFinanzas, type DatosFinanzas } from "@/tipos/finanzas";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utilidades";

const formatoPorcentaje = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 1 });

function presentarPorcentaje(porcentaje: number) {
  return porcentaje > 0 && porcentaje < 0.1 ? "< 0,1 %" : formatoPorcentaje.format(porcentaje / 100);
}

function presentacionMedio(medio: string) {
  const nombre = medio.toLocaleLowerCase("es-AR");
  if (nombre === "efectivo") return { icono: Banknote, barra: "bg-chart-1", texto: "text-chart-1" };
  if (nombre === "transferencia") return { icono: ArrowLeftRight, barra: "bg-chart-2", texto: "text-chart-2" };
  if (nombre.includes("débito")) return { icono: CreditCard, barra: "bg-chart-3", texto: "text-chart-3" };
  if (nombre.includes("crédito")) return { icono: CreditCard, barra: "bg-chart-4", texto: "text-chart-4" };
  if (nombre.includes("billetera")) return { icono: Smartphone, barra: "bg-chart-5", texto: "text-chart-5" };
  return { icono: Wallet, barra: "bg-muted-foreground", texto: "text-muted-foreground" };
}

function desplazarMes(mes: string, cantidad: number) {
  const [anio, numeroMes] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, numeroMes - 1 + cantidad, 1)).toISOString().slice(0, 7);
}

export function GraficoMediosPago({ datos, zona, mesSeleccionado }: { datos: DatosFinanzas; zona: string; mesSeleccionado?: string }) {
  const tituloId = useId();
  const mesActual = fechaEnZona(new Date(datos.ahora), zona).slice(0, 7);
  const [mesInterno, fijarMes] = useState(mesActual);
  const mes = mesSeleccionado ?? mesInterno;
  const resumenes = useMemo(() => resumirMediosPago(datos, zona, datos.ahora), [datos, zona]);
  const primerMes = resumenes[0]?.mes ?? mesActual;
  const resumen = resumenes.find(fila => fila.mes === mes);

  return <section aria-labelledby={tituloId} className="@container/medios min-w-0 overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><ChartNoAxesColumnIncreasing className="size-5" aria-hidden="true" /></span>
        <div><h2 id={tituloId} className="font-semibold">Cómo te pagaron</h2><p className="mt-0.5 text-xs text-muted-foreground">Tus ingresos, por medio de pago.</p></div>
      </div>
      {!mesSeleccionado && <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1" role="group" aria-label="Mes de los medios de pago">
        <Button variant="ghost" size="icon-sm" aria-label="Mes anterior de medios de pago" disabled={mes <= primerMes} onClick={() => fijarMes(actual => desplazarMes(actual, -1))}><ChevronLeft aria-hidden="true" /></Button>
        <span className="min-w-36 px-1 text-center text-xs font-medium" aria-live="polite">{nombreMes(`${mes}-01`)}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Mes siguiente de medios de pago" disabled={mes >= mesActual} onClick={() => fijarMes(actual => desplazarMes(actual, 1))}><ChevronRight aria-hidden="true" /></Button>
      </div>}
    </header>

    <div className="min-w-0 p-5 sm:p-6">
      {resumen ? <ul aria-label={`Ingresos por medio de pago en ${nombreMes(`${mes}-01`)}`} className="grid min-w-0 gap-5 @min-[700px]/medios:grid-cols-2">
        {resumen.medios.map(fila => {
          const { icono: Icono, barra, texto } = presentacionMedio(fila.medio);
          return <li key={fila.medio} className="min-w-0">
            <div className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60", texto)}><Icono className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0"><p className="text-sm font-medium wrap-anywhere">{fila.medio}</p><p className="text-xs text-muted-foreground">{fila.cantidad} {fila.cantidad === 1 ? "ingreso" : "ingresos"}</p></div>
              </div>
              <div className="min-w-0 text-right tabular-nums"><p className="text-sm font-semibold wrap-anywhere">{dineroFinanzas(fila.importe, "ARS")}</p><p className="text-xs text-muted-foreground">{presentarPorcentaje(fila.porcentaje)} del total</p></div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className={cn("h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500", barra)} style={{ width: `${fila.porcentaje}%` }} /></div>
          </li>;
        })}
      </ul> : <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center">
        <Wallet className="size-7 text-muted-foreground" aria-hidden="true" />
        <div><p className="text-sm font-medium">Todavía no hay ingresos en este mes</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Cuando registres un cobro o ingreso, vas a ver acá cómo te pagaron.</p></div>
      </div>}
    </div>

    <p className="border-t border-border/70 px-5 py-3 text-xs leading-relaxed text-muted-foreground sm:px-6">Incluye cobros y otros ingresos en pesos. Las devoluciones se muestran en Egresos.</p>
  </section>;
}
