"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { restablecerContrasena } from "@/acciones/autenticacion";
import { esquemaRestablecimiento } from "@/esquemas/autenticacion";
import { aplicarErroresServidor } from "@/lib/formularios";
import { RUTAS } from "@/autorizacion/rutas";
import { CampoContrasena } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioRestablecimiento() {
  const enrutador = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm({
    resolver: zodResolver(esquemaRestablecimiento),
    defaultValues: { contrasena: "", confirmacion: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await restablecerContrasena(datos);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      toast.success(resultado.mensaje);
      enrutador.replace(RUTAS.destino);
    }),
  );

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <CampoContrasena
          id="contrasena"
          etiqueta="Nueva contraseña"
          autoComplete="new-password"
          descripcion="Al menos 8 caracteres, con letras y números."
          error={errores.contrasena?.message}
          {...formulario.register("contrasena")}
        />
        <CampoContrasena
          id="confirmacion"
          etiqueta="Repetí la nueva contraseña"
          autoComplete="new-password"
          error={errores.confirmacion?.message}
          {...formulario.register("confirmacion")}
        />
        <BotonEnvio pendiente={pendiente} textoPendiente="Guardando…" size="lg" className="h-10 w-full">
          Guardar contraseña
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
