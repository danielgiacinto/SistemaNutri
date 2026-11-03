"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/componentes/ui/input";

const ESPERA_BUSQUEDA_MS = 300;

export function FiltroProfesionales() {
  const router = useRouter();
  const parametros = useSearchParams();
  const q = parametros.get("q") ?? "";
  const [busqueda, setBusqueda] = useState(q);
  const [sincronizado, setSincronizado] = useState(q);

  if (q !== sincronizado) {
    setSincronizado(q);
    if (busqueda.trim().toLowerCase() === sincronizado) setBusqueda(q);
  }

  useEffect(() => {
    const texto = busqueda.trim().toLowerCase();
    if (texto === q) return;
    const id = setTimeout(() => {
      router.replace(texto ? `/admin/profesionales?q=${encodeURIComponent(texto)}` : "/admin/profesionales", {
        scroll: false,
      });
    }, ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [busqueda, q, router]);

  return (
    <div className="relative w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        aria-label="Buscar profesionales por correo o consultorio"
        placeholder="Correo o consultorio"
        autoComplete="off"
        className="h-9 pl-9"
      />
    </div>
  );
}
