"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useRef, useState } from "react";
import { RUTAS } from "@/autorizacion/rutas";

const ENLACES = [
  { destino: "#funcionalidades", texto: "El producto" },
  { destino: "#como-funciona", texto: "Cómo funciona" },
  { destino: "#plan", texto: "El plan" },
  { destino: "#preguntas", texto: "Preguntas" },
];

export function NavegacionInicio() {
  const [abierto, cambiarAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  return (
    <div className="inicio-navegacion" onKeyDown={(evento) => {
      if (evento.key === "Escape" && abierto) {
        cambiarAbierto(false);
        boton.current?.focus();
      }
    }}>
      <nav className="inicio-nav-escritorio" aria-label="Navegación principal">{ENLACES.map(({ destino, texto }) => <a key={destino} href={destino}>{texto}</a>)}</nav>
      <div className="inicio-accesos">
        <Link className="inicio-ingresar" href={RUTAS.ingresar}>Ingresar</Link>
        <Link className="inicio-boton inicio-boton-pequeno" href={RUTAS.registro}>Crear cuenta <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <button ref={boton} type="button" className="inicio-menu-boton" aria-label={abierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={abierto} aria-controls="menu-inicio" onClick={() => cambiarAbierto(!abierto)}>{abierto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      {abierto && <nav id="menu-inicio" className="inicio-menu-movil" aria-label="Navegación móvil">{ENLACES.map(({ destino, texto }) => <a key={destino} href={destino} onClick={() => cambiarAbierto(false)}>{texto}<ArrowUpRight aria-hidden="true" />
      </a>)}<Link href={RUTAS.ingresar} onClick={() => cambiarAbierto(false)}>Ingresar a mi cuenta<ArrowUpRight aria-hidden="true" />
        </Link>
      </nav>}
    </div>
  );
}
