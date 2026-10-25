import { Skeleton } from "@/componentes/ui/skeleton";

/** Estructura provisoria mientras se verifica la sesión del usuario. */
export function EsqueletoMarco() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]" aria-busy="true" aria-label="Cargando">
      <div className="hidden h-dvh flex-col gap-6 border-r bg-sidebar p-5 lg:flex">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 7 }, (_, indice) => (
            <Skeleton key={indice} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:hidden">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
