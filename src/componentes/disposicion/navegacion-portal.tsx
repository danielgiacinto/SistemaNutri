"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACION, type ElementoNavegacion } from "@/configuracion/navegacion";
import { cn } from "@/lib/utilidades";

const ELEMENTOS: ElementoNavegacion[] = NAVEGACION.paciente;

function estaActivo(rutaActual: string, href: string): boolean {
  if (href === ELEMENTOS[0].href) return rutaActual === href;
  return rutaActual === href || rutaActual.startsWith(`${href}/`);
}

/** Pestañas del portal: barra inferior en celulares y fila superior en pantallas grandes. */
export function NavegacionPortal() {
  const rutaActual = usePathname();

  return (
    <nav
      aria-label="Secciones del portal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-3xl justify-around sm:justify-start sm:gap-1">
        {ELEMENTOS.map(({ titulo, href, icono: Icono }) => {
          const activo = estaActivo(rutaActual, href);
          return (
            <li key={href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[0.7rem] font-medium outline-none transition-colors sm:min-h-10 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  activo ? "text-primary sm:bg-accent sm:text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className="size-5 sm:size-4" aria-hidden="true" />
                {titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
