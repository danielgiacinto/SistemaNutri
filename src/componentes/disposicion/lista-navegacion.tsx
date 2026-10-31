"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACION, type ElementoNavegacion, type VarianteNavegacion } from "@/configuracion/navegacion";
import { cn } from "@/lib/utilidades";

function estaActivo(rutaActual: string, href: string, esRaiz: boolean): boolean {
  if (esRaiz) return rutaActual === href;
  return rutaActual === href || rutaActual.startsWith(`${href}/`);
}

type PropiedadesLista = {
  variante: VarianteNavegacion;
  alNavegar?: () => void;
};

export function ListaNavegacion({ variante, alNavegar }: PropiedadesLista) {
  const rutaActual = usePathname();
  const elementos: ElementoNavegacion[] = NAVEGACION[variante];
  const hrefRaiz = elementos[0]?.href;

  return (
    <nav aria-label="Navegación principal">
      <ul className="flex flex-col gap-1">
        {elementos.map(({ titulo, href, icono: Icono, fasePendiente }) => {
          const activo = estaActivo(rutaActual, href, href === hrefRaiz);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={alNavegar}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "group flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
                  activo
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icono
                  className={cn("size-[1.15rem] shrink-0", activo ? "text-primary" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{titulo}</span>
                {fasePendiente !== undefined && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                    Pronto
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
