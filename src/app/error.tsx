"use client";

import { TriangleAlert } from "lucide-react";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Button } from "@/componentes/ui/button";

/** Límite de error global: nunca muestra detalles técnicos al usuario. */
export default function LimiteDeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <EstadoVacio
        icono={TriangleAlert}
        titulo="Algo salió mal"
        descripcion={
          <>
            No pudimos cargar esta sección. Probá nuevamente en unos segundos.
            {error.digest && <span className="mt-2 block text-xs">Código de referencia: {error.digest}</span>}
          </>
        }
        accion={<Button onClick={reset}>Reintentar</Button>}
        className="w-full max-w-lg"
      />
    </main>
  );
}
