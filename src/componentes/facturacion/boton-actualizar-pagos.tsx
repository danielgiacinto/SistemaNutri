"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { toast } from "sonner";
import { conciliarMiSuscripcion } from "@/acciones/sincronizar-suscripcion";

export function BotonActualizarPagos({ puedeSincronizar = false }: { puedeSincronizar?: boolean }) {
  const enrutador = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pendiente} aria-busy={pendiente} onClick={() => iniciar(async () => {
      if (puedeSincronizar) {
        try {
          const resultado = await conciliarMiSuscripcion();
          if (resultado.ok) toast.success(resultado.mensaje);
          else toast.error(resultado.mensaje);
        } catch {
          toast.error("No pudimos actualizar la suscripción. Intentá nuevamente.");
        }
      }
      enrutador.refresh();
    })}>
      <RefreshCw className={pendiente ? "animate-spin" : undefined} aria-hidden="true" />
      {pendiente ? "Verificando…" : puedeSincronizar ? "Verificar cobros" : "Actualizar estado"}
    </Button>
  );
}
