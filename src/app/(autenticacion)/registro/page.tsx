import type { Metadata } from "next";
import Link from "next/link";
import { RUTAS } from "@/autorizacion/rutas";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { FormularioRegistro } from "@/componentes/autenticacion/formulario-registro";
import { BotonGoogle } from "@/componentes/autenticacion/boton-google";
import { SeparadorTexto } from "@/componentes/comunes/separador-texto";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
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
      <BotonGoogle />
      <SeparadorTexto>o con tu correo</SeparadorTexto>
      <FormularioRegistro />
    </TarjetaAutenticacion>
  );
}
