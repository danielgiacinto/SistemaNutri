"use client";

import { useTransition } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { desactivarPaciente, reactivarPaciente } from "@/acciones/pacientes";
import { Button } from "@/componentes/ui/button";

export function AccionesEstadoPaciente({ pacienteId, estado }: { pacienteId: string; estado: "activo" | "inactivo" }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <Button
      type="button"
      variant={estado === "activo" ? "outline" : "default"}
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const resultado = estado === "activo" ? await desactivarPaciente(pacienteId) : await reactivarPaciente(pacienteId);
          if (!resultado.ok) toast.error(resultado.mensaje);
          else toast.success(resultado.mensaje);
        })
      }
    >
      {estado === "activo" ? (
        <>
          <UserMinus aria-hidden="true" />
          Desactivar paciente
        </>
      ) : (
        <>
          <UserPlus aria-hidden="true" />
          Reactivar paciente
        </>
      )}
    </Button>
  );
}
