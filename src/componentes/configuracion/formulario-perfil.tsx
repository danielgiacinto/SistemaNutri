"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { actualizarPerfil } from "@/acciones/perfil";
import { esquemaDatosPerfil, type DatosPerfil } from "@/esquemas/perfil";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioPerfil({ inicial, correo }: { inicial: DatosPerfil; correo: string | null }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm({
    resolver: zodResolver(esquemaDatosPerfil),
    defaultValues: inicial,
  });
  const { errors: errores, isDirty: hayCambios } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await actualizarPerfil(datos);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      formulario.reset(datos);
      toast.success(resultado.mensaje ?? "Cambios guardados.");
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="perfil-nombre"
            etiqueta="Nombre"
            autoComplete="given-name"
            error={errores.nombre?.message}
            {...formulario.register("nombre")}
          />
          <CampoTexto
            id="perfil-apellido"
            etiqueta="Apellido"
            autoComplete="family-name"
            error={errores.apellido?.message}
            {...formulario.register("apellido")}
          />
        </div>
        <CampoTexto
          id="perfil-correo"
          etiqueta="Correo electrónico"
          value={correo ?? ""}
          readOnly
          disabled
          descripcion="El correo se usa para ingresar y no se puede cambiar desde acá."
        />
        <div className="flex justify-end">
          <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" disabled={!hayCambios}>
            Guardar cambios
          </BotonEnvio>
        </div>
      </FieldGroup>
    </form>
  );
}
