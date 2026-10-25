import Link from "next/link";
import { cn } from "@/lib/utilidades";

export type Pestana = {
  href: string;
  etiqueta: string;
  exacta?: boolean;
};

export function Pestanas({ items, actual }: { items: Pestana[]; actual: string }) {
  return (
    <nav aria-label="Secciones" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b">
        {items.map((item) => {
          const activa = item.exacta
            ? actual === item.href
            : actual === item.href || actual.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  activa
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
