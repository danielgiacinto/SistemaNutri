"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/componentes/ui/field";

type PropiedadesCasilla = {
  id: string;
  etiqueta: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
  descripcion?: React.ReactNode;
  error?: string;
};

export function CampoCasilla({ id, etiqueta, checked, onChange, descripcion, error }: PropiedadesCasilla) {
  return (
    <Field orientation="horizontal" data-invalid={error ? true : undefined}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion ? `${id}-descripcion` : undefined}
      />
      <div className="min-w-0">
        <FieldLabel htmlFor={id} className="font-medium">
          {etiqueta}
        </FieldLabel>
        {descripcion && <FieldDescription id={`${id}-descripcion`}>{descripcion}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </div>
    </Field>
  );
}
