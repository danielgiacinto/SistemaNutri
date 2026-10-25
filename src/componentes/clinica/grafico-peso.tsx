"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatearFechaIso } from "@/lib/fechas";

export type PuntoPeso = {
  fecha: string;
  peso: number;
};

export function GraficoPeso({ puntos, pesoObjetivo }: { puntos: PuntoPeso[]; pesoObjetivo?: number | null }) {
  const datos = puntos.map((punto) => ({
    ...punto,
    etiqueta: formatearFechaIso(punto.fecha, "short"),
  }));
  const valores = datos.map((punto) => punto.peso);
  const minimo = Math.min(...valores, pesoObjetivo ?? Infinity) - 1;
  const maximo = Math.max(...valores, pesoObjetivo ?? -Infinity) + 1;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <YAxis
            domain={[Math.floor(minimo), Math.ceil(maximo)]}
            unit=" kg"
            tick={{ fontSize: 12 }}
            stroke="var(--color-muted-foreground)"
            width={56}
          />
          <Tooltip
            formatter={(valor) => [`${valor ?? ""} kg`, "Peso"]}
            labelFormatter={(_, payload) => (payload?.[0]?.payload?.fecha ? formatearFechaIso(payload[0].payload.fecha) : "")}
          />
          {pesoObjetivo != null && (
            <ReferenceLine y={pesoObjetivo} stroke="var(--color-chart-2)" strokeDasharray="4 4" label={{ value: "Objetivo", fill: "var(--color-muted-foreground)", fontSize: 12 }} />
          )}
          <Line type="monotone" dataKey="peso" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 4 }} name="Peso" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
