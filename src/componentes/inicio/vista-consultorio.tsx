"use client";

import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ChevronRight, ClipboardList, HeartHandshake, LayoutDashboard, Leaf, Settings2, ShieldCheck, Sprout, TrendingUp, Users, Wallet } from "lucide-react";
import { Palta } from "@/componentes/marca/palta";

const VISTAS = [{ id: "dia", texto: "Mi día" }, { id: "evolucion", texto: "Evolución" }, { id: "cobros", texto: "Finanzas" }] as const;
type Vista = (typeof VISTAS)[number]["id"];

export function VistaConsultorio() {
  const [vista, cambiarVista] = useState<Vista>("dia");

  return (
    <div className="inicio-demo">
      <div className="inicio-demo-aura" aria-hidden="true" />
      <div className="inicio-tarjeta-flotante inicio-flotante-plan">
        <span>
          <Check aria-hidden="true" />
        </span>
        <div>
          <strong>Plan publicado</strong>
          <small>Ya está en el portal de tu paciente.</small>
        </div>
        <Leaf aria-hidden="true" />
      </div>
      <div className="inicio-ventana">
        <div className="inicio-ventana-barra">
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <ShieldCheck aria-hidden="true" /> Tu espacio de trabajo</span>
          <span className="inicio-demo-mas" aria-hidden="true">+</span>
        </div>
        <div className="inicio-demo-aplicacion">
          <div className="inicio-demo-lateral" aria-hidden="true">
            <div className="inicio-demo-marca">
              <Palta className="h-7 w-6" />
              <strong>Nutrisfera</strong>
            </div>
            <small>MI CONSULTORIO</small>{[{ icono: LayoutDashboard, texto: "Inicio" }, { icono: Users, texto: "Pacientes" }, { icono: CalendarDays, texto: "Agenda" }, { icono: ClipboardList, texto: "Historias" }, { icono: Leaf, texto: "Planes" }, { icono: Wallet, texto: "Finanzas" }, { icono: HeartHandshake, texto: "Comunidad" }].map(({ icono: Icono, texto }, indice) => <span key={texto} className={indice === 0 ? "inicio-demo-nav-activo" : ""}>
              <Icono />{texto}</span>)}<div className="inicio-demo-perfil">
              <span className="inicio-avatar">VP</span>
              <span>
                <strong>Valentina</strong>
                <small>Mi consultorio</small>
              </span>
              <Settings2 />
            </div>
          </div>
          <div className="inicio-demo-principal">
            <div className="inicio-demo-saludo">
              <div>
                <span>MIÉRCOLES 18 DE NOVIEMBRE</span>
                <strong>Hola, Valentina <Sprout aria-hidden="true" />
                </strong>
                <p>Un buen día para acompañar.</p>
              </div>
              <span className="inicio-avatar" aria-hidden="true">VP</span>
            </div>
            <div className="inicio-demo-selector" role="group" aria-label="Cambiar vista ilustrativa del consultorio">{VISTAS.map(({ id, texto }) => <button key={id} type="button" aria-pressed={vista === id} onClick={() => cambiarVista(id)}>{texto}</button>)}</div>
            <div className="inicio-demo-contenido" aria-live="polite" aria-atomic="true">{vista === "dia" ? <VistaDia /> : vista === "evolucion" ? <VistaEvolucion /> : <VistaCobros />}</div>
          </div>
        </div>
      </div>
      <div className="inicio-tarjeta-flotante inicio-flotante-objetivo">
        <span>
          <Sprout aria-hidden="true" />
        </span>
        <div>
          <strong>Cada avance cuenta.</strong>
          <small>Vos acompañás. Todo se conecta.</small>
        </div>
      </div>
      <p className="inicio-demo-aclaracion">
        <span className="inicio-punto" /> Explorá las vistas · Ejemplo con datos ficticios</p>
    </div>
  );
}

