import { Badge } from "@/componentes/ui/badge";
import {
  ETIQUETAS_ESTADO_OBJETIVO,
  ETIQUETAS_ESTADO_PACIENTE,
  ETIQUETAS_ESTADO_TURNO,
  type EstadoObjetivo,
  type EstadoPaciente,
  type EstadoTurno,
} from "@/configuracion/clinica";

const VARIANTE_TURNO: Record<EstadoTurno, "default" | "secondary" | "destructive" | "outline"> = {
  programado: "outline",
  confirmado: "default",
  completado: "secondary",
  cancelado: "destructive",
  ausente: "destructive",
};

export function InsigniaTurno({ estado }: { estado: EstadoTurno }) {
  return <Badge variant={VARIANTE_TURNO[estado]}>{ETIQUETAS_ESTADO_TURNO[estado]}</Badge>;
}

export function InsigniaPaciente({ estado }: { estado: EstadoPaciente }) {
  return <Badge variant={estado === "activo" ? "default" : "secondary"}>{ETIQUETAS_ESTADO_PACIENTE[estado]}</Badge>;
}

export function InsigniaObjetivo({ estado }: { estado: EstadoObjetivo }) {
  return (
    <Badge variant={estado === "completado" ? "default" : estado === "cancelado" ? "secondary" : "outline"}>
      {ETIQUETAS_ESTADO_OBJETIVO[estado]}
    </Badge>
  );
}
