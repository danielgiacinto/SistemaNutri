import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirUsuario } from "@/autorizacion/sesion";
import { TarjetaAutenticacion } from "@/componentes/autenticacion/tarjeta-autenticacion";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { FormularioRestablecimiento } from "@/componentes/autenticacion/formulario-restablecimiento";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function PaginaRestablecimiento() {
  return (
    <TarjetaAutenticacion
      titulo="Elegí una nueva contraseña"
      descripcion="Vas a usarla la próxima vez que ingreses con tu correo."
    >
      <Suspense fallback={<EsqueletoFormulario />}>
        <FormularioConSesion />
      </Suspense>
    </TarjetaAutenticacion>
  );
}

async function FormularioConSesion() {
  // Solo se puede cambiar la contraseña con una sesión válida (enlace de recuperación o sesión iniciada).
  await requerirUsuario();
  return <FormularioRestablecimiento />;
}