function VistaDia() {
  return <>
    <div className="inicio-demo-metricas">
      <div>
        <span>
          <Users aria-hidden="true" /> Pacientes</span>
        <strong>48<small>activos</small>
        </strong>
      </div>
      <div>
        <span>
          <CalendarDays aria-hidden="true" /> Turnos hoy</span>
        <strong>6<small>en tu agenda</small>
        </strong>
      </div>
      <div>
        <span>
          <Check aria-hidden="true" /> Atendidos</span>
        <strong>3<small>hasta ahora</small>
        </strong>
      </div>
    </div>
    <div className="inicio-demo-proximo">
      <div>
        <span>PRÓXIMO ENCUENTRO</span>
        <strong>Julieta López <ArrowUpRight aria-hidden="true" />
        </strong>
        <p>10:30 – 11:15 · Consulta de control</p>
      </div>
      <span className="inicio-avatar">JL</span>
    </div>
    <div className="inicio-demo-agenda">
      <div className="inicio-demo-subtitulo">
        <strong>Tu agenda de hoy</strong>
        <CalendarDays aria-hidden="true" />
      </div>{[{ hora: "09:00", nombre: "Martín Pérez", detalle: "Primera consulta", estado: "Atendido" }, { hora: "10:30", nombre: "Julieta López", detalle: "Consulta de control", estado: "Confirmado" }, { hora: "11:30", nombre: "Lucía García", detalle: "Consulta de control", estado: "Programado" }].map(({ hora, nombre, detalle, estado }) => <div key={hora} className="inicio-demo-fila">
        <span>{hora}</span>
        <span>
          <strong>{nombre}</strong>
          <small>{detalle}</small>
        </span>
        <span className={`inicio-demo-estado ${estado === "Confirmado" ? "inicio-demo-confirmado" : ""}`}>{estado}</span>
        <ChevronRight aria-hidden="true" />
      </div>)}</div>
  </>;
}

function VistaEvolucion() {
  return <>
    <div className="inicio-demo-subtitulo">
      <strong>El proceso de Julieta</strong>
      <span className="inicio-insignia">Seguimiento</span>
    </div>
    <div className="inicio-demo-evolucion">
      <span>CONSULTAS REGISTRADAS</span>
      <strong>Un proceso, más perspectiva.</strong>
      <p>Cada encuentro suma a su historia.</p>
      <div className="inicio-demo-grafico" role="img" aria-label="Gráfico ilustrativo de mediciones registradas entre agosto y noviembre">
        <svg viewBox="0 0 360 130" fill="none">
          <path className="inicio-grafico-guia" d="M0 20H360M0 65H360M0 110H360" />
          <path className="inicio-grafico-area" d="M0 86C32 86 35 50 72 52S118 87 144 70S190 22 216 36S260 68 288 44S330 27 360 12V130H0Z" />
          <path className="inicio-grafico-linea" d="M0 86C32 86 35 50 72 52S118 87 144 70S190 22 216 36S260 68 288 44S330 27 360 12" />
        </svg>
        <div>
          <span>Ago</span>
          <span>Sep</span>
          <span>Oct</span>
          <span>Nov</span>
        </div>
      </div>
    </div>
    <div className="inicio-demo-meta">
      <span>
        <Sprout aria-hidden="true" />
      </span>
      <div>
        <strong>Objetivo: sumar variedad</strong>
        <p>Hábitos que se construyen paso a paso.</p>
      </div>
      <Check aria-hidden="true" />
    </div>
    <div className="inicio-demo-meta">
      <span>
        <ClipboardList aria-hidden="true" />
      </span>
      <div>
        <strong>Historia clínica al día</strong>
        <p>Consultas, notas y mediciones conectadas.</p>
      </div>
    </div>
  </>;
}

function VistaCobros() {
  return <>
    <div className="inicio-demo-subtitulo">
      <strong>Finanzas del consultorio</strong>
      <Wallet aria-hidden="true" />
    </div>
    <div className="inicio-demo-metricas inicio-demo-metricas-cobros">
      <div>
        <span>Cobrado este mes</span>
        <strong>$ 240.000</strong>
      </div>
      <div>
        <span>Por cobrar</span>
        <strong>$ 36.000</strong>
      </div>
    </div>
    <div className="inicio-demo-ingresos">
      <div>
        <span>Ingresos registrados</span>
        <TrendingUp aria-hidden="true" />
      </div>
      <div className="inicio-demo-barras" aria-label="Ejemplo ilustrativo de ingresos por semana" role="img">{[42, 65, 51, 84].map((altura, indice) => <div key={indice}>
        <i style={{ height: `${altura}%` }} />
        <span>Sem. {indice + 1}</span>
      </div>)}</div>
    </div>
    <div className="inicio-demo-meta">
      <span>
        <Check aria-hidden="true" />
      </span>
      <div>
        <strong>Cobro de consulta registrado</strong>
        <p>Pago parcial · Transferencia</p>
      </div>
      <span className="inicio-demo-importe">$ 12.000</span>
    </div>
  </>;
}
