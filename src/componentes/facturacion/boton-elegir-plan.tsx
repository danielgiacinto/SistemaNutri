"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { iniciarPagoSuscripcion } from "@/acciones/facturacion";
import { Button } from "@/componentes/ui/button";

export function BotonElegirPlan({ pendienteDePago }: { pendienteDePago: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [error, establecerError] = useState<string | null>(null);

  function elegir() {
    establecerError(null);
    iniciar(async () => {
      try {
        const resultado = await iniciarPagoSuscripcion();
        if (!resultado.ok) establecerError(resultado.mensaje);
        else if (resultado.datos?.url) window.location.assign(resultado.datos.url);
        else establecerError("No pudimos abrir Mercado Pago. Intentá nuevamente.");
      } catch {
        establecerError("No pudimos preparar el pago. Revisá tu conexión e intentá nuevamente.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button className="h-12 w-full text-sm" onClick={elegir} disabled={pendiente} aria-busy={pendiente}>
        {pendiente ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {pendiente ? "Abriendo Mercado Pago…" : pendienteDePago ? "Continuar con el pago" : "Elegir este plan"}
        {!pendiente ? <ArrowUpRight aria-hidden="true" /> : null}
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
