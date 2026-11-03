"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
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
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="filtro-pacientes-estado">Estado</label>
          <Select
            value={estado}
            onValueChange={(valor) => aplicar({ q: busqueda.trim(), estado: leerOpcion(valor, ESTADOS, "activo"), orden })}
          >
            <SelectTrigger id="filtro-pacientes-estado" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="filtro-pacientes-orden">Orden</label>
          <Select
            value={orden}
            onValueChange={(valor) => aplicar({ q: busqueda.trim(), estado, orden: leerOpcion(valor, ORDENES, "apellido") })}
          >
            <SelectTrigger id="filtro-pacientes-orden" className="w-full">
              <SelectValue />
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
