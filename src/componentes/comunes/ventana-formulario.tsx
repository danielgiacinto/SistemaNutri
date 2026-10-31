"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";

const ContextoCerrar = createContext<() => void>(() => {});

/** Cierra la ventana si el formulario está adentro. Afuera no hace nada. */
export function useCerrarVentana() {
  return useContext(ContextoCerrar);
}

export function VentanaFormulario({
  etiqueta,
  titulo,
  descripcion,
  icono,
  children,
  variante = "default",
  className,
}: {
  etiqueta: React.ReactNode;
  titulo: string;
  descripcion?: string;
  /** Elemento ya creado en el servidor. Un componente de Lucide no se puede pasar como función. */
  icono?: React.ReactNode;
  children: React.ReactNode;
  variante?: "default" | "outline";
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <Button type="button" variant={variante} onClick={() => setAbierto(true)}>
        {icono}
        {etiqueta}
      </Button>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion ? <DialogDescription>{descripcion}</DialogDescription> : null}
        </DialogHeader>
        <ContextoCerrar.Provider value={() => setAbierto(false)}>{abierto ? children : null}</ContextoCerrar.Provider>
      </DialogContent>
    </Dialog>
  );
}
