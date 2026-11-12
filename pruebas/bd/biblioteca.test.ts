import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";
import { calcularComposicionBiblioteca } from "@/lib/composicion-biblioteca";
import type { DetalleBiblioteca, RecursoBiblioteca } from "@/tipos/biblioteca";

let bd: PGlite; let usuario: string; let ajeno: string; let consultorio: string; let fuente: string; let alimento: string; let grupo: string; let plato: string;
const crear = (tipo: string, nombre: string, contenido: object, otros: object = {}) => ({ tipo, nombre, categoria: "Propios", etiquetas: ["prueba"], contenido, relaciones: [], ...otros });
const fuenteDatos = crear("fuente", "Registro propio", { referencia: "Ficha de ensayo, sin uso clínico", version: "1", licencia: "Contenido propio de prueba", base: "100 g de parte comestible", fecha: "2026-11-12", notas: "" });
const alimentoDatos = () => crear("alimento", "Alimento de ensayo", { energia: 100, proteinas: 5, carbohidratos: 10, grasas: null, notas: "" }, { fuente_id: fuente });
async function operar(actor: string, accion: string, datos: object) {
  return (await comoUsuario(bd, actor, tx => tx.query<{ id: string }>("select public.gestionar_biblioteca($1,$2::jsonb) id", [accion, JSON.stringify(datos)]))).rows[0].id;
}
async function obtener(id: string, version?: number) {
  return (await comoUsuario(bd, usuario, tx => tx.query<{ datos: { recurso: { nombre: string; version: number }; relaciones: { detalle: object; instantanea: { nombre: string; version: number; fuente_instantanea: { contenido: { licencia: string } } } }[]; historial: object[] } }>("select public.obtener_recurso_biblioteca($1,$2) datos", [id, version ?? null]))).rows[0].datos;
}
beforeAll(async () => {
  bd = await crearBaseDePruebas();
  usuario = await crearUsuario(bd, "biblioteca@prueba.test"); ajeno = await crearUsuario(bd, "biblioteca-ajena@prueba.test");
  consultorio = (await comoUsuario(bd, usuario, tx => tx.query<{ id: string }>("select public.crear_consultorio_inicial('Biblioteca') id"))).rows[0].id;
  await comoUsuario(bd, ajeno, tx => tx.query("select public.crear_consultorio_inicial('Otra biblioteca')"));
  fuente = await operar(usuario, "guardar", fuenteDatos);
  alimento = await operar(usuario, "guardar", alimentoDatos());
  grupo = await operar(usuario, "guardar", crear("grupo", "Vegetales", { ejemplos: "Ejemplo de prueba", coccion: "Al vapor", notas: "" }));
}, 60000);
afterAll(async () => { await bd?.close(); });

