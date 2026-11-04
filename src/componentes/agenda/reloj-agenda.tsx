"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { horaEnZona, hoyEnZona, minutosDesdeMedianoche } from "@/lib/fechas";

function useHoraAgenda(zona: string, fechaInicial: string, horaInicial: string) {
  const [reloj, establecerReloj] = useState({ fecha: fechaInicial, hora: horaInicial });
  useEffect(() => {
    function actualizar() {
      const ahora = new Date();
      establecerReloj({ fecha: hoyEnZona(zona, ahora), hora: horaEnZona(zona, ahora) });
    }
    actualizar();
    const intervalo = window.setInterval(actualizar, 30_000);
    return () => window.clearInterval(intervalo);
  }, [zona]);
  return reloj;
}

type PropiedadesReloj = { zona: string; fechaInicial: string; horaInicial: string };

export function RelojAgenda(propiedades: PropiedadesReloj) {
  const reloj = useHoraAgenda(propiedades.zona, propiedades.fechaInicial, propiedades.horaInicial);
  return <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs text-accent-foreground"><Clock3 className="size-3.5" aria-hidden="true" /><span className="font-semibold tabular-nums">{reloj.hora}</span><span>Hora del consultorio</span></span>;
}

export function IndicadorHoraAgenda({ dia, inicio, fin, ...propiedades }: PropiedadesReloj & { dia: string; inicio: number; fin: number }) {
  const reloj = useHoraAgenda(propiedades.zona, propiedades.fechaInicial, propiedades.horaInicial);
  const minutos = minutosDesdeMedianoche(reloj.hora);
  if (reloj.fecha !== dia || minutos < inicio || minutos >= fin) return null;
  return (
    <div data-hora-actual className="pointer-events-none absolute right-0 left-0 z-20 border-t-2 border-primary" style={{ top: `${(minutos - inicio) / (fin - inicio) * 100}%` }}>
      <span className="absolute -top-1.5 -left-1 size-2.5 rounded-full bg-primary" />
      <span className="absolute -top-3 left-1 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground shadow-sm">Ahora {reloj.hora}</span>
    </div>
  );
}

export function ContenedorHorarioAgenda({ children, referencia, desplazamientoInicial }: { children: React.ReactNode; referencia: string; desplazamientoInicial: number }) {
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    const animacion = window.requestAnimationFrame(() => { elemento.scrollTop = Math.max(0, desplazamientoInicial - 110); });
    return () => window.cancelAnimationFrame(animacion);
  }, [referencia, desplazamientoInicial]);
  return <div ref={contenedor} tabIndex={0} role="region" aria-label="Horarios de la agenda" className="max-h-[min(42rem,calc(100svh-30rem))] min-h-64 overflow-y-auto overscroll-y-contain rounded-2xl border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-h-[min(42rem,calc(100svh-23rem))]">{children}</div>;
}
