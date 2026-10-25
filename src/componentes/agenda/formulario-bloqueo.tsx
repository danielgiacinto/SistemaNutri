"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registrarBloqueo } from "@/acciones/agenda";
import { esquemaBloqueoAgenda, type DatosBloqueoAgenda } from "@/esquemas/agenda";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioBloqueo({ fechaPredeterminada }: { fechaPredeterminada: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm({
    resolver: zodResolver(esquemaBloqueoAgenda),
    defaultValues: { fecha: fechaPredeterminada, horaInicio: "13:00", horaFin: "14:00", motivo: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarBloqueo(datos as DatosBloqueoAgenda);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      toast.success(resultado.mensaje);
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate className="rounded-2xl border p-4">
      <FieldGroup>
        <CampoTexto id="bloqueo-fecha" etiqueta="Fecha" type="date" error={errores.fecha?.message} {...formulario.register("fecha")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto id="bloqueo-inicio" etiqueta="Desde" type="time" error={errores.horaInicio?.message} {...formulario.register("horaInicio")} />
          <CampoTexto id="bloqueo-fin" etiqueta="Hasta" type="time" error={errores.horaFin?.message} {...formulario.register("horaFin")} />
        </div>
        <CampoTexto id="bloqueo-motivo" etiqueta="Motivo (opcional)" error={errores.motivo?.message} {...formulario.register("motivo")} />
        <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…">
          Bloquear horario
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