describe("Biblioteca propia: permisos y versiones", () => {
  it("crea, busca y pagina sin exponer contenido de otro consultorio", async () => {
    const listado = await comoUsuario(bd, usuario, tx => tx.query<{ datos: { total: number; contadores: object } }>("select public.consultar_biblioteca('{\"tipo\":\"alimento\",\"q\":\"ensayo\"}') datos"));
    expect(listado.rows[0].datos).toMatchObject({ total: 1, contadores: { fuente: 1, alimento: 1, grupo: 1 } });
    for (const tabla of ["biblioteca_recursos", "biblioteca_relaciones", "biblioteca_versiones"]) expect((await comoUsuario(bd, ajeno, tx => tx.query(`select * from public.${tabla} where consultorio_id=$1`, [consultorio]))).rows).toHaveLength(0);
    expect((await comoUsuario(bd, ajeno, tx => tx.query<{ datos: unknown }>("select public.obtener_recurso_biblioteca($1) datos", [alimento]))).rows[0].datos).toBeNull();
    await expect(operar(ajeno, "archivar", { id: alimento, version: 1 })).rejects.toThrow("sin_permiso");
    await expect(operar(ajeno, "guardar", { ...alimentoDatos(), id: alimento, version: 1 })).rejects.toThrow("sin_permiso");
  });

  it("deniega anónimos, pacientes sin membresía y escrituras directas", async () => {
    await expect(comoAnonimo(bd, tx => tx.query("select public.consultar_biblioteca('{}')"))).rejects.toThrow();
    const persona = await crearUsuario(bd, "lector-biblioteca@prueba.test");
    await expect(operar(persona, "guardar", fuenteDatos)).rejects.toThrow("sin_permiso");
    expect((await comoUsuario(bd, persona, tx => tx.query("select id from public.biblioteca_recursos"))).rows).toHaveLength(0);
    await expect(comoUsuario(bd, usuario, tx => tx.query("update public.biblioteca_recursos set nombre='Directo' where id=$1", [alimento]))).rejects.toThrow();
    await expect(comoUsuario(bd, usuario, tx => tx.query("delete from public.biblioteca_versiones where recurso_id=$1", [alimento]))).rejects.toThrow();
  });

  it("valida fuente, cantidades, unidades y sumas en la base aun salteando la app", async () => {
    await expect(operar(ajeno, "guardar", alimentoDatos())).rejects.toThrow("fuente_invalida");
    await expect(operar(usuario, "guardar", { ...alimentoDatos(), contenido: { energia: -1 } })).rejects.toThrow("datos_invalidos");
    await expect(operar(usuario, "guardar", crear("fuente", "Sin licencia", { referencia: "Ficha", version: "1", base: "100g" }))).rejects.toThrow("datos_invalidos");
    await expect(operar(usuario, "guardar", { ...alimentoDatos(), contenido: { proteinas: 80, grasas: 80 } })).rejects.toThrow("datos_invalidos");
    await expect(operar(usuario, "guardar", crear("plato", "Vacío", { porciones: 1, peso_final: null }))).rejects.toThrow("composicion_vacia");
    await expect(operar(usuario, "guardar", crear("plato_grupos", "Partes incompletas", {}, { relaciones: [{ referencia_id: grupo, detalle: { fraccion: .5, ejemplos: "", coccion: "" } }] }))).rejects.toThrow("fraccion_invalida");
    await expect(operar(usuario, "guardar", crear("plato", "Unidad incorrecta", { porciones: 1, peso_final: null }, { relaciones: [{ referencia_id: alimento, detalle: { cantidad: 1, unidad: "scoop", gramos_por_unidad: null, rendimiento: 1 } }] }))).rejects.toThrow("datos_invalidos");
    await expect(operar(usuario, "guardar", crear("plato", "Sin factor", { porciones: 1, peso_final: null }, { relaciones: [{ referencia_id: alimento, detalle: { cantidad: 1, unidad: "g", gramos_por_unidad: 1 } }] }))).rejects.toThrow("datos_invalidos");
  });

  it("impide asociaciones cruzadas también mediante claves compuestas", async () => {
    const ajenoFuente = await operar(ajeno, "guardar", fuenteDatos);
    await expect(operar(usuario, "guardar", { ...alimentoDatos(), fuente_id: ajenoFuente })).rejects.toThrow("fuente_invalida");
    await expect(bd.query("insert into public.biblioteca_relaciones values($1,$2,1,$3,'{}','{}')", [alimento, consultorio, ajenoFuente])).rejects.toThrow(/foreign key/);
  });

  it("guarda ingredientes y fuente como copias y conserva todas las versiones", async () => {
    plato = await operar(usuario, "guardar", crear("plato", "Plato de ensayo", { porciones: 2, peso_final: 180, preparacion: "Preparación de prueba", alternativas: "Revisar profesionalmente", notas: "" }, { relaciones: [{ referencia_id: alimento, detalle: { cantidad: 100, unidad: "g", gramos_por_unidad: 1, rendimiento: .9 } }] }));
    await operar(usuario, "guardar", { ...alimentoDatos(), id: alimento, version: 1, nombre: "Nombre corregido" });
    const guardado = await obtener(plato);
    expect(guardado.relaciones[0].instantanea.nombre).toBe("Alimento de ensayo");
    expect(guardado.relaciones[0].instantanea.fuente_instantanea.contenido.licencia).toBe("Contenido propio de prueba");
    expect(guardado.relaciones[0].detalle).toEqual({ cantidad: 100, unidad: "g", gramos_por_unidad: 1, rendimiento: .9 });
    expect((await obtener(alimento, 1)).recurso.nombre).toBe("Alimento de ensayo");
    expect((await obtener(alimento)).historial).toHaveLength(2);
  });

  it("duplica como recurso independiente y detecta ediciones simultáneas", async () => {
    const copia = await operar(usuario, "duplicar", { id: plato, version: 1 });
    expect(copia).not.toBe(plato);
    expect((await obtener(copia)).relaciones[0].instantanea.version).toBe(1);
    await operar(usuario, "archivar", { id: copia, version: 1 });
    await expect(operar(usuario, "archivar", { id: copia, version: 1 })).rejects.toThrow("version_desactualizada");
    expect((await obtener(plato)).recurso.version).toBe(1);
  });

  it("editar notas conserva la versión de ingrediente elegida, aunque cambie el catálogo", async () => {
    const original = await obtener(plato);
    await operar(usuario, "guardar", crear("plato", "Plato de ensayo", { porciones: 2, peso_final: 180, notas: "Nota nueva" }, { id: plato, version: 1, relaciones: original.relaciones.map(r => ({ referencia_id: alimento, referencia_version: r.instantanea.version, detalle: r.detalle })) }));
    expect((await obtener(plato)).relaciones[0].instantanea.version).toBe(1);
    expect((await obtener(plato, 1)).recurso.version).toBe(1);
  });

  it("archiva y restaura sin borrar relaciones ni historia", async () => {
    await operar(usuario, "archivar", { id: alimento, version: 2 });
    const activos = await comoUsuario(bd, usuario, tx => tx.query<{ datos: { total: number } }>("select public.consultar_biblioteca('{\"tipo\":\"alimento\"}') datos"));
    expect(activos.rows[0].datos.total).toBe(0);
    await expect(operar(usuario, "guardar", { ...alimentoDatos(), id: alimento, version: 3 })).rejects.toThrow("recurso_archivado");
    expect((await obtener(plato, 1)).relaciones[0].instantanea.nombre).toBe("Alimento de ensayo");
    await operar(usuario, "restaurar", { id: alimento, version: 3 });
    expect((await obtener(alimento)).recurso.version).toBe(4);
  });

  it("acepta partes que suman uno sin atribuirles composición exacta", async () => {
    const id = await operar(usuario, "guardar", crear("plato_grupos", "Plato flexible", { preparacion: "A elección", alternativas: "", notas: "" }, { relaciones: [{ referencia_id: grupo, detalle: { fraccion: .5, ejemplos: "Ejemplo A", coccion: "Horno" } }, { referencia_id: grupo, detalle: { fraccion: .5, ejemplos: "Ejemplo B", coccion: "Vapor" } }] }));
    expect((await obtener(id)).relaciones).toHaveLength(2);
  });

  it("exige membresía con cobertura también para las RPC de escritura", async () => {
    const vencido = await crearUsuario(bd, "biblioteca-vencida@prueba.test");
    const c = (await comoUsuario(bd, vencido, tx => tx.query<{ id: string }>("select public.crear_consultorio_inicial('Vencido') id"))).rows[0].id;
    await bd.query("update public.pruebas_profesionales set vence_en=now()-interval '30 days' where consultorio_id=$1", [c]);
    await expect(operar(vencido, "guardar", fuenteDatos)).rejects.toThrow("sin_permiso");
  });

  it("pagina en servidor y permite recuperar el resto del catálogo", async () => {
    for (let i=0; i<28; i++) await operar(usuario,"guardar",crear("grupo",`Paginación ${String(i).padStart(2,"0")}`,{ ejemplos: "", coccion: "", notas: "" }));
    const primera = (await comoUsuario(bd,usuario,tx => tx.query<{datos:{total:number;recursos:{id:string}[]}}>("select public.consultar_biblioteca('{\"tipo\":\"grupo\",\"q\":\"Paginación\"}') datos"))).rows[0].datos;
    const segunda = (await comoUsuario(bd,usuario,tx => tx.query<{datos:{total:number;recursos:{id:string}[]}}>("select public.consultar_biblioteca('{\"tipo\":\"grupo\",\"q\":\"Paginación\",\"pagina\":2}') datos"))).rows[0].datos;
    expect(primera.total).toBe(28); expect(primera.recursos).toHaveLength(25); expect(segunda.recursos).toHaveLength(3);
    expect(new Set([...primera.recursos,...segunda.recursos].map(r=>r.id)).size).toBe(28);
  });
});

