"use client";

import { useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ClipboardPen, Save } from "lucide-react";
import { guardarEvolucion, registrarEvolucion } from "@/acciones/evoluciones";
import { esquemaAltaEvolucion, esquemaEdicionEvolucion, type DatosAltaEvolucion, type DatosEdicionEvolucion } from "@/esquemas/evolucion";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { CampoCasilla } from "@/componentes/formularios/campo-casilla";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { formatearFechaHora } from "@/lib/fechas";
import { ETIQUETAS_TIPO_CONSULTA } from "@/configuracion/clinica";
import type { Turno } from "@/tipos/entidades";

type Propiedades = {
  pacienteId: string;
  zonaHoraria: string;
  turnos: Turno[];
  inicial?: Partial<DatosEdicionEvolucion>;
  modo: "alta" | "edicion";
};

export function FormularioEvolucion({ pacienteId, zonaHoraria, turnos, inicial, modo }: Propiedades) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm<DatosEdicionEvolucion>({
    resolver: zodResolver(modo === "edicion" ? esquemaEdicionEvolucion : esquemaAltaEvolucion) as unknown as Resolver<DatosEdicionEvolucion>,
    defaultValues: {
      evolucionId: inicial?.evolucionId ?? "",
      pacienteId,
      turnoId: inicial?.turnoId ?? "",
      titulo: inicial?.titulo ?? "",
      contenido: inicial?.contenido ?? "",
      observaciones: inicial?.observaciones ?? "",
      indicaciones: inicial?.indicaciones ?? "",
      esBorrador: inicial?.esBorrador ?? true,
      visibleParaPaciente: inicial?.visibleParaPaciente ?? false,
    },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado =
        modo === "edicion"
          ? await guardarEvolucion(datos as DatosEdicionEvolucion)
          : await registrarEvolucion(datos as DatosAltaEvolucion);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (modo === "edicion" && resultado?.ok) toast.success(resultado.mensaje ?? "Evolución guardada.");
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoTexto
          id="evolucion-titulo"
          etiqueta="Título (opcional)"
          placeholder="Ej.: Control mensual, primera consulta"
          error={errores.titulo?.message}
          {...formulario.register("titulo")}
        />
        <Controller
          control={formulario.control}
          name="turnoId"
          render={({ field: campo }) => (
            <CampoSelect
              id="evolucion-turno"
              etiqueta="Turno asociado (opcional)"
              valor={campo.value || "ninguno"}
              alCambiar={(valor) => campo.onChange(valor === "ninguno" ? "" : valor)}
              error={errores.turnoId?.message}
              opciones={[
                { valor: "ninguno", etiqueta: "Sin turno asociado" },
                ...turnos.map((turno) => ({
                  valor: turno.id,
                  etiqueta: `${formatearFechaHora(new Date(turno.inicio), zonaHoraria)} · ${ETIQUETAS_TIPO_CONSULTA[turno.tipo]}`,
                })),
              ]}
            />
          )}
        />
        <CampoArea
          id="evolucion-contenido"
          etiqueta="Detalle de la consulta"
          className="min-h-40"
          descripcion="Lo ocurrido en la sesión. Por defecto es privado."
          error={errores.contenido?.message}
          {...formulario.register("contenido")}
        />
        <CampoArea
          id="evolucion-observaciones"
          etiqueta="Observaciones y dificultades (opcional)"
          error={errores.observaciones?.message}
          {...formulario.register("observaciones")}
        />
        <CampoArea
          id="evolucion-indicaciones"
          etiqueta="Indicaciones y acuerdos (opcional)"
          error={errores.indicaciones?.message}
          {...formulario.register("indicaciones")}
        />
        <Controller
          control={formulario.control}
          name="esBorrador"
          render={({ field: borrador }) => (
            <>
              <CampoCasilla
                id="evolucion-borrador"
                etiqueta="Guardar como borrador"
                checked={borrador.value}
                onChange={(valor) => {
                  borrador.onChange(valor);
                  if (valor) formulario.setValue("visibleParaPaciente", false);
                }}
                descripcion="Los borradores no se consideran publicados en la historia."
              />
              <Controller
                control={formulario.control}
                name="visibleParaPaciente"
                render={({ field: visible }) => (
                  <CampoCasilla
                    id="evolucion-visible"
                    etiqueta="Compartir con el paciente"
                    checked={visible.value}
                    onChange={visible.onChange}
                    descripcion={
                      borrador.value
                        ? "Publicá la nota para poder compartirla. El portal del paciente se habilita en una etapa posterior."
                        : "El paciente verá esta nota cuando exista el portal. Hasta entonces queda marcada como compartible."
                    }
                    error={errores.visibleParaPaciente?.message}
                  />
                )}
              />
            </>
          )}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" icono={modo === "alta" ? ClipboardPen : Save} size="lg">
            {modo === "alta" ? "Guardar evolución" : "Guardar cambios"}
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
