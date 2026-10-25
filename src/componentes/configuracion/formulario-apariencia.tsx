"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { guardarPreferenciasApariencia } from "@/acciones/perfil";
import { PALETAS, TEMA_A_NEXT_THEMES, TEMAS, type Paleta, type Tema } from "@/configuracion/apariencia";
import { aplicarPaleta } from "@/lib/apariencia-cliente";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Field, FieldContent, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/componentes/ui/field";

const ICONOS_TEMA = { sistema: Monitor, claro: Sun, oscuro: Moon } as const;

type Preferencias = { tema: Tema; paleta: Paleta };

/** Cambia tema y paleta al instante y los guarda en la cuenta del usuario. */
export function FormularioApariencia({ inicial }: { inicial: Preferencias }) {
  const { setTheme } = useTheme();
  const [preferencias, setPreferencias] = useState<Preferencias>(inicial);
  const [guardando, iniciarTransicion] = useTransition();

  function aplicar(nuevas: Preferencias) {
    setPreferencias(nuevas);
    setTheme(TEMA_A_NEXT_THEMES[nuevas.tema]);
    aplicarPaleta(nuevas.paleta);
  }

  function cambiar(cambio: Partial<Preferencias>) {
    const anteriores = preferencias;
    const nuevas = { ...preferencias, ...cambio };
    aplicar(nuevas);
    iniciarTransicion(async () => {
      const resultado = await guardarPreferenciasApariencia(cambio);
      if (resultado.ok) {
        toast.success("Apariencia guardada.");
      } else {
        aplicar(anteriores);
        toast.error(resultado.mensaje);
      }
    });
  }

  return (
    <div className="space-y-8" aria-busy={guardando}>
      <FieldSet>
        <FieldLegend>Tema</FieldLegend>
        <RadioGroup
          value={preferencias.tema}
          onValueChange={(valor) => cambiar({ tema: valor as Tema })}
          className="grid gap-3 sm:grid-cols-3"
        >
          {TEMAS.map((tema) => {
            const Icono = ICONOS_TEMA[tema.id];
            return (
              <FieldLabel key={tema.id} htmlFor={`tema-${tema.id}`}>
                <Field orientation="horizontal">
                  <Icono className="size-4 text-muted-foreground" aria-hidden="true" />
                  <FieldContent>
                    <FieldTitle>{tema.etiqueta}</FieldTitle>
                  </FieldContent>
                  <RadioGroupItem value={tema.id} id={`tema-${tema.id}`} />
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Paleta de colores</FieldLegend>
        <RadioGroup
          value={preferencias.paleta}
          onValueChange={(valor) => cambiar({ paleta: valor as Paleta })}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {PALETAS.map((paleta) => (
            <FieldLabel key={paleta.id} htmlFor={`paleta-${paleta.id}`}>
              <Field orientation="horizontal">
                <span
                  className="size-5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ background: paleta.muestra }}
                  aria-hidden="true"
                />
                <FieldContent>
                  <FieldTitle>{paleta.etiqueta}</FieldTitle>
                </FieldContent>
                <RadioGroupItem value={paleta.id} id={`paleta-${paleta.id}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>
    </div>
  );
}
