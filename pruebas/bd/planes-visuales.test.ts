import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";
import type { DocumentoPlan, PlantillaPlan } from "../../src/tipos/plan-visual";

let bd: PGlite;
let profesional: string, ajeno: string, persona: string, consultorio: string, paciente: string, otroPaciente: string, plantilla: PlantillaPlan, plan: string;
const documento: DocumentoPlan = { objetivo: "Organizar los horarios", etiquetas: ["Mantenimiento"], bloques: [
  { id: randomUUID(), tipo: "semana", titulo: "Una semana", texto: "A tu ritmo", entradas: [{ id: randomUUID(), dia: 0, momento: "desayuno", detalle: "Una comida de prueba", recursos: [] }] },
  { id: randomUUID(), tipo: "texto", titulo: "Acompañamiento", texto: "Texto original de ensayo", entradas: [] },
] };
async function gestionar(accion: string, datos: unknown, usuario = profesional) {
  return comoUsuario(bd, usuario, async tx => (await tx.query<{ resultado: PlantillaPlan }>("select public.gestionar_plantilla_plan($1,$2) resultado", [accion, JSON.stringify(datos)])).rows[0].resultado);
}
async function guardar(datos: Record<string, unknown>, usuario = profesional) {
  return comoUsuario(bd, usuario, async tx => (await tx.query<{ resultado: { revision: number; numero: number | null; documento: DocumentoPlan } }>("select public.guardar_plan_visual($1) resultado", [JSON.stringify(datos)])).rows[0].resultado);
}
function datos(revision: number, cambio: Record<string, unknown> = {}) {
  return { id: plan, titulo: "Plan visual", indicaciones: "Indicaciones", documento, revision, solicitud: randomUUID(), publicar: false, ...cambio };
}

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  profesional = await crearUsuario(bd, "profesional.visual@demo.test", { nombre: "Ana", apellido: "Prueba" });
  ajeno = await crearUsuario(bd, "ajeno.visual@demo.test");
  persona = await crearUsuario(bd, "paciente.visual@demo.test");
  consultorio = await comoUsuario(bd, profesional, async tx => (await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio visual') id")).rows[0].id);
  const otroConsultorio = await comoUsuario(bd, ajeno, async tx => (await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Otro consultorio') id")).rows[0].id);
  paciente = (await bd.query<{ id: string }>("insert into public.pacientes(consultorio_id,nombre,apellido,usuario_id,creado_por) values($1,'Luz','Prueba',$2,$3) returning id", [consultorio, persona, profesional])).rows[0].id;
  otroPaciente = await comoUsuario(bd, ajeno, async tx => (await tx.query<{ id: string }>("insert into public.pacientes(consultorio_id,nombre,apellido) values($1,'Otra','Persona') returning id", [otroConsultorio])).rows[0].id);
}, 60000);
afterAll(async () => { await bd?.close(); });

describe("planes visuales y reutilización", () => {
  it("crea una plantilla propia, guarda con versión y detecta edición concurrente", async () => {
    plantilla = await gestionar("crear", { titulo: "Plantilla semanal", documento });
    expect(plantilla.base).toBe(false);
    plantilla = await gestionar("guardar", { id: plantilla.id, version: 1, titulo: "Semana personalizada", documento });
    expect(plantilla.version).toBe(2);
    await expect(gestionar("guardar", { id: plantilla.id, version: 1, titulo: "Conflicto", documento })).rejects.toThrow("version_desactualizada");
  });
  it("protege las bases, permite copiarlas y deniega toda escritura directa", async () => {
    const base = (await comoUsuario(bd, profesional, tx => tx.query<{ id: string; version: number }>("select id,version from public.plantillas_planes where base"))).rows[0];
    await expect(gestionar("guardar", { ...base, titulo: "Alterada", documento })).rejects.toThrow("sin_permiso");
    const copia = await gestionar("duplicar", base);
    expect(copia.base).toBe(false);
    expect(copia.id).not.toBe(base.id);
    for (const sql of ["delete from public.plantillas_planes", "update public.plantillas_planes set titulo='Alterada'", "insert into public.plantillas_planes(titulo,documento) values('Alterada','{}')"]) {
      await expect(comoUsuario(bd, profesional, tx => tx.exec(sql))).rejects.toThrow(/permission denied/);
    }
    await expect(comoAnonimo(bd, tx => tx.query("select public.consultar_plantillas_planes()"))).rejects.toThrow(/permission denied/);
  });
  it("aísla plantillas y destinatarios de otros consultorios", async () => {
    expect((await comoUsuario(bd, ajeno, tx => tx.query("select * from public.plantillas_planes where id=$1", [plantilla.id]))).rows).toHaveLength(0);
    await expect(gestionar("duplicar", { id: plantilla.id, version: 2 }, ajeno)).rejects.toThrow("sin_permiso");
    await expect(comoUsuario(bd, profesional, tx => tx.query("select public.crear_plan_desde_plantilla($1,$2)", [plantilla.id, otroPaciente]))).rejects.toThrow("sin_permiso");
  });
  it("asigna como copia y editar la plantilla no cambia ese borrador", async () => {
    plan = await comoUsuario(bd, profesional, async tx => (await tx.query<{ id: string }>("select public.crear_plan_desde_plantilla($1,$2) id", [plantilla.id, paciente])).rows[0].id);
    await gestionar("guardar", { id: plantilla.id, version: 2, titulo: "Plantilla modificada", documento: { ...documento, objetivo: "Otro objetivo" } });
    const borrador = (await comoUsuario(bd, profesional, tx => tx.query<{ documento: DocumentoPlan }>("select documento from public.planes_alimentarios where id=$1", [plan]))).rows[0];
    expect(borrador.documento.objetivo).toBe(documento.objetivo);
  });
  it("guarda y publica de forma atómica e idempotente, con destinatario y presentación", async () => {
    const solicitud = datos(0, { publicar: true, pacienteId: paciente });
    const resultado = await guardar(solicitud);
    expect(resultado.numero).toBe(1);
    expect(await guardar(solicitud)).toEqual(resultado);
    const publicaciones = await comoUsuario(bd, persona, tx => tx.query<{ documento: DocumentoPlan; presentacion: { paciente: string } }>("select documento,presentacion from public.planes_publicaciones where plan_id=$1", [plan]));
    expect(publicaciones.rows).toHaveLength(1);
    expect(publicaciones.rows[0].presentacion.paciente).toBe("Luz Prueba");
    expect(publicaciones.rows[0].documento).toEqual(documento);
    expect((await comoUsuario(bd, persona, tx => tx.query("select id from public.planes_alimentarios"))).rows).toHaveLength(0);
    await expect(guardar(datos(1), ajeno)).rejects.toThrow("sin_permiso");
  });
  it("rechaza el destinatario incorrecto sin cambiar el borrador y detecta conflictos", async () => {
    await expect(guardar(datos(1, { publicar: true, pacienteId: otroPaciente, titulo: "No se debe guardar" }))).rejects.toThrow("destinatario_invalido");
    const actual = (await bd.query<{ titulo: string; revision: number }>("select titulo,revision from public.planes_alimentarios where id=$1", [plan])).rows[0];
    expect(actual).toEqual({ titulo: "Plan visual", revision: 1 });
    await expect(guardar(datos(0))).rejects.toThrow("version_desactualizada");
  });
  it("el borrador conserva la entrega anterior y republicar crea una segunda versión", async () => {
    const modificado = { ...documento, objetivo: "Nuevo objetivo del borrador" };
    await guardar(datos(1, { documento: modificado }));
    expect((await comoUsuario(bd, persona, tx => tx.query<{ documento: DocumentoPlan }>("select documento from public.planes_publicaciones where plan_id=$1", [plan]))).rows[0].documento.objetivo).toBe(documento.objetivo);
    const resultado = await guardar(datos(2, { documento: modificado, publicar: true, pacienteId: paciente }));
    expect(resultado.numero).toBe(2);
    expect((await bd.query("select id from public.planes_publicaciones where plan_id=$1", [plan])).rows).toHaveLength(2);
    await expect(comoUsuario(bd, profesional, tx => tx.query("select public.publicar_plan($1)", [plan]))).rejects.toThrow("editor_visual_requerido");
    await expect(comoUsuario(bd, profesional, tx => tx.query("select public.guardar_plan($1,'Título','','[]')", [plan]))).rejects.toThrow("editor_visual_requerido");
  });
  it("valida también llamadas directas y no entrega documentos vacíos", async () => {
    await expect(guardar(datos(3, { documento: { objetivo: "", etiquetas: [], bloques: [] }, publicar: true, pacienteId: paciente }))).rejects.toThrow("plan_vacio");
    await expect(guardar(datos(3, { documento: { ...documento, bloques: [{ ...documento.bloques[0], entradas: [{ ...documento.bloques[0].entradas[0], dia: 7 }] }] } }))).rejects.toThrow("documento_invalido");
    await expect(comoUsuario(bd, profesional, tx => tx.query("select privado.normalizar_documento_plan('{}',$1)", [consultorio]))).rejects.toThrow(/permission denied/);
  });
  it("obtiene instantáneas de Biblioteca del servidor y rechaza referencias cruzadas", async () => {
    const base = (await bd.query<{ id: string; version: number }>("select id,version from public.biblioteca_base_versiones where tipo='plato' limit 1")).rows[0];
    const recurso = await comoUsuario(bd, profesional, async tx => (await tx.query<{ id: string }>("select public.copiar_recurso_base($1,$2) id", [base.id, base.version])).rows[0].id);
    const conRecurso = structuredClone(documento);
    conRecurso.bloques[0].entradas[0].recursos = [{ id: recurso, version: 1, cantidad: 2, variante: null, instantanea: { recurso: { nombre: "Falsificado" } } as never }];
    const guardado = await guardar(datos(3, { documento: conRecurso, publicar: true, pacienteId: paciente }));
    expect(guardado.documento.bloques[0].entradas[0].recursos[0].instantanea?.recurso.nombre).not.toBe("Falsificado");
    conRecurso.bloques[0].entradas[0].recursos[0].id = randomUUID();
    await expect(guardar(datos(4, { documento: conRecurso }))).rejects.toThrow("referencia_invalida");
    await bd.query("update public.biblioteca_recursos set nombre='Nombre posterior' where id=$1", [recurso]);
    const historico = (await bd.query<{ documento: DocumentoPlan }>("select documento from public.planes_publicaciones where plan_id=$1 and numero=3", [plan])).rows[0];
    expect(historico.documento.bloques[0].entradas[0].recursos[0].instantanea?.recurso.nombre).not.toBe("Nombre posterior");
  });
});
