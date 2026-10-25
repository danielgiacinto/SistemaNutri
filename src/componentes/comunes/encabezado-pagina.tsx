import { cn } from "@/lib/utilidades";

type PropiedadesEncabezado = {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
};

export function EncabezadoPagina({ titulo, descripcion, acciones, className }: PropiedadesEncabezado) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground sm:text-base">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}
