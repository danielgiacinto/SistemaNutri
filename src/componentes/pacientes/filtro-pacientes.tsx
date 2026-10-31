"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
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

const CLASE_SELECT =
  "h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
    <div className="space-y-3">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem] sm:items-end">
        <label className="space-y-1 text-sm font-medium">
          Buscar
          <Input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key !== "Enter") return;
              evento.preventDefault();
              aplicar({ q: busqueda.trim(), estado, orden });
            }}
            placeholder="Nombre, apellido, documento o correo"
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Estado
          <select
            value={estado}
            onChange={(evento) => aplicar({ q: busqueda.trim(), estado: leerOpcion(evento.target.value, ESTADOS, "activo"), orden })}
            className={CLASE_SELECT}
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Orden
          <select
            value={orden}
            onChange={(evento) => aplicar({ q: busqueda.trim(), estado, orden: leerOpcion(evento.target.value, ORDENES, "apellido") })}
            className={CLASE_SELECT}
          >
            <option value="apellido">Apellido</option>
            <option value="reciente">Más recientes</option>
          </select>
        </label>
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
