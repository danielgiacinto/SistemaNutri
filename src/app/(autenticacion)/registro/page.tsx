import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { MENSAJES_ERROR_PANTALLA_ACCESO } from "@/autorizacion/mensajes";
import { RUTAS } from "@/autorizacion/rutas";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { FormularioRegistro } from "@/componentes/autenticacion/formulario-registro";
import { BotonGoogle } from "@/componentes/autenticacion/boton-google";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { SeparadorTexto } from "@/componentes/comunes/separador-texto";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro({ searchParams }: PageProps<"/registro">) {
  return (
    <TarjetaAutenticacion
      titulo="Creá la cuenta de tu consultorio"
      descripcion="Registrate como profesional. Después vas a poder invitar a tus pacientes a su portal."
      pie={
        <div className="space-y-2">
          <p>
            ¿Ya tenés cuenta?{" "}
            <Link href={RUTAS.ingresar} className="font-medium text-primary underline-offset-4 hover:underline">
              Ingresá
            </Link>
          </p>
          <p className="text-xs">¿Sos paciente? Tu nutricionista te va a enviar una invitación para acceder.</p>
        </div>
      }
    >
      <Suspense fallback={<EsqueletoFormulario />}>
        <ContenidoRegistro parametros={searchParams} />
      </Suspense>
    </TarjetaAutenticacion>
  );
}

async function ContenidoRegistro({ parametros }: { parametros: PageProps<"/registro">["searchParams"] }) {
  const { error } = await parametros;
  const mensajeError = typeof error === "string" ? MENSAJES_ERROR_PANTALLA_ACCESO[error] : undefined;

  return (
    <>
      {mensajeError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{mensajeError}</AlertDescription>
        </Alert>
      )}
      <BotonGoogle paginaError="/registro" />
      <SeparadorTexto>o con tu correo</SeparadorTexto>
      <FormularioRegistro />
    </>
  );
}
