import { Skeleton } from "@/componentes/ui/skeleton";

export function EsqueletoFormulario({ campos = 2 }: { campos?: number }) {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: campos }, (_, indice) => (
        <div key={indice} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
