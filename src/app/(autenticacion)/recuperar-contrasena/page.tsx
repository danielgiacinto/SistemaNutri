import type { Metadata } from "next";
import Link from "next/link";
import { RUTAS } from "@/autorizacion/rutas";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { FormularioRecuperacion } from "@/componentes/autenticacion/formulario-recuperacion";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperacion() {
  return (
    <TarjetaAutenticacion
      titulo="Recuperá tu contraseña"
      descripcion="Ingresá el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña."
      pie={
        <Link href={RUTAS.ingresar} className="font-medium text-primary underline-offset-4 hover:underline">
          Volver a ingresar
        </Link>
      }
    >
      <FormularioRecuperacion />
    </TarjetaAutenticacion>
  );
}
