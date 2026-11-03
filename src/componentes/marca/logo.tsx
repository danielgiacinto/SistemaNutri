import Link from "next/link";
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
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--palta-fondo)] shadow-sm",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" fill="none">
          <g transform="rotate(12 12 12)">
            <path
              d="M12 2.1c-2.8 0-4.5 1.4-5 4.2-.5 2.8-1.9 5.8-2.55 8.7-.9 3.8 1.75 6.8 5.35 6.8h4.4c3.6 0 6.25-3 5.35-6.8-.65-2.9-2.05-5.9-2.55-8.7-.5-2.8-2.2-4.2-5-4.2Z"
              fill="var(--palta-piel)"
            />
            <path
              d="M12 3.25c-2.45 0-3.95 1.3-4.45 3.75-.55 2.6-1.85 5.4-2.4 8.1-.75 3.15 1.4 5.65 4.5 5.65h4.7c3.1 0 5.25-2.5 4.5-5.65-.55-2.7-1.85-5.5-2.4-8.1-.5-2.45-2-3.75-4.45-3.75Z"
              fill="var(--palta-hoja)"
            />
            <path
              d="M12 4.1c-2.05 0-3.25 1.35-3.7 3.55-.45 2.5-1.65 5.15-2.15 7.6-.55 2.55 1.2 4.6 3.85 4.6h4c2.65 0 4.4-2.05 3.85-4.6-.5-2.45-1.7-5.1-2.15-7.6C15.25 5.45 14.05 4.1 12 4.1Z"
              fill="var(--palta-carne)"
            />
            <ellipse cx="12" cy="15.3" rx="3.1" ry="3.7" fill="var(--palta-semilla)" />
            <ellipse cx="12.6" cy="14.45" rx="1.15" ry="1.7" fill="var(--palta-semilla-luz)" opacity="0.58" />
          </g>
        </svg>
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
