import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CardTitle } from "@/componentes/ui/card";

export function TituloTarjeta({ icono: Icono, children }: { icono: LucideIcon; children: ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icono className="size-4" aria-hidden="true" />
      </span>
      <h2 className="min-w-0 text-balance wrap-anywhere">{children}</h2>
    </CardTitle>
  );
}
