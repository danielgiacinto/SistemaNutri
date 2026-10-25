import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utilidades";

type PropiedadesEstadoVacio = {
  icono: LucideIcon;
  titulo: string;
  descripcion: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
};

/** Estado sin datos: explica qué falta y qué puede hacer el usuario. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, className }: PropiedadesEstadoVacio) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icono className="size-6" aria-hidden="true" />
      </span>
      <div className="max-w-md space-y-1">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {accion && <div className="pt-1">{accion}</div>}
    </div>
  );
}
