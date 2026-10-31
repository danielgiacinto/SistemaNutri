"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registrarActividad } from "@/acciones/comunidad";
import { esquemaActividad, type DatosActividad } from "@/esquemas/comunidad";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioActividad({ desafioId }: { desafioId: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm<DatosActividad>({
    resolver: zodResolver(esquemaActividad),
    defaultValues: { desafioId, texto: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarActividad(datos);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      formulario.reset({ desafioId, texto: "" });
      toast.success(resultado.mensaje ?? "Actividad publicada.");
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoArea
          id={`actividad-${desafioId}`}
          etiqueta="Tu actividad"
          descripcion="Contá qué hiciste, en tus palabras. Hasta 280 caracteres."
          error={errores.texto?.message}
          {...formulario.register("texto")}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Publicando…">
            Publicar
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
