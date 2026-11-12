import { describe, expect, it, vi } from "vitest";
import { esquemaFiltroBiblioteca, esquemaRecursoBiblioteca } from "@/esquemas/biblioteca";
import { calcularSuplemento } from "@/lib/composicion-biblioteca";
import { medidaSuplemento, type RecursoBiblioteca, type RelacionBiblioteca } from "@/tipos/biblioteca";
import { copiarBaseBiblioteca, listarBiblioteca, obtenerRecursoBiblioteca } from "@/servicios/biblioteca";
import type { ClienteSupabase } from "@/lib/supabase/servidor";

const id = "00000000-0000-4000-8000-000000000001";
const contenido = { marca: "Ensayo ficticio", medida_cantidad: 30, medida_unidad: "g" as const, energia: 120, proteinas: 24, carbohidratos: 3, grasas: 1, variantes: [{ nombre: "Producto solo", medidas: 1, preparacion: "" },{ nombre: "Con agregado", medidas: 2, preparacion: "Texto descriptivo" }], notas: "" };
const datos = { tipo: "suplemento", nombre: "Producto ficticio", categoria: "Proteína", etiquetas: [], fuente_id: id, fuente_version: 1, contenido, relaciones: [] };
const recurso = { ...datos, id, version: 1, archivado_en: null, actualizado_en: "2026-11-12T18:00:00Z" } as RecursoBiblioteca;
const alimento: RecursoBiblioteca = { ...recurso, tipo: "alimento", contenido: { energia: 60, proteinas: 3, carbohidratos: 5, grasas: 3 } };
const ingrediente = (detalle: RelacionBiblioteca["detalle"] = {}, instantanea = alimento): RelacionBiblioteca => ({ referencia_id: id, instantanea, detalle: { variante: 1, cantidad: 200, unidad: "g", gramos_por_unidad: 1, rendimiento: 1, ...detalle } });

describe("Suplementos: composición declarada y mezclas", () => {
  it("separa producto, agregados y mezcla sin interpretar instrucciones como nutrientes", () => {
    const calculo = calcularSuplemento(recurso,[ingrediente()]);
    expect(calculo.producto.energia).toBe(120);
    expect(calculo.variantes[0]).toEqual({ producto: { energia:120,proteinas:24,carbohidratos:3,grasas:1 }, agregados:{ energia:0,proteinas:0,carbohidratos:0,grasas:0 }, mezcla:{ energia:120,proteinas:24,carbohidratos:3,grasas:1 } });
    expect(calculo.variantes[1]).toEqual({ producto:{ energia:240,proteinas:48,carbohidratos:6,grasas:2 },agregados:{ energia:120,proteinas:6,carbohidratos:10,grasas:6 },mezcla:{ energia:360,proteinas:54,carbohidratos:16,grasas:8 } });
  });
  it("admite fracciones de medida y no convierte por sí solo scoop o ml en gramos", () => {
    const fraccion = { ...recurso, contenido: { ...contenido, medida_cantidad: 1, medida_unidad: "scoop" as const, variantes:[{ nombre:"Ensayo", medidas:.5, preparacion:"" }] } };
    const calculo = calcularSuplemento(fraccion,[ingrediente({ variante:0, unidad:"ml", gramos_por_unidad:null })]);
    expect(calculo.variantes[0].producto.energia).toBe(60);
    expect(calculo.variantes[0].mezcla.energia).toBeNull();
    expect(medidaSuplemento(fraccion.contenido)).toBe("1 scoop");
  });
  it("propaga faltantes por nutriente y conserva los ceros informados", () => {
    const incompleto = { ...recurso, contenido:{ ...contenido, energia:null, grasas:0 } };
    const calculo = calcularSuplemento(incompleto,[ingrediente({}, { ...alimento, contenido:{...alimento.contenido, proteinas:null, grasas:0} })]);
    expect(calculo.variantes[1].mezcla).toEqual({ energia:null,proteinas:null,carbohidratos:16,grasas:0 });
    expect(calculo.variantes[0].mezcla.proteinas).toBe(24);
  });
  it("utiliza preparaciones normalizadas con los ingredientes de su versión", () => {
    const preparacion: RecursoBiblioteca = { ...recurso, tipo:"preparacion", contenido:{porciones:1,peso_final:400}, relaciones:[ingrediente({ cantidad:200 })] };
    expect(calcularSuplemento(recurso,[ingrediente({cantidad:100},preparacion)]).variantes[1].mezcla.energia).toBe(270);
  });
  it("valida medida, fuente, variantes y límites de composición sin aceptar propietarios ni cálculos", () => {
    expect(esquemaRecursoBiblioteca.safeParse(datos).success).toBe(true);
    for(const alteracion of [
      { ...datos, fuente_id:undefined }, { ...datos, consultorio_id:id }, { ...datos, calculo_suplemento:{} },
      { ...datos, contenido:{...contenido,medida_cantidad:0} }, { ...datos, contenido:{...contenido,proteinas:31} },
      { ...datos, contenido:{...contenido,variantes:[]} }, { ...datos, contenido:{...contenido,variantes:[contenido.variantes[0],contenido.variantes[0]]} },
      { ...datos, contenido:{...contenido,energia:Infinity} }, { ...datos,categoria:"Dosis recomendadas" },
    ]) expect(esquemaRecursoBiblioteca.safeParse(alteracion).success).toBe(false);
  });
  it("valida el índice de variante y exige conversión explícita de g igual a uno", () => {
    const relacion = { referencia_id:id,referencia_version:1,detalle:ingrediente().detalle };
    expect(esquemaRecursoBiblioteca.safeParse({...datos,relaciones:[relacion]}).success).toBe(true);
    for(const detalle of [{...relacion.detalle,variante:2},{...relacion.detalle,variante:.5},{...relacion.detalle,rendimiento:2},{...relacion.detalle,gramos_por_unidad:null}]) expect(esquemaRecursoBiblioteca.safeParse({...datos,relaciones:[{...relacion,detalle}]}).success).toBe(false);
  });
  it("mantiene separados los filtros de procedencia y rechaza orígenes desconocidos", () => {
    expect(esquemaFiltroBiblioteca.parse({tipo:"suplemento"}).origen).toBe("propio");
    expect(esquemaFiltroBiblioteca.parse({origen:"base"}).origen).toBe("base");
    expect(esquemaFiltroBiblioteca.safeParse({origen:"todos_los_consultorios"}).success).toBe(false);
  });
  it("consulta la procedencia elegida y copia por identificador y versión, sin aceptar contenido del cliente", async () => {
    const rpc=vi.fn().mockResolvedValueOnce({data:{recursos:[],total:0,categorias:[],contadores:{}}}).mockResolvedValueOnce({data:null}).mockResolvedValueOnce({data:id});
    const cliente={rpc} as unknown as ClienteSupabase;
    const filtro=esquemaFiltroBiblioteca.parse({tipo:"suplemento",origen:"base"});
    await listarBiblioteca(cliente,filtro);
    expect(rpc).toHaveBeenNthCalledWith(1,"consultar_catalogo_base",{p_filtros:filtro});
    expect(await obtenerRecursoBiblioteca(cliente,id,2,"base")).toBeNull();
    expect(rpc).toHaveBeenNthCalledWith(2,"obtener_recurso_base",{p_id:id,p_version:2});
    expect(await copiarBaseBiblioteca(cliente,id,2)).toEqual({ok:true,datos:{id}});
    expect(rpc).toHaveBeenNthCalledWith(3,"copiar_recurso_base",{p_id:id,p_version:2});
  });
});
