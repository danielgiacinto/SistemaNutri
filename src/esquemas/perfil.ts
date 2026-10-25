import { z } from "zod";
import { textoObligatorio } from "@/esquemas/comunes";
import { IDS_PALETAS, IDS_TEMAS } from "@/configuracion/apariencia";

export const esquemaDatosPerfil = z.object({
  nombre: textoObligatorio("el nombre", 80),
  apellido: textoObligatorio("el apellido", 80),
});

export const esquemaPreferenciasApariencia = z.object({
  tema: z.enum(IDS_TEMAS, { error: "Elegí un tema válido." }),
  paleta: z.enum(IDS_PALETAS, { error: "Elegí una paleta válida." }),
});

export type DatosPerfil = z.input<typeof esquemaDatosPerfil>;
export type PreferenciasApariencia = z.output<typeof esquemaPreferenciasApariencia>;
