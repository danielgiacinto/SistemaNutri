"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/utilidades";

export type Pestana = {
  href: string;
  etiqueta: string;
  exacta?: boolean;
};

export function Pestanas({ items, actual, precargar = false, cuadriculaMovil = false }: { items: Pestana[]; actual: string; precargar?: boolean; cuadriculaMovil?: boolean }) {
  return (
    <nav aria-label="Secciones" className="min-w-0">
      <ul className={cn("flex flex-wrap gap-1 border-b", cuadriculaMovil && "max-sm:grid max-sm:grid-cols-2 max-sm:gap-2 max-sm:rounded-2xl max-sm:border max-sm:bg-card max-sm:p-2")}>
        {items.map((item) => {
          const activa = item.exacta
            ? actual === item.href
            : actual === item.href || actual.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={precargar ? true : undefined}
                scroll={false}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 cursor-pointer items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  activa
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  cuadriculaMovil && "max-sm:h-auto max-sm:min-h-11 max-sm:w-full max-sm:rounded-lg max-sm:border-0 max-sm:whitespace-normal max-sm:py-2",
                  cuadriculaMovil && activa && "max-sm:bg-accent max-sm:text-accent-foreground",
                )}
              >
                <EtiquetaPestana etiqueta={item.etiqueta} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function EtiquetaPestana({ etiqueta }: { etiqueta: string }) {
  const { pending: pendiente } = useLinkStatus();
  return <span className={pendiente ? "animate-pulse text-primary" : undefined}>{etiqueta}{pendiente && <span className="sr-only" role="status">: cargando sección</span>}</span>;
}
