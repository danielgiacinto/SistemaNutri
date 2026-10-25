import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { RUTAS, sanearRutaSiguiente } from "@/autorizacion/rutas";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { FormularioIngreso } from "@/componentes/autenticacion/formulario-ingreso";
import { BotonGoogle } from "@/componentes/autenticacion/boton-google";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { SeparadorTexto } from "@/componentes/comunes/separador-texto";

export const metadata: Metadata = { title: "Ingresar" };

const MENSAJES_ERROR: Record<string, string> = {
  enlace_invalido: "El enlace no es válido o ya venció. Volvé a solicitarlo o ingresá con tu contraseña.",
  google: "No pudimos iniciar el ingreso con Google. Intentá nuevamente.",
};

export default function PaginaIngreso({ searchParams }: PageProps<"/ingresar">) {
  return (
    <TarjetaAutenticacion
      titulo="Ingresá a tu cuenta"
      descripcion="Accedé a tu consultorio o a tu portal de paciente."
      pie={
        <>
          ¿Todavía no tenés cuenta?{" "}
          <Link href={RUTAS.registro} className="font-medium text-primary underline-offset-4 hover:underline">
            Creá tu consultorio
          </Link>
        </>
      }
    >
      <Suspense fallback={<EsqueletoFormulario />}>
        <ContenidoIngreso parametros={searchParams} />
      </Suspense>
    </TarjetaAutenticacion>
  );
}

async function ContenidoIngreso({ parametros }: { parametros: PageProps<"/ingresar">["searchParams"] }) {
  const { siguiente, error } = await parametros;
  const rutaSiguiente = sanearRutaSiguiente(typeof siguiente === "string" ? siguiente : null);
  const mensajeError = typeof error === "string" ? MENSAJES_ERROR[error] : undefined;

  return (
    <>
      {mensajeError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{mensajeError}</AlertDescription>
        </Alert>
      )}
      <BotonGoogle siguiente={rutaSiguiente} />
      <SeparadorTexto>o con tu correo</SeparadorTexto>
      <FormularioIngreso siguiente={rutaSiguiente} />
    </>
  );
}
