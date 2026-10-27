import { FormularioRestablecimiento } from "@/componentes/autenticacion/formulario-restablecimiento";
import { BotonGoogle } from "@/componentes/autenticacion/boton-google";
import { SeparadorTexto } from "@/componentes/comunes/separador-texto";

/** Primer ingreso del paciente: se registra y después acepta la invitación. */
export function PedirClaveParaVolver({
  siguiente,
  consultorioNombre,
}: {
  siguiente: string;
  consultorioNombre?: string | null;
}) {
  const consultorio = consultorioNombre?.trim() || "tu nutricionista";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Bienvenido/a</h1>
        <p className="text-muted-foreground">
          Estás ingresando como paciente de <strong className="text-foreground">{consultorio}</strong>. Antes de entrar
          al portal, registrate. Podés usar Google con este mismo correo o crear una contraseña. La vas a usar cada vez
          que vuelvas.
        </p>
      </div>
      <BotonGoogle siguiente={siguiente} />
      <SeparadorTexto>o registrate con una contraseña</SeparadorTexto>
      <FormularioRestablecimiento continuar="refrescar" registro />
    </div>
  );
}
