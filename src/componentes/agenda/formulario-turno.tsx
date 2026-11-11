"use client";

import Link from "next/link";
import { useId, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Clock3, LockKeyhole, Save, UserRound } from "lucide-react";
import { guardarTurno, registrarTurno } from "@/acciones/turnos";
import { esquemaAltaTurno, esquemaEdicionTurno, type DatosAltaTurno, type DatosEdicionTurno } from "@/esquemas/turno";
import { aplicarErroresServidor } from "@/lib/formularios";
import { nombreNatural, nombreCompleto } from "@/lib/antropometria";
import { esFechaIso, formatearFechaIso } from "@/lib/fechas";
import { cn } from "@/lib/utilidades";
import { dineroFinanzas } from "@/tipos/finanzas";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { Button } from "@/componentes/ui/button";
import { DURACIONES_TURNO_MINUTOS, ETIQUETAS_ESTADO_TURNO } from "@/configuracion/clinica";

type PacienteOpcion = { id: string; nombre: string; apellido: string };

export type PropiedadesFormularioTurno = {
  pacientes: PacienteOpcion[];
  servicios?: { id: string; nombre: string; precio: number; moneda: string }[];
  duracionPredeterminada: number;
  inicial?: Partial<DatosEdicionTurno>;
  modo: "alta" | "edicion";
  enDialogo?: boolean;
  zonaHoraria?: string;
  alCancelar?: () => void;
  alCambiarPendiente?: (pendiente: boolean) => void;
};

