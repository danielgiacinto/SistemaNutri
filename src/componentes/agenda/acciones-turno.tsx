"use client";

import { useTransition } from "react";
import { Check, CheckCircle2, ClipboardCheck, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoTurno, marcarTurnoCancelado } from "@/acciones/turnos";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import type { EstadoTurno } from "@/configuracion/clinica";

export function AccionesTurno({ turnoId, estado }: { turnoId: string; estado: EstadoTurno }) {
  const [pendiente, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje?: string }>, exito?: string) {
    iniciar(async () => {
      const resultado = await accion();
      if (!resultado.ok) toast.error(resultado.mensaje);
      else toast.success(exito ?? resultado.mensaje);
    });
  }

  if (estado === "cancelado" || estado === "completado") return null;

  return (
    <Card size="sm" className="gap-3">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ClipboardCheck className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <CardTitle>Estado del turno</CardTitle>
          <CardDescription>Actualizá la asistencia o cancelá la consulta.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div role="group" aria-label="Acciones para el turno" className="flex flex-wrap gap-2">
          {estado === "programado" && (
            <Button type="button" variant="outline" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoTurno(turnoId, "confirmado"), "Turno confirmado.")}>
              <Check aria-hidden="true" />
              Confirmar
            </Button>
          )}
          {(estado === "programado" || estado === "confirmado") && (
            <>
              <Button type="button" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoTurno(turnoId, "completado"), "Consulta marcada como completada.")}>
                <CheckCircle2 aria-hidden="true" />
                Completar
              </Button>
              <Button type="button" variant="outline" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoTurno(turnoId, "ausente"), "Paciente marcado como ausente.")}>
                <UserX aria-hidden="true" />
                Ausente
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={pendiente}
            onClick={() => ejecutar(() => marcarTurnoCancelado({ turnoId, motivoCancelacion: "" }), "Turno cancelado.")}
          >
            <X aria-hidden="true" />
            Cancelar turno
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
