"use client";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { borrarPlan } from "@/acciones/planes";
import { Button } from "@/componentes/ui/button";
export function EliminarBorradorPlan({ planId, pacienteId }: { planId: string; pacienteId: string }) {
  const [pendiente, iniciar] = useTransition();
  return <Button variant="ghost" className="min-h-10 text-muted-foreground" disabled={pendiente} onClick={() => {
    if (!window.confirm("¿Eliminar este borrador? Esta acción no se puede deshacer.")) return;
    iniciar(async () => { try { const resultado = await borrarPlan(planId, pacienteId); if (resultado && !resultado.ok) toast.error(resultado.mensaje); } catch { toast.error("No se pudo eliminar el borrador."); } });
  }}><Trash2 aria-hidden="true" />{pendiente ? "Eliminando…" : "Eliminar borrador sin entregar"}</Button>;
}
