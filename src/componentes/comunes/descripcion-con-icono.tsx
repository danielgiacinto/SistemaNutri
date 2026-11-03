import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utilidades";

export function DescripcionConIcono({
  icono: Icono,
  children,
  className,
}: {
  icono: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-start gap-2", className)}>
      <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
