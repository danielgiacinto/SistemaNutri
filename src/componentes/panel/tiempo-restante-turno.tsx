"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utilidades";

type TiempoRestante = {
  texto: string;
  cercano: boolean;
};

type Props = {
  inicio: string;
  ahoraInicial: string;
  enLinea?: boolean;
};

function calcularTiempoRestante(inicio: string, referencia: string | number): TiempoRestante {
  const diferencia = new Date(inicio).getTime() - new Date(referencia).getTime();

  if (!Number.isFinite(diferencia)) {
    return { texto: "Horario por confirmar", cercano: false };
  }

  if (diferencia <= 0) {
    return { texto: "El turno está comenzando", cercano: true };
  }

  const minutos = Math.ceil(diferencia / 60_000);
  if (minutos < 60) {
    return {
      texto: minutos === 1 ? "Falta 1 min" : `Faltan ${minutos} min`,
      cercano: true,
    };
  }

  if (diferencia < 24 * 60 * 60_000) {
    const horas = Math.floor(diferencia / 3_600_000);
    const minutosRestantes = Math.ceil((diferencia - horas * 3_600_000) / 60_000);
    const detalleMinutos = minutosRestantes > 0 ? ` ${minutosRestantes} min` : "";
    return {
      texto: horas === 1 ? `Falta 1 h${detalleMinutos}` : `Faltan ${horas} h${detalleMinutos}`,
      cercano: false,
    };
  }

  const dias = Math.ceil(diferencia / (24 * 60 * 60_000));
  return {
    texto: dias === 1 ? "Falta 1 día" : `Faltan ${dias} días`,
    cercano: false,
  };
}

export function TiempoRestanteTurno({ inicio, ahoraInicial, enLinea = false }: Props) {
  const [tiempo, setTiempo] = useState(() => calcularTiempoRestante(inicio, ahoraInicial));

  useEffect(() => {
    const actualizar = () => setTiempo(calcularTiempoRestante(inicio, Date.now()));
    actualizar();

    const intervalo = window.setInterval(actualizar, 15_000);
    return () => window.clearInterval(intervalo);
  }, [inicio]);

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        enLinea ? "mt-0" : "mt-2 lg:mt-0",
        tiempo.cercano
          ? "border-advertencia/30 bg-advertencia/15 text-advertencia-foreground"
          : "border-primary/20 bg-primary/10 text-primary",
      )}
    >
      <Clock3 className="size-3.5" aria-hidden="true" />
      <span>{tiempo.texto}</span>
    </p>
  );
}