describe("Preparaciones reutilizables y composición versionada", () => {
  async function leer(id: string, version?: number) {
    return (await comoUsuario(bd, usuario, tx => tx.query<{ datos: DetalleBiblioteca }>("select public.obtener_recurso_biblioteca($1,$2) datos", [id, version ?? null]))).rows[0].datos;
  }
  const receta = (nombre: string, referencia: string, tipo = "preparacion", versionReferencia = 1) => ({ ...crear(tipo, nombre, { porciones: 2, peso_final: 400, preparacion: "Ensayo", notas: "" }), relaciones: [{ referencia_id: referencia, referencia_version: versionReferencia, detalle: { cantidad: 200, unidad: "g", gramos_por_unidad: 1, rendimiento: 1 } }] });

  it("conserva la composición elegida de alimentos y preparaciones al cambiar el catálogo", async () => {
    const datosAlimento = { ...alimentoDatos(), nombre: "Insumo para preparación", contenido: { energia: 200, proteinas: 10, carbohidratos: 30, grasas: 0 } };
    const insumo = await operar(usuario, "guardar", datosAlimento);
    const datosPreparacion = receta("Preparación de ensayo", insumo);
    const preparacion = await operar(usuario, "guardar", datosPreparacion);
    const datosPlato = receta("Plato con preparación", preparacion, "plato");
    const platoConPreparacion = await operar(usuario, "guardar", datosPlato);
    const original = await leer(platoConPreparacion);
    const copia = await operar(usuario, "duplicar", { id: platoConPreparacion, version: 1 });
    expect(original.relaciones[0].instantanea.relaciones?.[0].instantanea.contenido.energia).toBe(200);
    expect(calcularComposicionBiblioteca(original.recurso, original.relaciones).total.energia).toBe(200);

    await operar(usuario, "guardar", { ...datosAlimento, id: insumo, version: 1, contenido: { ...datosAlimento.contenido, energia: 400 } });
    await operar(usuario, "guardar", { ...datosPreparacion, id: preparacion, version: 1, relaciones: [{ ...datosPreparacion.relaciones[0], referencia_version: 2 }] });
    const actualizado = await leer(preparacion);
    expect(calcularComposicionBiblioteca(actualizado.recurso, actualizado.relaciones).por_100g.energia).toBe(200);
    for (const id of [platoConPreparacion, copia]) {
      const guardado = await leer(id);
      expect(calcularComposicionBiblioteca(guardado.recurso, guardado.relaciones).total.energia).toBe(200);
    }
    await operar(usuario, "guardar", { ...datosPlato, id: platoConPreparacion, version: 1 });
    expect((await leer(platoConPreparacion)).relaciones[0].instantanea.version).toBe(1);
    const anterior = await leer(platoConPreparacion, 1);
    expect(anterior.relaciones).toEqual(original.relaciones);

    await operar(usuario, "archivar", { id: preparacion, version: 2 });
    const archivado = await leer(platoConPreparacion);
    expect(calcularComposicionBiblioteca(archivado.recurso, archivado.relaciones).total.energia).toBe(200);
    await expect(operar(usuario, "guardar", receta("Uso de archivada", preparacion, "plato"))).rejects.toThrow("referencia_invalida");
    await operar(usuario, "restaurar", { id: preparacion, version: 3 });
    expect((await leer(preparacion)).recurso.version).toBe(4);
    expect((await leer(preparacion, 1)).recurso.contenido.peso_final).toBe(400);
  });

  it("rechaza ciclos, referencias cruzadas y preparaciones sin ingredientes o porciones", async () => {
    const preparacion = await operar(usuario, "guardar", receta("Base válida", alimento, "preparacion", 1));
    await expect(operar(usuario, "guardar", receta("Preparación anidada", preparacion))).rejects.toThrow("referencia_invalida");
    await expect(operar(usuario, "guardar", { ...receta("Ciclo", preparacion), id: preparacion, version: 1 })).rejects.toThrow("referencia_invalida");
    await expect(operar(usuario, "guardar", receta("Plato como ingrediente", plato, "plato"))).rejects.toThrow("referencia_invalida");
    await expect(operar(ajeno, "guardar", receta("Referencia ajena", preparacion, "plato"))).rejects.toThrow("referencia_invalida");
    await expect(operar(usuario, "guardar", crear("preparacion", "Vacía", { porciones: 1, peso_final: null }))).rejects.toThrow("composicion_vacia");
    await expect(operar(usuario, "guardar", { ...receta("Sin porciones", alimento), contenido: { peso_final: 400 } })).rejects.toThrow("datos_invalidos");
    expect((await leer(preparacion)).recurso.version).toBe(1);
  });

  it("pagina preparaciones con sus insumos autorizados y el mismo cálculo que el detalle", async () => {
    const listado = (await comoUsuario(bd, usuario, tx => tx.query<{ datos: { recursos: RecursoBiblioteca[]; contadores: { preparacion: number } } }>("select public.consultar_biblioteca('{\"tipo\":\"preparacion\"}') datos"))).rows[0].datos;
    expect(listado.contadores.preparacion).toBeGreaterThan(0);
    for (const recurso of listado.recursos) {
      const detalle = await leer(recurso.id);
      expect(calcularComposicionBiblioteca(recurso, recurso.relaciones ?? []).por_100g).toEqual(calcularComposicionBiblioteca(detalle.recurso, detalle.relaciones).por_100g);
    }
    const ajenas = (await comoUsuario(bd, ajeno, tx => tx.query<{ datos: { total: number; recursos: unknown[] } }>("select public.consultar_biblioteca('{\"tipo\":\"preparacion\"}') datos"))).rows[0].datos;
    expect(ajenas).toMatchObject({ total: 0, recursos: [] });
  });
});
