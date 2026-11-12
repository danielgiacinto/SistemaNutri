import { describe, expect, it, vi } from "vitest";
import { esquemaRecursoBiblioteca } from "@/esquemas/biblioteca";
import { valorNutricional } from "@/tipos/biblioteca";
import { guardarRecursoBiblioteca, leerRecursoBiblioteca, operarRecursoBiblioteca, buscarOpcionesBiblioteca } from "@/acciones/biblioteca";

vi.mock("@/autorizacion/sesion", () => ({ requerirProfesional: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
const id = "00000000-0000-4000-8000-000000000001";
const alimento = { tipo: "alimento", nombre: "Ensayo", categoria: "", etiquetas: [], fuente_id: id, fuente_version: 1, contenido: { energia: null, proteinas: 0, carbohidratos: null, grasas: null, notas: "" }, relaciones: [] };

describe("Biblioteca: validación y sesión", () => {
  it("distingue dato faltante de un cero informado", () => {
    expect(esquemaRecursoBiblioteca.safeParse(alimento).success).toBe(true);
    expect(valorNutricional(null,"g")).toBe("Sin dato");
    expect(valorNutricional(0,"g")).toBe("0 g");
  });
  it("rechaza ids de propietario, datos no previstos, sumas imposibles y valores no finitos", () => {
    for (const datos of [{...alimento,consultorio_id:id},{...alimento,contenido:{...alimento.contenido,paciente_id:id}},{...alimento,contenido:{...alimento.contenido,proteinas:80,grasas:40}},{...alimento,contenido:{...alimento.contenido,energia:Infinity}}]) expect(esquemaRecursoBiblioteca.safeParse(datos).success).toBe(false);
  });
  it("valida las partes y la versión elegida de cada referencia", () => {
    const plato = { tipo:"plato_grupos",nombre:"Flexible",categoria:"",etiquetas:[],contenido:{preparacion:"",alternativas:"",notas:""},relaciones:[{referencia_id:id,referencia_version:1,detalle:{fraccion:.5,ejemplos:"",coccion:""}}] };
    expect(esquemaRecursoBiblioteca.safeParse(plato).success).toBe(false);
    expect(esquemaRecursoBiblioteca.safeParse({...plato,relaciones:[...plato.relaciones,...plato.relaciones]}).success).toBe(true);
  });
  it("exige sesión en todas las acciones, incluidas lecturas y buscadores", async () => {
    vi.mocked(requerirProfesional).mockRejectedValue(new Error("sin_sesion"));
    for (const ejecutar of [()=>guardarRecursoBiblioteca(alimento),()=>leerRecursoBiblioteca(id),()=>leerRecursoBiblioteca(id,1,"base"),()=>operarRecursoBiblioteca("duplicar",id,1,"base"),()=>operarRecursoBiblioteca("archivar",id,1),()=>buscarOpcionesBiblioteca("alimento","",1)]) await expect(ejecutar()).rejects.toThrow("sin_sesion");
    expect(crearClienteServidor).not.toHaveBeenCalled();
  });
});
