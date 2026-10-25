"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/componentes/ui/field";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";

type PropiedadesCampo = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id: string;
  etiqueta: string;
  error?: string;
  descripcion?: React.ReactNode;
};

function idsDescriptivos(id: string, descripcion: unknown, error: unknown): string | undefined {
  const ids = [descripcion ? `${id}-descripcion` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** Campo de texto con etiqueta, descripción y error asociados de forma accesible. */
export function CampoTexto({ id, etiqueta, error, descripcion, ...propiedades }: PropiedadesCampo) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={idsDescriptivos(id, descripcion, error)}
        {...propiedades}
      />
      {descripcion && <FieldDescription id={`${id}-descripcion`}>{descripcion}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

/** Campo de contraseña con botón para mostrar u ocultar el texto. */
export function CampoContrasena({ id, etiqueta, error, descripcion, ...propiedades }: Omit<PropiedadesCampo, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          className="pr-10"
          aria-invalid={error ? true : undefined}
          aria-describedby={idsDescriptivos(id, descripcion, error)}
          {...propiedades}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
          onClick={() => setVisible((actual) => !actual)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
      {descripcion && <FieldDescription id={`${id}-descripcion`}>{descripcion}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
