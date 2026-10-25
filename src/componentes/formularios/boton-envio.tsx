import { Loader2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";

type PropiedadesBotonEnvio = React.ComponentProps<typeof Button> & {
  pendiente: boolean;
  textoPendiente?: string;
};

/** Botón de envío que se deshabilita y muestra progreso mientras la acción está en curso. */
export function BotonEnvio({ pendiente, textoPendiente, children, disabled, ...propiedades }: PropiedadesBotonEnvio) {
  return (
    <Button type="submit" disabled={pendiente || disabled} aria-busy={pendiente} {...propiedades}>
      {pendiente && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pendiente && textoPendiente ? textoPendiente : children}
    </Button>
  );
}
