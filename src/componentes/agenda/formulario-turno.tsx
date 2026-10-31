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
  duracionPredeterminada: number;
  inicial?: Partial<DatosEdicionTurno>;
  modo: "alta" | "edicion";
};

export function FormularioTurno({ pacientes, duracionPredeterminada, inicial, modo }: Propiedades) {
  const [pendiente, iniciarTransicion] = useTransition();
  const duracionInicial = (DURACIONES_TURNO_MINUTOS as readonly number[]).includes(duracionPredeterminada)
    ? duracionPredeterminada
    : 45;

  const formulario = useForm<DatosEdicionTurno>({
    resolver: zodResolver(modo === "edicion" ? esquemaEdicionTurno : esquemaAltaTurno) as unknown as Resolver<DatosEdicionTurno>,
    defaultValues: {
      turnoId: inicial?.turnoId ?? "",
      pacienteId: inicial?.pacienteId ?? "",
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
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoTexto id="turno-fecha" etiqueta="Fecha" type="date" error={errores.fecha?.message} {...formulario.register("fecha")} />
          <CampoTexto id="turno-hora" etiqueta="Hora de inicio" type="time" error={errores.hora?.message} {...formulario.register("hora")} />
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
        <div className="grid gap-5 sm:grid-cols-2">
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
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={modo === "alta" ? CalendarPlus : Save} size="lg">
            {modo === "alta" ? "Agendar turno" : "Guardar cambios"}
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
