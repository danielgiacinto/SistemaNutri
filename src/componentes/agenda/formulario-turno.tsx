"use client";

import { useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarPlus, Save } from "lucide-react";
import { guardarTurno, registrarTurno } from "@/acciones/turnos";
import { esquemaAltaTurno, esquemaEdicionTurno, type DatosAltaTurno, type DatosEdicionTurno } from "@/esquemas/turno";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import {
  DURACIONES_TURNO_MINUTOS,
  ETIQUETAS_ESTADO_TURNO,
  ETIQUETAS_TIPO_CONSULTA,
} from "@/configuracion/clinica";

type PacienteOpcion = { id: string; nombre: string; apellido: string };

type Propiedades = {
  pacientes: PacienteOpcion[];
  servicios?: { id: string; nombre: string; precio: number; moneda: string }[];
  duracionPredeterminada: number;
  inicial?: Partial<DatosEdicionTurno>;
  modo: "alta" | "edicion";
};

export function FormularioTurno({ pacientes, duracionPredeterminada, inicial, modo, servicios = [] }: Propiedades) {
  const [pendiente, iniciarTransicion] = useTransition();
  const duracionInicial = (DURACIONES_TURNO_MINUTOS as readonly number[]).includes(duracionPredeterminada)
    ? duracionPredeterminada
    : 45;

  const formulario = useForm<DatosEdicionTurno>({
    resolver: zodResolver(modo === "edicion" ? esquemaEdicionTurno : esquemaAltaTurno) as unknown as Resolver<DatosEdicionTurno>,
    defaultValues: {
      turnoId: inicial?.turnoId ?? "",
      pacienteId: inicial?.pacienteId ?? "",
      servicioId: inicial?.servicioId ?? "",
      fecha: inicial?.fecha ?? "",
      hora: inicial?.hora ?? "09:00",
      duracionMinutos: inicial?.duracionMinutos ?? duracionInicial,
      tipo: inicial?.tipo ?? "seguimiento",
      motivo: inicial?.motivo ?? "",
      notasAdministrativas: inicial?.notasAdministrativas ?? "",
      estado: inicial?.estado ?? "programado",
    },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado =
        modo === "edicion" ? await guardarTurno(datos as DatosEdicionTurno) : await registrarTurno(datos as DatosAltaTurno);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (modo === "edicion" && resultado?.ok) toast.success(resultado.mensaje ?? "Turno actualizado.");
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        {modo === "alta" && <Controller control={formulario.control} name="servicioId" render={({field: campo}) => (
          <CampoSelect id="turno-servicio" etiqueta="Servicio y precio" valor={campo.value || "sin_configurar"} alCambiar={v=>campo.onChange(v === "sin_configurar" ? "" : v)} opciones={[
            {valor:"sin_configurar",etiqueta:"Sin configurar (no se genera un cobro)"},
            ...servicios.map(s=>({valor:s.id,etiqueta:`${s.nombre} · ${s.precio === 0 ? "Sin cargo" : `${s.precio} ${s.moneda}`}`}))
          ]} />
        )} />}

        <Controller
          control={formulario.control}
          name="pacienteId"
          render={({ field: campo }) => (
            <CampoSelect
              id="turno-paciente"
              etiqueta="Paciente"
              valor={campo.value}
              alCambiar={campo.onChange}
              error={errores.pacienteId?.message}
              placeholder="Elegí un paciente"
              opciones={pacientes.map((paciente) => ({
                valor: paciente.id,
                etiqueta: `${paciente.apellido}, ${paciente.nombre}`,
              }))}
            />
          )}
        />
        <div className="grid gap-5 [&>*]:min-w-0 sm:grid-cols-3">
          <Controller
            control={formulario.control}
            name="fecha"
            render={({ field: campo }) => (
              <CampoTexto
                id="turno-fecha"
                etiqueta="Fecha"
                type="date"
                error={errores.fecha?.message}
                {...campo}
                value={campo.value ?? ""}
              />
            )}
          />
          <Controller
            control={formulario.control}
            name="hora"
            render={({ field: campo }) => (
              <CampoTexto
                id="turno-hora"
                etiqueta="Hora de inicio"
                type="time"
                error={errores.hora?.message}
                {...campo}
                value={campo.value ?? ""}
              />
            )}
          />
          <Controller
            control={formulario.control}
            name="duracionMinutos"
            render={({ field: campo }) => (
              <CampoSelect
                id="turno-duracion"
                etiqueta="Duración"
                valor={String(campo.value)}
                alCambiar={(valor) => campo.onChange(Number(valor))}
                error={errores.duracionMinutos?.message}
                opciones={DURACIONES_TURNO_MINUTOS.map((minutos) => ({
                  valor: String(minutos),
                  etiqueta: `${minutos} min`,
                }))}
              />
            )}
          />
        </div>
        <div className="grid gap-5 [&>*]:min-w-0 sm:grid-cols-2">
          <Controller
            control={formulario.control}
            name="tipo"
            render={({ field: campo }) => (
              <CampoSelect
                id="turno-tipo"
                etiqueta="Tipo de consulta"
                valor={campo.value}
                alCambiar={campo.onChange}
                error={errores.tipo?.message}
                opciones={Object.entries(ETIQUETAS_TIPO_CONSULTA).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
              />
            )}
          />
          {modo === "edicion" && (
            <Controller
              control={formulario.control}
              name="estado"
              render={({ field: campo }) => (
                <CampoSelect
                  id="turno-estado"
                  etiqueta="Estado"
                  valor={campo.value ?? "programado"}
                  alCambiar={campo.onChange}
                  error={errores.estado?.message}
                  opciones={Object.entries(ETIQUETAS_ESTADO_TURNO).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
                />
              )}
            />
          )}
        </div>
        <CampoTexto id="turno-motivo" etiqueta="Motivo (opcional)" error={errores.motivo?.message} {...formulario.register("motivo")} />
        <CampoArea
          id="turno-notas"
          etiqueta="Notas administrativas (opcional)"
          descripcion="No se muestran al paciente."
          error={errores.notasAdministrativas?.message}
          {...formulario.register("notasAdministrativas")}
        />
        <div className="flex justify-end border-t pt-5 [&>button]:w-full sm:[&>button]:w-auto">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={modo === "alta" ? CalendarPlus : Save} size="lg">
            {modo === "alta" ? "Agendar turno" : "Guardar cambios"}
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
