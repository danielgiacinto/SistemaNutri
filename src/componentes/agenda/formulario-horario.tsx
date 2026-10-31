"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { registrarHorario } from "@/acciones/agenda";
import { esquemaHorarioAtencion, type DatosHorarioAtencion } from "@/esquemas/agenda";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { DIAS_SEMANA } from "@/configuracion/clinica";
import { useCerrarVentana } from "@/componentes/comunes/ventana-formulario";

export function FormularioHorario() {
  const [pendiente, iniciarTransicion] = useTransition();
  const cerrar = useCerrarVentana();
  const formulario = useForm({
    resolver: zodResolver(esquemaHorarioAtencion),
    defaultValues: { diaSemana: 1, horaInicio: "09:00", horaFin: "13:00" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarHorario(datos as DatosHorarioAtencion);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      toast.success(resultado.mensaje);
      cerrar();
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <Controller
          control={formulario.control}
          name="diaSemana"
          render={({ field: campo }) => (
            <CampoSelect
              id="horario-dia"
              etiqueta="Día"
              valor={String(campo.value)}
              alCambiar={(valor) => campo.onChange(Number(valor))}
              error={errores.diaSemana?.message}
              opciones={DIAS_SEMANA.map((dia) => ({ valor: String(dia.iso), etiqueta: dia.etiqueta }))}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto id="horario-inicio" etiqueta="Desde" type="time" error={errores.horaInicio?.message} {...formulario.register("horaInicio")} />
          <CampoTexto id="horario-fin" etiqueta="Hasta" type="time" error={errores.horaFin?.message} {...formulario.register("horaFin")} />
        </div>
        <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={Clock}>
          Agregar horario
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
