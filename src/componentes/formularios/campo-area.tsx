"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/componentes/ui/field";
import { Textarea } from "@/componentes/ui/textarea";

type PropiedadesCampo = Omit<React.ComponentProps<typeof Textarea>, "id"> & {
  id: string;
  etiqueta: string;
  error?: string;
  descripcion?: React.ReactNode;
};

export function CampoArea({ id, etiqueta, error, descripcion, ...propiedades }: PropiedadesCampo) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion || error ? `${descripcion ? `${id}-descripcion` : ""} ${error ? `${id}-error` : ""}`.trim() : undefined}
        {...propiedades}
      />
      {descripcion && <FieldDescription id={`${id}-descripcion`}>{descripcion}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
