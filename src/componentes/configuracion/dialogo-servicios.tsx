"use client";

import { useState } from "react";
import { Dialog as DialogoPrimitivo } from "radix-ui";
import { Tags } from "lucide-react";
import type { ServicioConsultorio } from "@/tipos/finanzas";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/ui/dialog";
import { CatalogoServicios } from "./catalogo-servicios";

export function DialogoServicios({ servicios }: { servicios: ServicioConsultorio[] }) {
  const [abierto, fijarAbierto] = useState(false);
  return <Dialog open={abierto} onOpenChange={fijarAbierto}>
    <DialogoPrimitivo.Trigger asChild><Button variant="outline" size="sm"><Tags aria-hidden="true" />Servicios y precios</Button></DialogoPrimitivo.Trigger>
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>Servicios y precios</DialogTitle><DialogDescription>Tu lista de precios para cobrar y agendar. Los turnos existentes conservan su importe original.</DialogDescription></DialogHeader>
      <CatalogoServicios servicios={servicios} />
    </DialogContent>
  </Dialog>;
}
