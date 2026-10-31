"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { solicitarRecuperacion } from "@/acciones/autenticacion";
import { esquemaRecuperacion } from "@/esquemas/autenticacion";
import { aplicarErroresServidor } from "@/lib/formularios";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { FieldGroup } from "@/componentes/ui/field";

export function FormularioRecuperacion() {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensajeEnviado, setMensajeEnviado] = useState<string | null>(null);
  const formulario = useForm({
    resolver: zodResolver(esquemaRecuperacion),
    defaultValues: { correo: "" },
  });
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) =>
    iniciarTransicion(async () => {
      const resultado = await solicitarRecuperacion(datos);
      if (!resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      setMensajeEnviado(resultado.mensaje ?? "Revisá tu correo.");
    }),
  );

  if (mensajeEnviado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">{mensajeEnviado}</p>
      </div>
    );
  }

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
        <BotonEnvio pendiente={pendiente} textoPendiente="Enviando…" icono={Send} size="lg" className="h-10 w-full">
          Enviar enlace
        </BotonEnvio>
      </FieldGroup>
    </form>
  );
}
