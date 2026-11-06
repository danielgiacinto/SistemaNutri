"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { nombreNatural } from "@/lib/antropometria";

export function FiltroPlanes({ pacientes, pacienteId }: { pacientes: { id: string; nombre: string; apellido: string }[]; pacienteId?: string }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [seleccion, seleccionar] = useOptimistic(pacienteId ?? "todos");

  function cambiar(valor: string) {
    iniciar(() => {
      seleccionar(valor);
      const consulta = new URLSearchParams(parametros.toString());
      if (valor === "todos") consulta.delete("paciente");
      else consulta.set("paciente", valor);
      router.replace(`/panel/planes${consulta.size ? `?${consulta}` : ""}`, { scroll: false });
    });
  }

  return <div className="flex items-center gap-3">
    <Select value={seleccion} onValueChange={cambiar}>
      <SelectTrigger aria-label="Filtrar planes por paciente" className="w-full sm:w-80">
        <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <SelectValue placeholder="Todos los pacientes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos los pacientes</SelectItem>
        {pacientes.map(paciente => <SelectItem key={paciente.id} value={paciente.id}>{nombreNatural(paciente)}</SelectItem>)}
      </SelectContent>
    </Select>
    <span role="status" className="text-xs text-muted-foreground">{pendiente && <><LoaderCircle className="inline size-4 animate-spin" aria-hidden="true" /><span className="sr-only">Actualizando planes</span></>}</span>
  </div>;
}
