"use client";

import { useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { borrarPlan, guardarPlanActual } from "@/acciones/planes";
import { esquemaPlan, type DatosPlan } from "@/esquemas/plan";
import { aplicarErroresServidor } from "@/lib/formularios";
import { ETIQUETAS_MOMENTO_COMIDA, MOMENTOS_COMIDA } from "@/configuracion/clinica";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { Button } from "@/componentes/ui/button";
import { FieldGroup } from "@/componentes/ui/field";
import type { MomentoComida } from "@/tipos/entidades";

const OPCIONES_MOMENTO = MOMENTOS_COMIDA.map((valor) => ({
  valor,
  etiqueta: ETIQUETAS_MOMENTO_COMIDA[valor],
}));

type Propiedades = {
  pacienteId: string;
  planId: string;
  titulo: string;
  indicaciones: string;
  comidas: { momento: MomentoComida; detalle: string }[];
  puedeBorrar: boolean;
};

export function FormularioPlan({ pacienteId, planId, titulo, indicaciones, comidas, puedeBorrar }: Propiedades) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm<DatosPlan>({
    resolver: zodResolver(esquemaPlan),
    defaultValues: {
      planId,
      titulo,
      indicaciones,
      comidas: comidas.length > 0 ? comidas : [{ momento: "desayuno", detalle: "" }],
      publicar: false,
    },
  });
  const filas = useFieldArray({ control: formulario.control, name: "comidas" });
  const { errors: errores } = formulario.formState;

  const enviar = (publicar: boolean) =>
    formulario.handleSubmit((datos) =>
      iniciarTransicion(async () => {
        const resultado = await guardarPlanActual({ ...datos, publicar });
        if (resultado && !resultado.ok) {
          aplicarErroresServidor(formulario.setError, resultado);
          toast.error(resultado.mensaje);
          return;
        }
        toast.success(resultado?.mensaje ?? "Plan guardado.");
      }),
    )();

  const eliminar = () =>
    iniciarTransicion(async () => {
      const resultado = await borrarPlan(planId, pacienteId);
      if (resultado && !resultado.ok) toast.error(resultado.mensaje);
    });

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void enviar(false);
      }}
      noValidate
    >
      <FieldGroup>
        <CampoTexto id="plan-titulo" etiqueta="Título" error={errores.titulo?.message} {...formulario.register("titulo")} />
        <CampoArea
          id="plan-indicaciones"
          etiqueta="Indicaciones (opcional)"
          error={errores.indicaciones?.message}
          {...formulario.register("indicaciones")}
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Comidas</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={filas.fields.length >= 20}
              onClick={() => filas.append({ momento: "almuerzo", detalle: "" })}
            >
              <Plus aria-hidden="true" />
              Agregar
            </Button>
          </div>
          {typeof errores.comidas?.message === "string" && (
            <p className="text-sm text-destructive">{errores.comidas.message}</p>
          )}
          {filas.fields.map((fila, indice) => (
            <div key={fila.id} className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
              <Controller
                control={formulario.control}
                name={`comidas.${indice}.momento`}
                render={({ field: campo }) => (
                  <CampoSelect
                    id={`comida-momento-${indice}`}
                    etiqueta="Momento"
                    valor={campo.value}
                    alCambiar={campo.onChange}
                    opciones={OPCIONES_MOMENTO}
                    error={errores.comidas?.[indice]?.momento?.message}
                  />
                )}
              />
              <CampoArea
                id={`comida-detalle-${indice}`}
                etiqueta="Qué comer"
                placeholder="Ej.: yogur natural con fruta y avena"
                error={errores.comidas?.[indice]?.detalle?.message}
                {...formulario.register(`comidas.${indice}.detalle`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:mt-6"
                aria-label="Quitar comida"
                onClick={() => filas.remove(indice)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {puedeBorrar ? (
            <Button type="button" variant="outline" disabled={pendiente} onClick={eliminar}>
              <Trash2 aria-hidden="true" />
              Eliminar borrador
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Las versiones ya publicadas se conservan.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" variant="outline" icono={Save}>
              Guardar borrador
            </BotonEnvio>
            <Button type="button" disabled={pendiente} onClick={() => void enviar(true)}>
              <Send aria-hidden="true" />
              Publicar para el paciente
            </Button>
          </div>
        </div>
      </FieldGroup>
    </form>
  );
}
