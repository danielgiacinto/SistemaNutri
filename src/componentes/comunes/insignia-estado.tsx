import { CalendarClock, CalendarCheck, CircleCheck, CircleX, UserX, Clock3, CircleDollarSign, Wallet, Gift, CircleHelp, Undo2, Eye, LockKeyhole, FilePenLine, Target, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utilidades";
import { Badge } from "@/componentes/ui/badge";
import {
  ETIQUETAS_ESTADO_OBJETIVO,
  ETIQUETAS_ESTADO_PACIENTE,
  ETIQUETAS_ESTADO_TURNO,
  type EstadoObjetivo,
  type EstadoPaciente,
  type EstadoTurno,
} from "@/configuracion/clinica";

type Tono = "positivo" | "pendiente" | "informativo" | "negativo" | "neutro";
const TONOS: Record<Tono, string> = {
  positivo: "border-exito/25 bg-exito/10 text-exito",
  pendiente: "border-advertencia/30 bg-advertencia/10 text-advertencia-foreground dark:text-advertencia",
  informativo: "border-primary/25 bg-primary/10 text-primary",
  negativo: "border-destructive/25 bg-destructive/10 text-destructive",
  neutro: "border-border bg-muted/40 text-muted-foreground",
};

function InsigniaVisual({ tono, icono: Icono, children }: { tono: Tono; icono: LucideIcon; children: ReactNode }) {
  return <Badge variant="outline" className={cn("h-auto min-h-6 gap-1.5 px-2 py-0.5", TONOS[tono])}><Icono aria-hidden="true" />{children}</Badge>;
}

const ESTADOS_TURNO: Record<EstadoTurno, { tono: Tono; icono: LucideIcon }> = {
  programado: { tono: "informativo", icono: CalendarClock },
  confirmado: { tono: "positivo", icono: CalendarCheck },
  completado: { tono: "positivo", icono: CircleCheck },
  cancelado: { tono: "neutro", icono: CircleX },
  ausente: { tono: "negativo", icono: UserX },
};

export function InsigniaTurno({ estado }: { estado: EstadoTurno }) {
  return <InsigniaVisual {...ESTADOS_TURNO[estado]}>{ETIQUETAS_ESTADO_TURNO[estado]}</InsigniaVisual>;
}

export function InsigniaCobro({ estado }: { estado: string }) {
  const estilos: Record<string, { tono: Tono; icono: LucideIcon }> = {
    Pagado: { tono: "positivo", icono: CircleCheck },
    "Pagado anticipadamente": { tono: "positivo", icono: CalendarCheck },
    Pendiente: { tono: "pendiente", icono: Clock3 },
    "Pago parcial": { tono: "pendiente", icono: CircleDollarSign },
    "Anticipo por resolver": { tono: "pendiente", icono: Undo2 },
    "Sin cargo": { tono: "informativo", icono: Gift },
    Bonificado: { tono: "informativo", icono: Gift },
    "Sin deuda exigible": { tono: "neutro", icono: Wallet },
  };
  return <InsigniaVisual {...(estilos[estado] ?? { tono: "neutro", icono: CircleHelp })}>{estado}</InsigniaVisual>;
}

export function InsigniaVisibilidad({ visible, etiqueta }: { visible: boolean; etiqueta?: string }) {
  return <InsigniaVisual tono={visible ? "informativo" : "neutro"} icono={visible ? Eye : LockKeyhole}>{etiqueta ?? (visible ? "Visible en el portal" : "Privado")}</InsigniaVisual>;
}

export function InsigniaEvolucion({ estado }: { estado: string }) {
  if (estado === "Borrador") return <InsigniaVisual tono="pendiente" icono={FilePenLine}>Borrador</InsigniaVisual>;
  return <InsigniaVisibilidad visible={estado === "Compartida"} etiqueta={estado} />;
}

export function InsigniaPago({ estado, etiqueta }: { estado: string; etiqueta: string }) {
  const tono: Tono = estado === "aprobado" ? "positivo" : estado === "rechazado" ? "negativo" : estado === "pendiente" ? "pendiente" : "neutro";
  const icono = estado === "aprobado" ? CircleCheck : estado === "rechazado" ? CircleX : estado === "devuelto" ? Undo2 : Clock3;
  return <InsigniaVisual tono={tono} icono={icono}>{etiqueta}</InsigniaVisual>;
}

export function InsigniaPaciente({ estado }: { estado: EstadoPaciente }) {
  return <Badge variant={estado === "activo" ? "default" : "secondary"}>{ETIQUETAS_ESTADO_PACIENTE[estado]}</Badge>;
}

export function InsigniaObjetivo({ estado }: { estado: EstadoObjetivo }) {
  const tono: Tono = estado === "completado" ? "positivo" : estado === "cancelado" ? "neutro" : estado === "en_progreso" ? "informativo" : "pendiente";
  const icono = estado === "completado" ? CircleCheck : estado === "cancelado" ? CircleX : estado === "en_progreso" ? TrendingUp : Target;
  return <InsigniaVisual tono={tono} icono={icono}>{ETIQUETAS_ESTADO_OBJETIVO[estado]}</InsigniaVisual>;
}
