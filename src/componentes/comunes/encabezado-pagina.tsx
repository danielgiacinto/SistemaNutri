import { cn } from "@/lib/utilidades";
import { Volver } from "@/componentes/comunes/volver";

type PropiedadesEncabezado = {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
  volverA?: string;
  etiquetaVolver?: string;
};

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  className,
  volverA,
  etiquetaVolver,
}: PropiedadesEncabezado) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {volverA ? <Volver href={volverA} etiqueta={etiquetaVolver} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted-foreground sm:text-base">{descripcion}</p>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
      </div>
    </header>
  );
}
