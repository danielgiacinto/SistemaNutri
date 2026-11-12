"use client";

import { Button } from "@/componentes/ui/button";
export default function ErrorBiblioteca({ reset }: { reset: () => void }) {
  return <div role="alert" className="space-y-4 rounded-2xl border bg-card p-6"><h2 className="font-semibold">No pudimos cargar la biblioteca</h2><p className="text-sm text-muted-foreground">Intentá nuevamente en unos minutos. Tus recursos guardados se conservan.</p><Button variant="outline" onClick={reset}>Reintentar</Button></div>;
}
