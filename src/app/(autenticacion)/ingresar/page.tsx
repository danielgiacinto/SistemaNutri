import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { MENSAJES_ERROR_PANTALLA_ACCESO } from "@/autorizacion/mensajes";
import { RUTAS, esRutaInvitacion, rutaConSiguiente, sanearRutaSiguiente } from "@/autorizacion/rutas";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { FormularioIngreso } from "@/componentes/autenticacion/formulario-ingreso";
import { BotonGoogle } from "@/componentes/autenticacion/boton-google";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { SeparadorTexto } from "@/componentes/comunes/separador-texto";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaIngreso({ searchParams }: PageProps<"/ingresar">) {
  return (
    <Suspense fallback={<EsqueletoFormulario />}>
      <ContenidoIngreso parametros={searchParams} />
    </Suspense>
  );
}

async function ContenidoIngreso({ parametros }: { parametros: PageProps<"/ingresar">["searchParams"] }) {
  const { siguiente, error } = await parametros;
  const rutaSiguiente = sanearRutaSiguiente(typeof siguiente === "string" ? siguiente : null);
  const esPaciente = esRutaInvitacion(rutaSiguiente);
  const mensajeError = typeof error === "string" ? MENSAJES_ERROR_PANTALLA_ACCESO[error] : undefined;

  return (
    <TarjetaAutenticacion
      titulo="Ingresá a tu cuenta"
      descripcion={
        esPaciente
          ? "Usá la cuenta que creaste para el portal. Si nunca elegiste contraseña, restablecela antes de entrar."
          : "Accedé a tu consultorio o a tu portal de paciente. Si te invitaron y nunca definiste contraseña, restablecela."
      }
      pie={
        esPaciente ? (
          <p>
            ¿Todavía no tenés cuenta?{" "}
            <Link
              href={rutaConSiguiente(RUTAS.registro, rutaSiguiente)}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Creala acá
            </Link>
          </p>
        ) : (
          <>
            ¿Todavía no tenés cuenta?{" "}
            <Link href={RUTAS.registro} className="font-medium text-primary underline-offset-4 hover:underline">
              Creá tu consultorio
            </Link>
          </>
        )
      }
    >
      {mensajeError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{mensajeError}</AlertDescription>
        </Alert>
      )}
      <BotonGoogle siguiente={rutaSiguiente} />
      <SeparadorTexto>o con tu correo</SeparadorTexto>
      <FormularioIngreso siguiente={rutaSiguiente} />
    </TarjetaAutenticacion>
  );
}
