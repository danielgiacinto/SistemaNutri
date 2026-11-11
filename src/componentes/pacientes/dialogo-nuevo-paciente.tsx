"use client";

import { useState } from "react";
import { Dialog as DialogoPrimitivo } from "radix-ui";
import { UserPlus } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/componentes/ui/dialog";
import { FormularioPaciente } from "./formulario-paciente";

export function DialogoNuevoPaciente({ variante = "default", etiqueta = "Nuevo paciente", abrirInicial = false }: {
  variante?: "default" | "outline"; etiqueta?: string; abrirInicial?: boolean;
}) {
  const [abierto, fijarAbierto] = useState(abrirInicial);
  const [pendiente, fijarPendiente] = useState(false);

  function cambiarAbierto(valor: boolean) {
    if (pendiente) return;
    fijarAbierto(valor);
    if (!valor && abrirInicial) {
      const direccion = new URL(window.location.href);
      direccion.searchParams.delete("crear");
      window.history.replaceState(null, "", `${direccion.pathname}${direccion.search}`);
    }
  }

  return <Dialog open={abierto} onOpenChange={cambiarAbierto}>
    <DialogoPrimitivo.Trigger asChild><Button variant={variante}><UserPlus aria-hidden="true" />{etiqueta}</Button></DialogoPrimitivo.Trigger>
    <DialogContent className="flex h-[min(90dvh,46rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0" onInteractOutside={(evento) => evento.preventDefault()}>
      <DialogTitle className="sr-only">Nuevo paciente</DialogTitle>
      <DialogDescription className="sr-only">Solo el nombre es obligatorio. Datos personales, contacto y cobertura.</DialogDescription>
      <FormularioPaciente modo="alta" alCancelar={() => cambiarAbierto(false)} alCambiarPendiente={fijarPendiente} />
    </DialogContent>
  </Dialog>;
}
