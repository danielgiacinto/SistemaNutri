"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { actualizarConsultorio } from "@/acciones/consultorio";
import { esquemaDatosConsultorio, type DatosConsultorio } from "@/esquemas/consultorio";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { SelectorZonaHoraria } from "@/componentes/formularios/selector-zona-horaria";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { DURACIONES_TURNO_MINUTOS } from "@/configuracion/clinica";

export function FormularioConsultorio({ inicial }: { inicial: DatosConsultorio }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm({
    resolver: zodResolver(esquemaDatosConsultorio),
    defaultValues: inicial,
  });
  const { errors: errores, isDirty: hayCambios } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await actualizarConsultorio(datos);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      formulario.reset({
        ...datos,
        telefono: datos.telefono ?? "",
        direccion: datos.direccion ?? "",
        duracionTurnoMinutos: datos.duracionTurnoMinutos,
      });
      toast.success(resultado.mensaje ?? "Cambios guardados.");
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoTexto
          id="consultorio-nombre"
          etiqueta="Nombre del consultorio"
          autoComplete="organization"
          error={errores.nombre?.message}
          {...formulario.register("nombre")}
        />
        <Controller
          control={formulario.control}
          name="zonaHoraria"
          render={({ field: campo }) => (
            <SelectorZonaHoraria
              id="consultorio-zona"
              valor={campo.value}
              alCambiar={campo.onChange}
              error={errores.zonaHoraria?.message}
            />
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="consultorio-telefono"
            etiqueta="Teléfono (opcional)"
            type="tel"
            autoComplete="tel"
            error={errores.telefono?.message}
            {...formulario.register("telefono")}
          />
          <CampoTexto
            id="consultorio-direccion"
            etiqueta="Dirección (opcional)"
            autoComplete="street-address"
            error={errores.direccion?.message}
            {...formulario.register("direccion")}
          />
        </div>
        <Controller
          control={formulario.control}
          name="duracionTurnoMinutos"
          render={({ field: campo }) => (
            <CampoSelect
              id="consultorio-duracion"
              etiqueta="Duración predeterminada de los turnos"
              valor={String(campo.value)}
              alCambiar={(valor) => campo.onChange(Number(valor))}
              error={errores.duracionTurnoMinutos?.message}
              opciones={DURACIONES_TURNO_MINUTOS.map((minutos) => ({
                valor: String(minutos),
                etiqueta: `${minutos} minutos`,
              }))}
            />
          )}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={Save} disabled={!hayCambios}>
            Guardar cambios
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
