"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/componentes/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";

type Opcion = { valor: string; etiqueta: string };

type PropiedadesCampo = {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  opciones: readonly Opcion[];
  error?: string;
  descripcion?: React.ReactNode;
  placeholder?: string;
  referencia?: React.Ref<HTMLButtonElement>;
};

export function CampoSelect({
  id,
  etiqueta,
  valor,
  alCambiar,
  opciones,
  error,
  descripcion,
  placeholder,
  referencia,
}: PropiedadesCampo) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger ref={referencia} id={id} className="w-full" aria-invalid={error ? true : undefined} aria-describedby={[descripcion ? `${id}-descripcion` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {descripcion && <FieldDescription id={`${id}-descripcion`}>{descripcion}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
