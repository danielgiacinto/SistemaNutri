"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { crearConsultorio } from "@/acciones/consultorio";
import { esquemaAltaConsultorio } from "@/esquemas/consultorio";
import { aplicarErroresServidor } from "@/lib/formularios";
import { ZONA_HORARIA_PREDETERMINADA } from "@/configuracion/producto";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { SelectorZonaHoraria } from "@/componentes/formularios/selector-zona-horaria";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioAltaConsultorio() {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm({
    resolver: zodResolver(esquemaAltaConsultorio),
    defaultValues: { nombre: "", zonaHoraria: ZONA_HORARIA_PREDETERMINADA },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await crearConsultorio(datos);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
      }
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoTexto
          id="alta-nombre"
          etiqueta="Nombre del consultorio"
          placeholder="Ej.: Consultorio Lic. Pérez"
          autoComplete="organization"
          descripcion="Podés cambiarlo más adelante desde Configuración."
          error={errores.nombre?.message}
          {...formulario.register("nombre")}
        />
        <Controller
          control={formulario.control}
          name="zonaHoraria"
          render={({ field: campo }) => (
            <SelectorZonaHoraria
              id="alta-zona"
              valor={campo.value}
              alCambiar={campo.onChange}
              error={errores.zonaHoraria?.message}
            />
          )}
        />
        <BotonEnvio pendiente={pendiente} textoPendiente="Creando consultorio…" icono={Building2} size="lg" className="h-10 w-full">
          Crear mi consultorio
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
