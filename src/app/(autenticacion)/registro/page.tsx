import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { MENSAJES_ERROR_PANTALLA_ACCESO } from "@/autorizacion/mensajes";
import { RUTAS, esRutaInvitacion, rutaConSiguiente, sanearRutaSiguiente } from "@/autorizacion/rutas";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { FormularioRegistro } from "@/componentes/autenticacion/formulario-registro";
import { BotonGoogle } from "@/componentes/autenticacion/boton-google";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { SeparadorTexto } from "@/componentes/comunes/separador-texto";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro({ searchParams }: PageProps<"/registro">) {
  return (
    <Suspense fallback={<EsqueletoFormulario />}>
      <ContenidoRegistro parametros={searchParams} />
    </Suspense>
  );
}

async function ContenidoRegistro({ parametros }: { parametros: PageProps<"/registro">["searchParams"] }) {
  const { siguiente, error } = await parametros;
  const rutaSiguiente = sanearRutaSiguiente(typeof siguiente === "string" ? siguiente : null);
  const esPaciente = esRutaInvitacion(rutaSiguiente);
  const mensajeError = typeof error === "string" ? MENSAJES_ERROR_PANTALLA_ACCESO[error] : undefined;

  return (
    <TarjetaAutenticacion
      titulo={esPaciente ? "Creá tu cuenta del portal" : "Creá la cuenta de tu consultorio"}
      descripcion={
        esPaciente
          ? "Usá el mismo correo al que te invitaron. Elegí una contraseña o Google: los vas a necesitar para volver a entrar."
          : "Registrate como profesional. Después vas a poder invitar a tus pacientes a su portal."
      }
      pie={
        esPaciente ? (
          <div className="space-y-2">
            <p>
              ¿Ya tenés cuenta?{" "}
              <Link
                href={rutaConSiguiente(RUTAS.ingresar, rutaSiguiente)}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Ingresá
              </Link>
            </p>
            <p className="text-xs">
              Si abriste la invitación antes y no definiste contraseña,{" "}
              <Link href={RUTAS.recuperarContrasena} className="font-medium text-primary underline-offset-4 hover:underline">
                restablecela
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p>
              ¿Ya tenés cuenta?{" "}
              <Link href={RUTAS.ingresar} className="font-medium text-primary underline-offset-4 hover:underline">
                Ingresá
              </Link>
            </p>
            <p className="text-xs">¿Sos paciente? Tu nutricionista te va a enviar una invitación para acceder.</p>
          </div>
        )
      }
    >
      {mensajeError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{mensajeError}</AlertDescription>
        </Alert>
      )}
      <BotonGoogle siguiente={rutaSiguiente} paginaError="/registro" />
      <SeparadorTexto>o con tu correo</SeparadorTexto>
      <FormularioRegistro siguiente={rutaSiguiente} />
    </TarjetaAutenticacion>
  );
}
