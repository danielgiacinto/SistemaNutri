import { describe, expect, it, vi } from "vitest";
import { calcularComposicionBiblioteca, resumirRecursoBiblioteca } from "@/lib/composicion-biblioteca";
import { esquemaRecursoBiblioteca } from "@/esquemas/biblioteca";
import { listarBiblioteca, obtenerRecursoBiblioteca } from "@/servicios/biblioteca";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import type { RecursoBiblioteca, RelacionBiblioteca } from "@/tipos/biblioteca";

const recurso: RecursoBiblioteca = { id: "00000000-0000-4000-8000-000000000001", tipo: "plato", nombre: "Receta ficticia", categoria: "", etiquetas: [], version: 1, actualizado_en: "2026-11-12T12:00:00Z", archivado_en: null, contenido: { porciones: 2, peso_final: null } };
const alimento: RecursoBiblioteca = { ...recurso, tipo: "alimento", contenido: { energia: 200, proteinas: 10, carbohidratos: 30, grasas: 0 } };
const fila = (detalle: RelacionBiblioteca["detalle"] = {}, instantanea = alimento): RelacionBiblioteca => ({ referencia_id: alimento.id, instantanea, detalle: { cantidad: 100, unidad: "g", gramos_por_unidad: 1, rendimiento: 1, ...detalle } });

