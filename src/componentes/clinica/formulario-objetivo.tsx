"use client";

import { useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save, Target } from "lucide-react";
import { guardarObjetivo, registrarObjetivo } from "@/acciones/objetivos";
import { esquemaAltaObjetivo, esquemaEdicionObjetivo, type DatosAltaObjetivo, type DatosEdicionObjetivo } from "@/esquemas/objetivo";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { CampoCasilla } from "@/componentes/formularios/campo-casilla";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { useCerrarVentana } from "@/componentes/comunes/ventana-formulario";
import { ETIQUETAS_CATEGORIA_OBJETIVO, ETIQUETAS_ESTADO_OBJETIVO } from "@/configuracion/clinica";

type Propiedades = {
  pacienteId: string;
  inicial?: Partial<DatosEdicionObjetivo>;
  modo: "alta" | "edicion";
};

export function FormularioObjetivo({ pacienteId, inicial, modo }: Propiedades) {
  const [pendiente, iniciarTransicion] = useTransition();
  const cerrar = useCerrarVentana();
  const formulario = useForm<DatosEdicionObjetivo>({
    resolver: zodResolver(modo === "edicion" ? esquemaEdicionObjetivo : esquemaAltaObjetivo) as unknown as Resolver<DatosEdicionObjetivo>,
    defaultValues: {
      objetivoId: inicial?.objetivoId ?? "",
      pacienteId,
      titulo: inicial?.titulo ?? "",
      descripcion: inicial?.descripcion ?? "",
      categoria: inicial?.categoria ?? "otro",
      fechaObjetivo: inicial?.fechaObjetivo ?? "",
      estado: inicial?.estado ?? "pendiente",
      progreso: inicial?.progreso ?? "",
      valorInicial: inicial?.valorInicial ?? "",
      valorObjetivo: inicial?.valorObjetivo ?? "",
      unidad: inicial?.unidad ?? "",
      observaciones: inicial?.observaciones ?? "",
      visibleParaPaciente: inicial?.visibleParaPaciente ?? false,
    },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado =
        modo === "edicion" ? await guardarObjetivo(datos as DatosEdicionObjetivo) : await registrarObjetivo(datos as DatosAltaObjetivo);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (resultado?.ok) {
        toast.success(resultado.mensaje ?? "Objetivo guardado.");
        if (modo === "alta") formulario.reset();
        cerrar();
      }
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoTexto id="objetivo-titulo" etiqueta="Título" error={errores.titulo?.message} {...formulario.register("titulo")} />
        <CampoArea
          id="objetivo-descripcion"
          etiqueta="Descripción (opcional)"
          error={errores.descripcion?.message}
          {...formulario.register("descripcion")}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Controller
            control={formulario.control}
            name="categoria"
            render={({ field: campo }) => (
              <CampoSelect
                id="objetivo-categoria"
                etiqueta="Categoría"
                valor={campo.value}
                alCambiar={campo.onChange}
                error={errores.categoria?.message}
                opciones={Object.entries(ETIQUETAS_CATEGORIA_OBJETIVO).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
              />
            )}
          />
          <Controller
            control={formulario.control}
            name="estado"
            render={({ field: campo }) => (
              <CampoSelect
                id="objetivo-estado"
                etiqueta="Estado"
                valor={campo.value}
                alCambiar={campo.onChange}
                error={errores.estado?.message}
                opciones={Object.entries(ETIQUETAS_ESTADO_OBJETIVO).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
              />
            )}
          />
          <CampoTexto
            id="objetivo-fecha"
            etiqueta="Fecha objetivo (opcional)"
            type="date"
            error={errores.fechaObjetivo?.message}
            {...formulario.register("fechaObjetivo")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-4">
          <CampoTexto id="objetivo-progreso" etiqueta="Progreso % (opcional)" inputMode="decimal" error={errores.progreso?.message} {...formulario.register("progreso")} />
          <CampoTexto id="objetivo-inicial" etiqueta="Valor inicial (opcional)" inputMode="decimal" error={errores.valorInicial?.message} {...formulario.register("valorInicial")} />
          <CampoTexto id="objetivo-valor" etiqueta="Valor buscado (opcional)" inputMode="decimal" error={errores.valorObjetivo?.message} {...formulario.register("valorObjetivo")} />
          <CampoTexto id="objetivo-unidad" etiqueta="Unidad (opcional)" placeholder="kg, pasos…" error={errores.unidad?.message} {...formulario.register("unidad")} />
        </div>
        <CampoArea
          id="objetivo-observaciones"
          etiqueta="Observaciones (opcional)"
          error={errores.observaciones?.message}
          {...formulario.register("observaciones")}
        />
        <Controller
          control={formulario.control}
          name="visibleParaPaciente"
          render={({ field: campo }) => (
            <CampoCasilla
              id="objetivo-visible"
              etiqueta="Visible para el paciente"
              checked={campo.value}
              onChange={campo.onChange}
              descripcion="Si está desmarcado, el objetivo queda solo en la ficha profesional."
            />
          )}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={modo === "alta" ? Target : Save}>
            {modo === "alta" ? "Agregar objetivo" : "Guardar cambios"}
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