export function FormularioTurno({ pacientes, duracionPredeterminada, inicial, modo, servicios = [], enDialogo = false, zonaHoraria, alCancelar, alCambiarPendiente }: PropiedadesFormularioTurno) {
  const [pendiente, iniciarTransicion] = useTransition();
  const prefijo = useId();
  const duracionInicial = (DURACIONES_TURNO_MINUTOS as readonly number[]).includes(duracionPredeterminada) ? duracionPredeterminada : 45;
  const formulario = useForm<DatosEdicionTurno>({
    resolver: zodResolver(modo === "edicion" ? esquemaEdicionTurno : esquemaAltaTurno) as unknown as Resolver<DatosEdicionTurno>,
    defaultValues: {
      turnoId: inicial?.turnoId ?? "", pacienteId: inicial?.pacienteId ?? "", servicioId: inicial?.servicioId ?? "",
      fecha: inicial?.fecha ?? "", hora: inicial?.hora ?? "09:00", duracionMinutos: inicial?.duracionMinutos ?? duracionInicial,
      tipo: inicial?.tipo ?? "otro", motivo: inicial?.motivo ?? "", notasAdministrativas: inicial?.notasAdministrativas ?? "", estado: inicial?.estado ?? "programado",
    },
  });
  const { errors: errores } = formulario.formState;
  const [pacienteId, servicioId, fecha, hora, duracion] = useWatch({ control: formulario.control, name: ["pacienteId", "servicioId", "fecha", "hora", "duracionMinutos"] });
  const paciente = pacientes.find(fila => fila.id === pacienteId);
  const servicio = servicios.find(fila => fila.id === servicioId);

  const alEnviar = formulario.handleSubmit((datos) => iniciarTransicion(async () => {
    alCambiarPendiente?.(true);
    try {
      const resultado = modo === "edicion" ? await guardarTurno(datos as DatosEdicionTurno) : await registrarTurno(datos as DatosAltaTurno);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (modo === "edicion" && resultado?.ok) toast.success(resultado.mensaje ?? "Turno actualizado.");
    } finally {
      alCambiarPendiente?.(false);
    }
  }));

  return <form onSubmit={alEnviar} noValidate aria-busy={pendiente} className={cn(enDialogo && "grid min-h-0 flex-1 lg:grid-cols-[16rem_minmax(0,1fr)]")}>
    {enDialogo && <aside className="hidden min-w-0 flex-col gap-6 bg-primary p-7 text-primary-foreground lg:flex">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/15"><CalendarPlus className="size-7" aria-hidden="true" /></span>
      <div><p className="text-xs font-medium uppercase tracking-wider opacity-75">Tu próxima consulta</p><h2 className="mt-2 text-2xl font-semibold wrap-anywhere">{paciente ? nombreNatural(paciente) : "Un espacio para acompañar"}</h2></div>
      <div className="space-y-4 rounded-2xl bg-primary-foreground/10 p-4 text-sm">
        <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{fecha && esFechaIso(fecha) ? formatearFechaIso(fecha, "full") : "Elegí una fecha"}</span></p>
        <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{hora || "Elegí un horario"} · {Number(duracion)} min</span></p>
      </div>
      <div className="space-y-2 text-sm"><p className="text-xs opacity-75">Servicio de la consulta</p><p className="font-semibold wrap-anywhere">{servicio?.nombre ?? "Sin configurar"}</p><p className="text-xl font-semibold tabular-nums">{servicio ? servicio.precio === 0 ? "Sin cargo" : dineroFinanzas(servicio.precio, servicio.moneda) : "Precio pendiente"}</p></div>
      <p className="mt-auto rounded-xl bg-primary-foreground/10 p-4 text-xs leading-relaxed">Agendar reserva el espacio en tu agenda. El pago se registra por separado, cuando lo recibís.</p>
    </aside>}
    <div className="flex min-h-0 min-w-0 flex-col">
      <fieldset disabled={pendiente} className={cn("min-w-0 space-y-6", enDialogo && "min-h-0 flex-1 overflow-y-auto p-5 sm:p-7")}>
        {enDialogo && <header className="pr-7"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Nuevo turno</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Reservá su próxima consulta</h2><p className="mt-1 text-sm text-muted-foreground">Elegí paciente, día y horario. El resto lo podés completar después.</p></header>}
        <section className="space-y-4" aria-label="Paciente y consulta">
          {enDialogo && <h3 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="size-4 text-primary" aria-hidden="true" />Paciente y consulta</h3>}
          <Controller control={formulario.control} name="pacienteId" render={({ field: campo }) => <CampoSelect referencia={campo.ref} id={`${prefijo}-paciente`} etiqueta="Paciente" valor={campo.value} alCambiar={campo.onChange} error={errores.pacienteId?.message} placeholder="Elegí un paciente" opciones={pacientes.map(fila => ({ valor: fila.id, etiqueta: nombreCompleto(fila) }))} />} />
          {!pacientes.length && <p className="rounded-xl border border-advertencia/30 bg-advertencia/10 p-3 text-sm">No hay pacientes activos. <Link href="/panel/pacientes?crear=1" className="font-medium underline underline-offset-4">Registrá un paciente</Link> para agendar su consulta.</p>}
          {modo === "alta" && <Controller control={formulario.control} name="servicioId" render={({ field: campo }) => <CampoSelect referencia={campo.ref} id={`${prefijo}-servicio`} etiqueta="Servicio y precio (opcional)" valor={campo.value || "sin_configurar"} alCambiar={valor => campo.onChange(valor === "sin_configurar" ? "" : valor)} error={errores.servicioId?.message} opciones={[
            { valor: "sin_configurar", etiqueta: "Sin configurar (no se genera un cobro)" },
            ...servicios.map(fila => ({ valor: fila.id, etiqueta: `${fila.nombre} · ${fila.precio === 0 ? "Sin cargo" : dineroFinanzas(fila.precio, fila.moneda)}` })),
          ]} />} />}
          {modo === "alta" && <p className="text-xs leading-relaxed text-muted-foreground"><Link href="/panel/configuracion/servicios" className="font-medium text-primary underline-offset-4 hover:underline">Servicios y precios</Link> · Podés elegir una consulta paga o sin cargo.</p>}
        </section>
        <section className="space-y-4" aria-label="Día y horario">
          {enDialogo && <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-primary" aria-hidden="true" />Día y horario</h3>}
          <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-3">
            <Controller control={formulario.control} name="fecha" render={({ field: campo }) => <CampoTexto id={`${prefijo}-fecha`} etiqueta="Fecha" type="date" required error={errores.fecha?.message} {...campo} value={campo.value ?? ""} />} />
            <Controller control={formulario.control} name="hora" render={({ field: campo }) => <CampoTexto id={`${prefijo}-hora`} etiqueta="Hora de inicio" type="time" required error={errores.hora?.message} {...campo} value={campo.value ?? ""} />} />
            <Controller control={formulario.control} name="duracionMinutos" render={({ field: campo }) => <CampoSelect referencia={campo.ref} id={`${prefijo}-duracion`} etiqueta="Duración" valor={String(campo.value)} alCambiar={valor => campo.onChange(Number(valor))} error={errores.duracionMinutos?.message} opciones={DURACIONES_TURNO_MINUTOS.map(minutos => ({ valor: String(minutos), etiqueta: `${minutos} min` }))} />} />
          </div>
          {zonaHoraria && <p className="flex items-start gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5 shrink-0" aria-hidden="true" />Hora del consultorio · {zonaHoraria}</p>}
        </section>
        {modo === "edicion" && <Controller control={formulario.control} name="estado" render={({ field: campo }) => <CampoSelect referencia={campo.ref} id={`${prefijo}-estado`} etiqueta="Estado" valor={campo.value ?? "programado"} alCambiar={campo.onChange} error={errores.estado?.message} opciones={Object.entries(ETIQUETAS_ESTADO_TURNO).map(([valor, etiqueta]) => ({ valor, etiqueta }))} />} />}
        <CampoTexto id={`${prefijo}-motivo`} etiqueta="Motivo (opcional)" maxLength={200} error={errores.motivo?.message} {...formulario.register("motivo")} />
        <details className="rounded-xl border p-4" open={!enDialogo || !!errores.notasAdministrativas}>
          <summary className="cursor-pointer text-sm font-medium">Notas administrativas (opcional)</summary>
          <div className="pt-4"><CampoArea id={`${prefijo}-notas`} etiqueta="Notas de la consulta" descripcion="Son privadas y no se muestran al paciente." error={errores.notasAdministrativas?.message} {...formulario.register("notasAdministrativas")} /></div>
        </details>
      </fieldset>
      <footer className={cn("mt-5 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t pt-5", enDialogo && "mt-0 bg-popover p-4 sm:px-7")}>
        {enDialogo && <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><LockKeyhole className="size-3.5" aria-hidden="true" />Tu agenda, organizada</p>}
        {alCancelar && <Button type="button" variant="outline" onClick={alCancelar} disabled={pendiente}>Cancelar</Button>}
        <BotonEnvio pendiente={pendiente} disabled={!pacientes.length} textoPendiente="Guardando…" icono={modo === "alta" ? CalendarPlus : Save}>{modo === "alta" ? "Agendar turno" : "Guardar cambios"}</BotonEnvio>
      </footer>
    </div>
  </form>;
}
