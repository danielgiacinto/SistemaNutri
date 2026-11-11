import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite;
let profesional: string;
let ajeno: string;
let persona: string;
let consultorio: string;
let paciente: string;

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  profesional = await crearUsuario(bd, "alta@demo.test");
  ajeno = await crearUsuario(bd, "ajeno.alta@demo.test");
  persona = await crearUsuario(bd, "persona.alta@demo.test");
  consultorio = (await comoUsuario(bd, profesional, tx => tx.query<{ id: string }>("select public.crear_consultorio_inicial('Alta mínima') as id"))).rows[0].id;
  await comoUsuario(bd, ajeno, tx => tx.query("select public.crear_consultorio_inicial('Otro consultorio')"));
}, 60_000);

afterAll(async () => { await bd?.close(); });

describe("alta mínima, cobertura y permisos", () => {
  it("crea un paciente solamente con nombre dentro del consultorio autorizado", async () => {
    const resultado = await comoUsuario(bd, profesional, tx => tx.query<{ id: string; apellido: string; sexo: string | null }>("insert into public.pacientes (consultorio_id, nombre) values ($1, 'Ana') returning id, apellido, sexo", [consultorio]));
    paciente = resultado.rows[0].id;
    expect(resultado.rows[0]).toMatchObject({ apellido: "", sexo: null });
  });

  it("permite guardar y leer cobertura sin perder los ceros del afiliado", async () => {
    const resultado = await comoUsuario(bd, profesional, tx => tx.query("update public.pacientes set sexo = 'x', obra_social = 'Cobertura ficticia', numero_afiliado = '00123' where id = $1 returning sexo, obra_social, numero_afiliado", [paciente]));
    expect(resultado.rows[0]).toEqual({ sexo: "x", obra_social: "Cobertura ficticia", numero_afiliado: "00123" });
    const altaCompleta = await comoUsuario(bd, profesional, tx => tx.query("insert into public.pacientes (consultorio_id, nombre, sexo, obra_social, numero_afiliado) values ($1, 'Otra persona', 'femenino', 'Prueba', '00001') returning numero_afiliado", [consultorio]));
    expect(altaCompleta.rows[0]).toEqual({ numero_afiliado: "00001" });
  });

  it("impide leer, insertar o actualizar cobertura en un consultorio ajeno", async () => {
    const lectura = await comoUsuario(bd, ajeno, tx => tx.query("select sexo, obra_social, numero_afiliado from public.pacientes where id = $1", [paciente]));
    expect(lectura.rows).toHaveLength(0);
    const escritura = await comoUsuario(bd, ajeno, tx => tx.query("update public.pacientes set obra_social = 'Intrusión' where id = $1 returning id", [paciente]));
    expect(escritura.rows).toHaveLength(0);
    await expect(comoUsuario(bd, ajeno, tx => tx.query("insert into public.pacientes (consultorio_id, nombre, sexo) values ($1, 'Intruso', 'x')", [consultorio]))).rejects.toThrow(/row-level security/i);
  });

  it("el paciente puede leer su cobertura y no modificarla", async () => {
    const huella = "cd".repeat(32);
    await comoUsuario(bd, profesional, async tx => {
      await tx.query("update public.pacientes set correo = 'persona.alta@demo.test' where id = $1", [paciente]);
      await tx.query("insert into public.invitaciones_paciente (consultorio_id, paciente_id, consultorio_nombre, correo, token_hash, expira_en, creada_por) values ($1, $2, 'Alta mínima', 'persona.alta@demo.test', $3, now() + interval '7 days', $4)", [consultorio, paciente, huella, profesional]);
    });
    await comoUsuario(bd, persona, tx => tx.query("select public.aceptar_invitacion($1)", [huella]));
    const lectura = await comoUsuario(bd, persona, tx => tx.query("select numero_afiliado from public.pacientes where id = $1", [paciente]));
    expect(lectura.rows[0]).toEqual({ numero_afiliado: "00123" });
    const escritura = await comoUsuario(bd, persona, tx => tx.query("update public.pacientes set numero_afiliado = 'otro' where id = $1 returning id", [paciente]));
    expect(escritura.rows).toHaveLength(0);
  });

  it("no permite leer cobertura anónimamente ni borrar pacientes", async () => {
    await expect(comoAnonimo(bd, tx => tx.query("select obra_social from public.pacientes"))).rejects.toThrow(/permission denied/i);
    await expect(comoUsuario(bd, profesional, tx => tx.query("delete from public.pacientes where id = $1", [paciente]))).rejects.toThrow(/permission denied/i);
  });

  it("mantiene las restricciones de nombre, sexo y longitud en la base", async () => {
    for (const [nombre, sexo, obraSocial] of [["", null, null], ["Ana", "invalido", null], ["Ana", null, "x".repeat(121)]]) {
      await expect(comoUsuario(bd, profesional, tx => tx.query("insert into public.pacientes (consultorio_id, nombre, sexo, obra_social) values ($1, $2, $3, $4)", [consultorio, nombre, sexo, obraSocial]))).rejects.toThrow(/check constraint/i);
    }
  });
});
