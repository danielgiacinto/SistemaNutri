import { describe, expect, it } from "vitest";
import { copiarBloque, documentoDesdeComidas, nuevaEntrada, nuevoBloque, nutrientesRecursoPlan } from "../../src/lib/planes-visuales";
import { esquemaDocumentoPlan } from "../../src/esquemas/plan-visual";
describe("documentos de planes", () => {
  it("adapta comidas anteriores sin perder orden ni detalle", () => {
    const comidas = [{ momento: "cena" as const, detalle: "Texto original" }, { momento: "desayuno" as const, detalle: "Otro texto" }];
    const documento = documentoDesdeComidas(comidas);
    expect(documento.bloques[0].entradas.map(({ momento, detalle }) => ({ momento, detalle }))).toEqual(comidas);
    expect(esquemaDocumentoPlan.safeParse(documento).success).toBe(true);
  });
  it("duplica con identidades nuevas y contenido independiente", () => {
    const bloque = { ...nuevoBloque("semana"), entradas: [nuevaEntrada()] };
    const copia = copiarBloque(bloque);
    copia.entradas[0].detalle = "Otro contenido";
    expect(copia.id).not.toBe(bloque.id);
    expect(copia.entradas[0].id).not.toBe(bloque.entradas[0].id);
    expect(bloque.entradas[0].detalle).toBe("");
  });
  it("no inventa valores nutricionales ausentes", () => {
    expect(nutrientesRecursoPlan({ id: "sin-recurso", version: 1, cantidad: 1, variante: null })).toEqual({ energia: null, proteinas: null, carbohidratos: null, grasas: null });
  });
});
