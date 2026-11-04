"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import {
  hrefListadoPacientes,
  type EstadoListadoPacientes,
  type OrdenListadoPacientes,
} from "@/componentes/pacientes/consulta-pacientes";

const ESTADOS = ["activo", "inactivo", "todos"] as const;
const ORDENES = ["apellido", "reciente"] as const;
const ETIQUETAS_ESTADO: Record<EstadoListadoPacientes, string> = {
  activo: "Activos",
  inactivo: "Inactivos",
  todos: "Todos",
};
const ETIQUETAS_ORDEN: Record<OrdenListadoPacientes, string> = {
  apellido: "Apellido",
  reciente: "Más recientes",
};
const ESPERA_BUSQUEDA_MS = 300;

function leerOpcion<T extends string>(valor: string | null, opciones: readonly T[], defecto: T): T {
  return opciones.includes(valor as T) ? (valor as T) : defecto;
}

export function FiltroPacientes() {
  const router = useRouter();
  const parametros = useSearchParams();
  const q = parametros.get("q") ?? "";
  const estado = leerOpcion(parametros.get("estado"), ESTADOS, "activo");
  const orden = leerOpcion(parametros.get("orden"), ORDENES, "apellido");

  const [busqueda, setBusqueda] = useState(q);
  const [sincronizado, setSincronizado] = useState(q);

  if (q !== sincronizado) {
    setSincronizado(q);
    if (busqueda.trim() === sincronizado) setBusqueda(q);
  }

  useEffect(() => {
    const texto = busqueda.trim();
    if (texto === q) return;
    const id = setTimeout(() => {
      router.replace(hrefListadoPacientes({ q: texto, estado, orden }), { scroll: false });
    }, ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [busqueda, q, estado, orden, router]);

  function aplicar(destino: { q: string; estado: EstadoListadoPacientes; orden: OrdenListadoPacientes }) {
    if (destino.q === q && destino.estado === estado && destino.orden === orden) return;
    router.replace(hrefListadoPacientes(destino), { scroll: false });
  }

  function quitarBusqueda() {
    setBusqueda("");
    aplicar({ q: "", estado, orden });
  }

  const insignias = [
    q ? { clave: "q", etiqueta: q, quitar: quitarBusqueda } : null,
    estado !== "activo"
      ? {
          clave: "estado",
          etiqueta: `Estado: ${ETIQUETAS_ESTADO[estado]}`,
          quitar: () => aplicar({ q: busqueda.trim(), estado: "activo", orden }),
        }
      : null,
    orden !== "apellido"
      ? {
          clave: "orden",
          etiqueta: `Orden: ${ETIQUETAS_ORDEN[orden]}`,
          quitar: () => aplicar({ q: busqueda.trim(), estado, orden: "apellido" }),
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={busqueda}
            aria-label="Buscar pacientes"
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key !== "Enter") return;
              evento.preventDefault();
              aplicar({ q: busqueda.trim(), estado, orden });
            }}
            placeholder="Buscar pacientes…"
            autoComplete="off"
            className="h-9 pl-9"
          />
        </div>
        <div className="min-w-0 sm:w-40">
          <Select
            value={estado}
            onValueChange={(valor) => aplicar({ q: busqueda.trim(), estado: leerOpcion(valor, ESTADOS, "activo"), orden })}
          >
            <SelectTrigger aria-label="Filtrar pacientes por estado" className="w-full data-[size=default]:h-9">
              <SelectValue>Estado: {ETIQUETAS_ESTADO[estado]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 sm:w-40">
          <Select
            value={orden}
            onValueChange={(valor) => aplicar({ q: busqueda.trim(), estado, orden: leerOpcion(valor, ORDENES, "apellido") })}
          >
            <SelectTrigger aria-label="Ordenar pacientes" className="w-full data-[size=default]:h-9">
              <SelectValue>Orden: {ETIQUETAS_ORDEN[orden]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apellido">Apellido</SelectItem>
              <SelectItem value="reciente">Más recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {insignias.length > 0 && (
        <ul aria-label="Filtros aplicados" className="flex flex-wrap gap-2">
          {insignias.map((insignia) => (
            <li key={insignia.clave}>
              <Badge variant="secondary" className="h-7 max-w-full gap-1 pr-1 pl-2.5">
                <span className="truncate">{insignia.etiqueta}</span>
                <button
                  type="button"
                  onClick={insignia.quitar}
                  aria-label={`Quitar ${insignia.etiqueta}`}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
