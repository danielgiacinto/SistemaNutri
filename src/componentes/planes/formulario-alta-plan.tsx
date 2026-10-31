"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { registrarPlan } from "@/acciones/planes";
import { esquemaAltaPlan, type DatosAltaPlan } from "@/esquemas/plan";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioAltaPlan({ pacienteId }: { pacienteId: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm<DatosAltaPlan>({
    resolver: zodResolver(esquemaAltaPlan),
    defaultValues: { pacienteId, titulo: "", indicaciones: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarPlan(datos);
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
          id="plan-titulo"
          etiqueta="Título"
          placeholder="Ej.: Plan de descenso, menú de mantenimiento"
          error={errores.titulo?.message}
          {...formulario.register("titulo")}
        />
        <CampoArea
          id="plan-indicaciones"
          etiqueta="Indicaciones (opcional)"
          descripcion="Aclaraciones generales. Las comidas se cargan en el paso siguiente."
          error={errores.indicaciones?.message}
          {...formulario.register("indicaciones")}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Creando…" icono={Plus}>
            Crear borrador
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
