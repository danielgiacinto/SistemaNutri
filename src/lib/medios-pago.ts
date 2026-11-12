import { fechaEnZona } from "@/lib/fechas";
import { CONFIGURACION_FINANCIERA_INICIAL, movimientosEfectivos, type DatosFinanzas } from "@/tipos/finanzas";

export type IngresosPorMedio = {
  medio: string;
  importe: number;
  cantidad: number;
  porcentaje: number;
};

export type ResumenMediosPago = {
  mes: string;
  importe: number;
  cantidad: number;
  medios: IngresosPorMedio[];
};

type AcumuladoMedio = { medio: string; centavos: number; cantidad: number };

/** Ingresos brutos efectivos en ARS, por fecha local de cobro. Los egresos se muestran aparte. */
export function resumirMediosPago(datos: DatosFinanzas, zona: string, hasta?: string): ResumenMediosPago[] {
  const limite = hasta ? new Date(hasta).getTime() : null;
  const limpiar = (texto: string) => texto.trim().replace(/\s+/g, " ");
  const nombres = new Map((datos.configuracion?.medios ?? CONFIGURACION_FINANCIERA_INICIAL.medios)
    .map(medio => [limpiar(medio).toLocaleLowerCase("es-AR"), limpiar(medio)]));
  const meses = new Map<string, Map<string, AcumuladoMedio>>();

  // Resolver correcciones sobre el historial completo antes de separar los meses.
  for (const movimiento of movimientosEfectivos(datos)) {
    if (movimiento.moneda !== "ARS" || movimiento.tipo !== "ingreso" || (limite !== null && new Date(movimiento.fecha).getTime() > limite)) continue;
    const mes = fechaEnZona(new Date(movimiento.fecha), zona).slice(0, 7);
    const nombre = limpiar(movimiento.medio) || "Sin especificar";
    const clave = nombre.toLocaleLowerCase("es-AR");
    const medios = meses.get(mes) ?? new Map<string, AcumuladoMedio>();
    const acumulado = medios.get(clave) ?? { medio: nombres.get(clave) ?? nombre, centavos: 0, cantidad: 0 };
    acumulado.centavos += Math.round(movimiento.importe * 100);
    acumulado.cantidad += 1;
    medios.set(clave, acumulado);
    meses.set(mes, medios);
  }

  return [...meses].sort(([mesA], [mesB]) => mesA.localeCompare(mesB)).map(([mes, medios]) => {
    const filas = [...medios.values()].sort((a, b) => b.centavos - a.centavos || a.medio.localeCompare(b.medio, "es-AR"));
    const centavos = filas.reduce((suma, medio) => suma + medio.centavos, 0);
    return {
      mes,
      importe: centavos / 100,
      cantidad: filas.reduce((suma, medio) => suma + medio.cantidad, 0),
      medios: filas.map(fila => ({ medio: fila.medio, importe: fila.centavos / 100, cantidad: fila.cantidad, porcentaje: centavos > 0 ? fila.centavos / centavos * 100 : 0 })),
    };
  });
}
