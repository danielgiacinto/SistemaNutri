"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ingresar } from "@/acciones/autenticacion";
import { esquemaIngreso } from "@/esquemas/autenticacion";
import { aplicarErroresServidor } from "@/lib/formularios";
import { RUTAS } from "@/autorizacion/rutas";
import { CampoContrasena, CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioIngreso({ siguiente }: { siguiente: string | null }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const formulario = useForm({
    resolver: zodResolver(esquemaIngreso),
    defaultValues: { correo: "", contrasena: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await ingresar(datos, siguiente);
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
          id="correo"
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@ejemplo.com"
          error={errores.correo?.message}
          {...formulario.register("correo")}
        />
        <div className="space-y-2">
          <CampoContrasena
            id="contrasena"
            etiqueta="Contraseña"
            autoComplete="current-password"
            error={errores.contrasena?.message}
            {...formulario.register("contrasena")}
          />
          <Link
            href={RUTAS.recuperarContrasena}
            className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <BotonEnvio pendiente={pendiente} textoPendiente="Ingresando…" size="lg" className="h-10 w-full">
          Ingresar
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
