import { Skeleton } from "@/componentes/ui/skeleton";

export function EsqueletoGestionAgenda() {
  return <div className="space-y-5" role="status" aria-label="Cargando la configuración de la agenda">
    <Skeleton className="h-12 w-2/3" />
    <div className="space-y-3" aria-hidden="true"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
  </div>;
}