describe("Composición de recetas a partir de versiones guardadas", () => {
  it("suma ingredientes y divide por porciones sin confundir gramos con porcentajes", () => {
    const calculo = calcularComposicionBiblioteca(recurso, [fila({ cantidad: 150 }), fila({ cantidad: 50 })]);
    expect(calculo.total).toEqual({ energia: 400, proteinas: 20, carbohidratos: 60, grasas: 0 });
    expect(calculo.por_porcion).toEqual(alimento.contenido);
    expect(calculo.por_100g).toEqual(alimento.contenido);
    expect(calculo.peso_final).toBe(200);
    expect(calculo.origen_peso).toBe("estimado");
  });
  it("usa rendimiento solo para el peso y prioriza el peso final informado", () => {
    const estimado = calcularComposicionBiblioteca(recurso, [fila({ cantidad: 200, rendimiento: .5 })]);
    expect(estimado.total.energia).toBe(400);
    expect(estimado.peso_final).toBe(100);
    expect(estimado.por_100g.energia).toBe(400);
    const informado = calcularComposicionBiblioteca({ ...recurso, contenido: { porciones: 4, peso_final: 400 } }, [fila({ cantidad: 200, rendimiento: .5 })]);
    expect(informado.por_100g.energia).toBe(100);
    expect(informado.por_porcion.energia).toBe(100);
    expect(informado.origen_peso).toBe("informado");
  });
  it.each(["ml", "unidad", "porcion"])("convierte %s solo con gramos explícitos", unidad => {
    const sinConversion = calcularComposicionBiblioteca({ ...recurso, contenido: { porciones: 2, peso_final: 300 } }, [fila(), fila({ unidad, cantidad: 2, gramos_por_unidad: null })]);
    expect(Object.values(sinConversion.total)).toEqual([null, null, null, null]);
    expect(sinConversion.ingredientes[1].gramos).toBeNull();
    const convertido = calcularComposicionBiblioteca(recurso, [fila({ unidad, cantidad: 2, gramos_por_unidad: 50 })]);
    expect(convertido.total.energia).toBe(200);
    expect(convertido.peso_final).toBe(100);
  });
  it("propaga faltantes por nutriente sin convertirlos en cero o publicar subtotales", () => {
    const incompleto = { ...alimento, contenido: { ...alimento.contenido, proteinas: null, energia: null } };
    const calculo = calcularComposicionBiblioteca(recurso, [fila(), fila({}, incompleto)]);
    expect(calculo.total).toEqual({ energia: null, proteinas: null, carbohidratos: 60, grasas: 0 });
    expect(calculo.por_100g).toEqual({ energia: null, proteinas: null, carbohidratos: 30, grasas: 0 });
  });
  it("no deriva energía de macros ni redondea resultados intermedios", () => {
    const calculo = calcularComposicionBiblioteca({ ...recurso, contenido: { porciones: 3, peso_final: 7 } }, [fila({ cantidad: 1 }, { ...alimento, contenido: { energia: null, proteinas: 1, carbohidratos: 0, grasas: 0 } })]);
    expect(calculo.total.energia).toBeNull();
    expect(calculo.por_porcion.proteinas).toBeCloseTo(.01 / 3, 12);
    expect(calculo.por_100g.proteinas).toBeCloseTo(1 / 7, 12);
  });
  it("normaliza una preparación desde su copia sin confiar en cálculos recibidos", () => {
    const preparacion: RecursoBiblioteca = { ...recurso, tipo: "preparacion", contenido: { porciones: 2, peso_final: 400 }, relaciones: [fila({ cantidad: 200 })] };
    const calculo = calcularComposicionBiblioteca(recurso, [fila({ cantidad: 100 }, preparacion)]);
    expect(calculo.total.energia).toBe(100);
    expect(calculo.por_porcion.proteinas).toBe(2.5);
    expect(calculo.total.grasas).toBe(0);
    const incompleta = { ...preparacion, relaciones: undefined };
    expect(calcularComposicionBiblioteca(recurso, [fila({}, incompleta)]).total.energia).toBeNull();
  });
  it("no calcula una receta vacía o una preparación con referencias no admitidas", () => {
    expect(calcularComposicionBiblioteca(recurso, []).total.energia).toBeNull();
    const incorrecta: RecursoBiblioteca = { ...recurso, tipo: "preparacion", relaciones: [fila(), fila({}, recurso)] };
    expect(calcularComposicionBiblioteca(recurso, [fila({}, incorrecta)]).total.energia).toBeNull();
  });
  it("valida preparaciones sin aceptar composición ni propietarios enviados por cliente", () => {
    const datos = { tipo: "preparacion", nombre: "Ensayo", categoria: "", etiquetas: [], contenido: { porciones: 1, peso_final: null, preparacion: "", alternativas: "", notas: "" }, relaciones: [{ referencia_id: recurso.id, referencia_version: 1, detalle: fila().detalle }] };
    expect(esquemaRecursoBiblioteca.safeParse(datos).success).toBe(true);
    expect(esquemaRecursoBiblioteca.safeParse({ ...datos, calculo: { energia: 20 } }).success).toBe(false);
    expect(esquemaRecursoBiblioteca.safeParse({ ...datos, contenido: { ...datos.contenido, energia: 20 } }).success).toBe(false);
  });
  it("concilia listado y detalle y retira los insumos del resumen enviado a la interfaz", async () => {
    const receta = { ...recurso, relaciones: [fila({ cantidad: 250 })] };
    const rpc = vi.fn().mockResolvedValueOnce({ data: { recursos: [receta], total: 1, contadores: { plato: 1 }, categorias: [] } }).mockResolvedValueOnce({ data: { recurso, relaciones: receta.relaciones, historial: [] } });
    const cliente = { rpc } as unknown as ClienteSupabase;
    const listado = await listarBiblioteca(cliente, { tipo: "plato", q: "", categoria: "", archivados: false, pagina: 1 });
    const detalle = await obtenerRecursoBiblioteca(cliente, recurso.id);
    expect(listado.recursos[0].calculo?.por_porcion).toEqual(detalle?.recurso.calculo?.por_porcion);
    expect(listado.recursos[0].relaciones).toBeUndefined();
    expect(listado.recursos[0].calculo?.ingredientes).toEqual([]);
    expect(detalle?.recurso.calculo?.ingredientes[0].aporte.energia).toBe(500);
    expect(resumirRecursoBiblioteca(receta).relaciones).toBeUndefined();
  });
});
