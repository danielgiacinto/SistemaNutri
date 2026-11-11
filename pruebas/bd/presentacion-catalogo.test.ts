import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite; let usuario: string; let ajeno: string; let consultorio: string;
const servicio = randomUUID();
const guardar = (actor: string, datos: Record<string, unknown>) => comoUsuario(bd, actor, tx => tx.query("select public.gestionar_presentacion_catalogo($1::jsonb)", [JSON.stringify(datos)]));
const datosServicio = { tipo: "servicio", id: servicio, nombre: "Seguimiento", precio: 30000, moneda: "ARS", duracion: "45", activo: true, descripcion: "Descripción original", aclaracion: "Por sesión" };

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  usuario = await crearUsuario(bd, "catalogo@prueba.test"); ajeno = await crearUsuario(bd, "catalogo-ajeno@prueba.test");
  consultorio = (await comoUsuario(bd, usuario, tx => tx.query<{ id: string }>("select public.crear_consultorio_inicial('Catálogo') as id"))).rows[0].id;
  await comoUsuario(bd, ajeno, tx => tx.query("select public.crear_consultorio_inicial('Ajeno')"));
  await guardar(usuario, datosServicio);
}, 60000);
afterAll(async () => { await bd?.close(); });

describe("Presentación del catálogo y permisos", () => {
  it("guarda la aclaración y una nota independiente de instrucciones de cobro", async () => {
    await guardar(usuario, { tipo: "nota", nota: "Aceptamos efectivo y transferencia" });
    const filas = await comoUsuario(bd, usuario, tx => tx.query<{ aclaracion_paciente: string }>("select aclaracion_paciente from public.servicios_consultorio where id=$1", [servicio]));
    expect(filas.rows[0].aclaracion_paciente).toBe("Por sesión");
    const configuracion = await comoUsuario(bd, usuario, tx => tx.query<{ nota_precios: string; instrucciones: string }>("select nota_precios,instrucciones from public.configuracion_financiera"));
    expect(configuracion.rows[0]).toEqual({ nota_precios: "Aceptamos efectivo y transferencia", instrucciones: "" });
  });

  it("impide leer o modificar el catálogo de otro profesional y no permite acceso anónimo", async () => {
    expect((await comoUsuario(bd, ajeno, tx => tx.query("select id from public.servicios_consultorio where id=$1", [servicio]))).rows).toHaveLength(0);
    expect((await comoUsuario(bd, ajeno, tx => tx.query("select nota_precios from public.configuracion_financiera where profesional_id=$1", [usuario]))).rows).toHaveLength(0);
    await expect(guardar(ajeno, { ...datosServicio, aclaracion: "Cambio ajeno" })).rejects.toThrow("sin_permiso");
    await expect(comoAnonimo(bd, tx => tx.query("select public.gestionar_presentacion_catalogo('{}')"))).rejects.toThrow();
    await expect(comoAnonimo(bd, tx => tx.query("select aclaracion_paciente from public.servicios_consultorio"))).rejects.toThrow();
  });

  it("exige la RPC para escribir y valida longitud e importes aun con llamadas directas", async () => {
    await expect(comoUsuario(bd, usuario, tx => tx.query("update public.servicios_consultorio set aclaracion_paciente='Directa' where id=$1", [servicio]))).rejects.toThrow();
    await expect(comoUsuario(bd, usuario, tx => tx.query("update public.configuracion_financiera set nota_precios='Directa'"))).rejects.toThrow();
    await expect(comoUsuario(bd, usuario, tx => tx.query("delete from public.servicios_consultorio where id=$1", [servicio]))).rejects.toThrow();
    await expect(guardar(usuario, { ...datosServicio, aclaracion: "a".repeat(301) })).rejects.toThrow("texto_invalido");
    await expect(guardar(usuario, { tipo: "nota", nota: "a".repeat(1001) })).rejects.toThrow("texto_invalido");
    await expect(guardar(usuario, { ...datosServicio, precio: 10.123 })).rejects.toThrow("importe_invalido");
  });

  it("conserva precio y nombre históricos al editar o desactivar el servicio", async () => {
    const paciente = (await comoUsuario(bd, usuario, tx => tx.query<{ id: string }>("insert into public.pacientes(consultorio_id,nombre,apellido) values($1,'Paciente','Prueba') returning id", [consultorio]))).rows[0].id;
    const turno = (await comoUsuario(bd, usuario, tx => tx.query<{ id: string }>("insert into public.turnos(consultorio_id,paciente_id,inicio,fin,servicio_id) values($1,$2,'2027-01-04 12:00:00+00','2027-01-04 12:45:00+00',$3) returning id", [consultorio, paciente, servicio]))).rows[0].id;
    await guardar(usuario, { ...datosServicio, nombre: "Nombre nuevo", precio: 45000, activo: false, aclaracion: "Pack de 4" });
    const original = (await bd.query<{ original: string; servicio_nombre: string }>("select original,servicio_nombre from public.operaciones_consultorio where turno_id=$1", [turno])).rows[0];
    expect(Number(original.original)).toBe(30000);
    expect(original.servicio_nombre).toBe("Seguimiento");
  });
});
