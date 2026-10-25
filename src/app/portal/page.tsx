import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays, Salad, Target } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Mi portal" };

export default function PaginaPortal() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InicioPaciente />
    </Suspense>
  );
}

async function InicioPaciente() {
  const contexto = await requerirPaciente();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {contexto.nombre || "bienvenida/o"}</h1>
        <p className="text-muted-foreground">Acá vas a ver lo que tu nutricionista comparta con vos.</p>
      </div>
      <div className="grid gap-4">
        <EstadoVacio
          icono={CalendarDays}
          titulo="Sin turnos para mostrar"
          descripcion="Cuando tu nutricionista te asigne un turno, lo vas a ver acá."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EstadoVacio
            icono={Target}
            titulo="Objetivos"
            descripcion="Tu nutricionista todavía no compartió objetivos."
          />
          <EstadoVacio
            icono={Salad}
            titulo="Plan alimentario"
            descripcion="Todavía no hay un plan publicado para vos."
          />
        </div>
      </div>
    </div>
  );
}
