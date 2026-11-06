import { Skeleton } from "@/componentes/ui/skeleton";

export default function CargandoSeccionPaciente() {
  return <div className="space-y-5" role="status" aria-label="Cargando sección del paciente">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72 max-w-full" />
    <Skeleton className="h-56 rounded-2xl" />
  </div>;
}
