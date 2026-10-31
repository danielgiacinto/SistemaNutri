"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { registrarMedicion } from "@/acciones/mediciones";
import { esquemaAltaMedicion, type DatosAltaMedicion } from "@/esquemas/medicion";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoCasilla } from "@/componentes/formularios/campo-casilla";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { useCerrarVentana } from "@/componentes/comunes/ventana-formulario";

export function FormularioMedicion({
  pacienteId,
  fechaPredeterminada,
  horaPredeterminada,
}: {
  pacienteId: string;
  fechaPredeterminada: string;
  horaPredeterminada: string;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const cerrar = useCerrarVentana();
  const formulario = useForm({
    resolver: zodResolver(esquemaAltaMedicion),
    defaultValues: {
      pacienteId,
      fecha: fechaPredeterminada,
      hora: horaPredeterminada,
      pesoKg: "",
      tallaCm: "",
      circunferenciaCinturaCm: "",
      circunferenciaCaderaCm: "",
      porcentajeGrasa: "",
      masaMuscularKg: "",
      observaciones: "",
      visibleParaPaciente: false,
    },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarMedicion(datos as DatosAltaMedicion);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (resultado?.ok) {
        toast.success(resultado.mensaje ?? "Medición registrada.");
        cerrar();
        formulario.reset({
          ...formulario.getValues(),
          pesoKg: "",
          tallaCm: "",
          circunferenciaCinturaCm: "",
          circunferenciaCaderaCm: "",
          porcentajeGrasa: "",
          masaMuscularKg: "",
          observaciones: "",
        });
      }
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto id="medicion-fecha" etiqueta="Fecha" type="date" error={errores.fecha?.message} {...formulario.register("fecha")} />
          <CampoTexto id="medicion-hora" etiqueta="Hora" type="time" error={errores.hora?.message} {...formulario.register("hora")} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoTexto id="medicion-peso" etiqueta="Peso (kg)" inputMode="decimal" error={errores.pesoKg?.message} {...formulario.register("pesoKg")} />
          <CampoTexto id="medicion-talla" etiqueta="Talla (cm)" inputMode="decimal" error={errores.tallaCm?.message} {...formulario.register("tallaCm")} />
          <CampoTexto id="medicion-grasa" etiqueta="% grasa (opcional)" inputMode="decimal" error={errores.porcentajeGrasa?.message} {...formulario.register("porcentajeGrasa")} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoTexto id="medicion-cintura" etiqueta="Cintura (cm)" inputMode="decimal" error={errores.circunferenciaCinturaCm?.message} {...formulario.register("circunferenciaCinturaCm")} />
          <CampoTexto id="medicion-cadera" etiqueta="Cadera (cm)" inputMode="decimal" error={errores.circunferenciaCaderaCm?.message} {...formulario.register("circunferenciaCaderaCm")} />
          <CampoTexto id="medicion-musculo" etiqueta="Masa muscular (kg)" inputMode="decimal" error={errores.masaMuscularKg?.message} {...formulario.register("masaMuscularKg")} />
        </div>
        <CampoArea id="medicion-obs" etiqueta="Observaciones (opcional)" error={errores.observaciones?.message} {...formulario.register("observaciones")} />
        <Controller
          control={formulario.control}
          name="visibleParaPaciente"
          render={({ field: campo }) => (
            <CampoCasilla
              id="medicion-visible"
              etiqueta="Visible para el paciente"
              checked={campo.value}
              onChange={campo.onChange}
              descripcion="Si está desmarcada, la medición queda solo en la ficha profesional."
            />
          )}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={Scale}>
            Registrar medición
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
