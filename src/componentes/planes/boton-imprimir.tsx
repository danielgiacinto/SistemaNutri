"use client";
import { Printer } from "lucide-react";
import { Button } from "@/componentes/ui/button";
export function BotonImprimirPlan() {
  return <Button className="min-h-11 print:hidden" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir / guardar PDF</Button>;
}
