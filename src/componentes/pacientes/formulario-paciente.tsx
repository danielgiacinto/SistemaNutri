"use client";

import { useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registrarPaciente, guardarPaciente } from "@/acciones/pacientes";
import {
  esquemaAltaPaciente,
  esquemaEdicionPaciente,
  type DatosAltaPaciente,
  type DatosEdicionPaciente,
} from "@/esquemas/paciente";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { ETIQUETAS_ESTADO_PACIENTE } from "@/configuracion/clinica";

type PropiedadesAlta = { modo: "alta" };
type PropiedadesEdicion = {
  modo: "edicion";
  pacienteId: string;
  inicial: DatosEdicionPaciente;
};

export function FormularioPaciente(propiedades: PropiedadesAlta | PropiedadesEdicion) {
  const [pendiente, iniciarTransicion] = useTransition();
  const esEdicion = propiedades.modo === "edicion";
  const formulario = useForm<DatosEdicionPaciente>({
    resolver: zodResolver(esEdicion ? esquemaEdicionPaciente : esquemaAltaPaciente) as unknown as Resolver<DatosEdicionPaciente>,
    defaultValues: esEdicion
      ? propiedades.inicial
      : {
          nombre: "",
          apellido: "",
          correo: "",
          telefono: "",
          documento: "",
          fechaNacimiento: "",
          notasAdministrativas: "",
          estado: "activo",
        },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = esEdicion
        ? await guardarPaciente(propiedades.pacienteId, datos as DatosEdicionPaciente)
        : await registrarPaciente(datos as DatosAltaPaciente);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (esEdicion && resultado?.ok) {
        toast.success(resultado.mensaje ?? "Cambios guardados.");
        formulario.reset(datos);
      }
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="paciente-nombre"
            etiqueta="Nombre"
            autoComplete="given-name"
            error={errores.nombre?.message}
            {...formulario.register("nombre")}
          />
          <CampoTexto
            id="paciente-apellido"
            etiqueta="Apellido"
            autoComplete="family-name"
            error={errores.apellido?.message}
            {...formulario.register("apellido")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="paciente-correo"
            etiqueta="Correo (opcional)"
            type="email"
            autoComplete="email"
            descripcion="Se usará más adelante para invitarlo al portal."
            error={errores.correo?.message}
            {...formulario.register("correo")}
          />
          <CampoTexto
            id="paciente-telefono"
            etiqueta="Teléfono (opcional)"
            type="tel"
            autoComplete="tel"
            error={errores.telefono?.message}
            {...formulario.register("telefono")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="paciente-documento"
            etiqueta="Documento (opcional)"
            error={errores.documento?.message}
            {...formulario.register("documento")}
          />
          <CampoTexto
            id="paciente-nacimiento"
            etiqueta="Fecha de nacimiento (opcional)"
            type="date"
            error={errores.fechaNacimiento?.message}
            {...formulario.register("fechaNacimiento")}
          />
        </div>
        {esEdicion && (
          <Controller
            control={formulario.control}
            name="estado"
            render={({ field: campo }) => (
              <CampoSelect
                id="paciente-estado"
                etiqueta="Estado"
                valor={campo.value}
                alCambiar={campo.onChange}
                error={errores.estado?.message}
                opciones={[
                  { valor: "activo", etiqueta: ETIQUETAS_ESTADO_PACIENTE.activo },
                  { valor: "inactivo", etiqueta: ETIQUETAS_ESTADO_PACIENTE.inactivo },
                ]}
              />
            )}
          />
        )}
        <CampoArea
          id="paciente-notas"
          etiqueta="Notas administrativas (opcional)"
          descripcion="Preferencias de horario, cómo llega, recados. No forma parte de la historia clínica."
          error={errores.notasAdministrativas?.message}
          {...formulario.register("notasAdministrativas")}
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente={esEdicion ? "Guardando…" : "Registrando…"} size="lg">
            {esEdicion ? "Guardar cambios" : "Registrar paciente"}
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
