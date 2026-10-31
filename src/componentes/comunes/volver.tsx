import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function Volver({ href, etiqueta = "Volver" }: { href: string; etiqueta?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {etiqueta}
    </Link>
  );
}
