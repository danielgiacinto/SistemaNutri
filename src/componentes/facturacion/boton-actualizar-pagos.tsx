"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/componentes/ui/button";

export function BotonActualizarPagos() {
  const enrutador = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pendiente} onClick={() => iniciar(() => enrutador.refresh())}>
      <RefreshCw className={pendiente ? "animate-spin" : undefined} aria-hidden="true" />
      {pendiente ? "Actualizando…" : "Actualizar estado"}
    </Button>
  );
}
