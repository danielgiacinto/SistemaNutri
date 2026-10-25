import Link from "next/link";
import { Leaf } from "lucide-react";
import { NOMBRE_PRODUCTO } from "@/configuracion/producto";
import { cn } from "@/lib/utilidades";

type PropiedadesLogo = {
  href?: string;
  subtitulo?: string;
  /** Para usar sobre fondos del color primario. */
  invertido?: boolean;
  className?: string;
};

export function Logo({ href = "/", subtitulo, invertido = false, className }: PropiedadesLogo) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
          invertido ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        <Leaf className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-lg font-bold tracking-tight">{NOMBRE_PRODUCTO}</span>
        {subtitulo && (
          <span
            className={cn(
              "truncate text-[0.7rem] font-semibold tracking-wider uppercase",
              invertido ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {subtitulo}
          </span>
        )}
      </span>
    </Link>
  );
}
