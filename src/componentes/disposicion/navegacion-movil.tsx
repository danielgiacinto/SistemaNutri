"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";
import { ListaNavegacion } from "@/componentes/disposicion/lista-navegacion";
import { NOMBRE_PRODUCTO } from "@/configuracion/producto";
import type { VarianteNavegacion } from "@/configuracion/navegacion";

export function NavegacionMovil({ variante, subtitulo }: { variante: VarianteNavegacion; subtitulo: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menú de navegación">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle>{NOMBRE_PRODUCTO}</SheetTitle>
          <SheetDescription className="truncate">{subtitulo}</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-3 py-4">
          <ListaNavegacion variante={variante} alNavegar={() => setAbierto(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
