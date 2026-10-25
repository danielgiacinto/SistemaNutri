"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/componentes/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { ZONAS_HORARIAS_DISPONIBLES } from "@/configuracion/producto";

type PropiedadesSelector = {
  id: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string;
};

export function SelectorZonaHoraria({ id, valor, alCambiar, error }: PropiedadesSelector) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Zona horaria</FieldLabel>
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-descripcion${error ? ` ${id}-error` : ""}`}
        >
          <SelectValue placeholder="Elegí una zona horaria" />
        </SelectTrigger>
        <SelectContent>
          {ZONAS_HORARIAS_DISPONIBLES.map((zona) => (
            <SelectItem key={zona.valor} value={zona.valor}>
              {zona.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription id={`${id}-descripcion`}>Se usa para mostrar la agenda y los horarios de turnos.</FieldDescription>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
