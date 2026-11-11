"use client";

import { ReceiptText } from "lucide-react";
import { formatearFechaHora } from "@/lib/fechas";
import { dineroFinanzas, type DatosFinanzas, type MovimientoConsultorio } from "@/tipos/finanzas";
import { DialogoFinanciero } from "./dialogo-financiero";
import { CobroRapido } from "./cobro-rapido";

export function DetalleMovimiento({ movimiento, datos, zona, efectivo }: { movimiento: MovimientoConsultorio; datos: DatosFinanzas; zona: string; efectivo: boolean }) {
  const pago = datos.pagos.find(pago => pago.id === movimiento.pago_id);
  const operacion = pago ? datos.operaciones.find(operacion => operacion.id === pago.operacion_id) : undefined;
  return <DialogoFinanciero titulo="Detalle del movimiento" descripcion="Historial interno del consultorio. Los registros originales se conservan." boton={<><ReceiptText aria-hidden="true" />Detalle</>}>
    {() => <div className="space-y-5">
      <div className="rounded-2xl border bg-accent/30 p-4"><p className="wrap-anywhere text-sm font-medium">{movimiento.descripcion}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{movimiento.tipo === "ingreso" ? "+" : "−"}{dineroFinanzas(movimiento.importe, movimiento.moneda)}</p><p className="mt-2 text-xs text-muted-foreground">{efectivo ? "Movimiento efectivo: incluido en los totales de su período." : "Corrección: se conserva en el historial y no suma a los totales."}</p></div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">{[{ nombre: "Fecha efectiva", valor: formatearFechaHora(new Date(movimiento.fecha), zona) }, { nombre: "Medio de pago", valor: movimiento.medio }, { nombre: "Categoría", valor: movimiento.categoria }, { nombre: "Paciente", valor: operacion?.paciente ?? "Movimiento manual" }, { nombre: "Servicio histórico", valor: operacion?.servicio_nombre ?? "—" }, { nombre: "Referencia", valor: pago?.referencia || "—" }].map(fila => <div key={fila.nombre}><dt className="text-xs text-muted-foreground">{fila.nombre}</dt><dd className="mt-1 wrap-anywhere">{fila.valor}</dd></div>)}</dl>
      {pago?.revertido_en && <p className="rounded-xl border p-3 text-xs text-muted-foreground">{pago.tipo_reversion === "devolucion" ? "Pago devuelto" : "Pago corregido por error"}: {pago.motivo_reversion || "Revisá el historial del cobro."}</p>}
      {operacion && <CobroRapido turnoId={operacion.turno_id} zona={zona} inicial={datos} mostrarEstado={false} />}
    </div>}
  </DialogoFinanciero>;
}
