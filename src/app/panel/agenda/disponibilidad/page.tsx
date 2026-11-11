import { Suspense } from "react";
import type { Metadata } from "next";
import { DisponibilidadConsultorio } from "@/componentes/agenda/disponibilidad-consultorio";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Disponibilidad" };

export default function PaginaDisponibilidad() {
  return <Suspense fallback={<Skeleton className="h-96" />}><DisponibilidadConsultorio /></Suspense>;
}
