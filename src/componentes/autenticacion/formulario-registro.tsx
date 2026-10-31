"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, MailCheck, RotateCcw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { reenviarConfirmacion, registrarse } from "@/acciones/autenticacion";
import { esquemaRegistro } from "@/esquemas/autenticacion";
import { aplicarErroresServidor } from "@/lib/formularios";
import { RUTAS, rutaConSiguiente } from "@/autorizacion/rutas";
import { CampoContrasena, CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";
import { Button } from "@/componentes/ui/button";

export function FormularioRegistro({ siguiente }: { siguiente: string | null }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [correoEnviado, setCorreoEnviado] = useState<string | null>(null);
  const formulario = useForm({
    resolver: zodResolver(esquemaRegistro),
    defaultValues: { nombre: "", apellido: "", correo: "", contrasena: "", confirmacion: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await registrarse(datos, siguiente);
      if (!resultado) return;
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      setCorreoEnviado(datos.correo);
    }),
  );

  const reenviar = () =>
    iniciarTransicion(async () => {
      if (!correoEnviado) return;
      const resultado = await reenviarConfirmacion(correoEnviado, siguiente);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      toast.success(resultado.mensaje);
    });

  if (correoEnviado) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Revisá tu correo</h2>
          <p className="text-sm text-muted-foreground">
            Si <strong className="text-foreground">{correoEnviado}</strong> es una cuenta nueva, te enviamos un enlace
            para confirmarla. Puede tardar un minuto; mirá también spam.
          </p>
          <p className="text-sm text-muted-foreground">
            Si ya habías confirmado esa cuenta, no llega un correo nuevo. Ingresá con tu contraseña o restablecela.
          </p>
        </div>
        <Button type="button" variant="outline" className="h-10 w-full" disabled={pendiente} onClick={reenviar}>
          <RotateCcw aria-hidden="true" />
          {pendiente ? "Reenviando…" : "Reenviar correo de confirmación"}
        </Button>
        <Button asChild className="h-10 w-full">
          <Link href={rutaConSiguiente(RUTAS.ingresar, siguiente)}>
            <LogIn aria-hidden="true" />
            Ingresar
          </Link>
        </Button>
        <Link href={RUTAS.recuperarContrasena} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={alEnviar} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="nombre"
            etiqueta="Nombre"
            autoComplete="given-name"
            error={errores.nombre?.message}
            {...formulario.register("nombre")}
          />
          <CampoTexto
            id="apellido"
            etiqueta="Apellido"
            autoComplete="family-name"
            error={errores.apellido?.message}
            {...formulario.register("apellido")}
          />
        </div>
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
        <CampoContrasena
          id="contrasena"
          etiqueta="Contraseña"
          autoComplete="new-password"
          descripcion="Al menos 8 caracteres, con letras y números."
          error={errores.contrasena?.message}
          {...formulario.register("contrasena")}
        />
        <CampoContrasena
          id="confirmacion"
          etiqueta="Repetí la contraseña"
          autoComplete="new-password"
          error={errores.confirmacion?.message}
          {...formulario.register("confirmacion")}
        />
        <BotonEnvio pendiente={pendiente} textoPendiente="Creando cuenta…" icono={UserPlus} size="lg" className="h-10 w-full">
          Crear cuenta
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
