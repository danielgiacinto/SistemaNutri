import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/** Fila completa pulsable con la misma jerarquía en los listados del consultorio. */
export function FilaRecurso({ href, icono: Icono, titulo, descripcion, detalle }: {
  href: string; icono: LucideIcon; titulo: string; descripcion: React.ReactNode; detalle?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3 px-4 py-4 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icono className="size-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1 space-y-1"><span className="block text-sm font-semibold wrap-anywhere">{titulo}</span><span className="block text-xs leading-relaxed text-muted-foreground sm:text-sm">{descripcion}</span>{detalle ? <span className="block pt-1 text-xs text-muted-foreground">{detalle}</span> : null}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}
