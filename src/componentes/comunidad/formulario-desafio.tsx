"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registrarDesafio } from "@/acciones/comunidad";
import { esquemaAltaDesafio, type DatosAltaDesafio } from "@/esquemas/comunidad";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioDesafio() {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm<DatosAltaDesafio>({
    resolver: zodResolver(esquemaAltaDesafio),
    defaultValues: { titulo: "", consigna: "", inicio: "", fin: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarDesafio(datos);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      formulario.reset();
      toast.success(resultado.mensaje ?? "Desafío creado.");
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoTexto
          id="desafio-titulo"
          etiqueta="Título"
          placeholder="Ej.: Caminatas de la semana"
          error={errores.titulo?.message}
          {...formulario.register("titulo")}
        />
        <CampoArea
          id="desafio-consigna"
          etiqueta="Consigna"
          descripcion="Qué van a hacer. No hace falta ningún dato clínico."
          error={errores.consigna?.message}
          {...formulario.register("consigna")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto id="desafio-inicio" etiqueta="Inicio" type="date" error={errores.inicio?.message} {...formulario.register("inicio")} />
          <CampoTexto id="desafio-fin" etiqueta="Fin" type="date" error={errores.fin?.message} {...formulario.register("fin")} />
        </div>
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Creando…">
            Crear borrador
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
