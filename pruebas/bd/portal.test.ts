import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

const HUELLA = "ab".repeat(32);

let bd: PGlite;
let profesional: string;
let consultorio: string;
let paciente: string;
let persona: string;

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  profesional = await crearUsuario(bd, "profesional.portal@demo.test", { nombre: "Ana" });
  consultorio = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Portal') as id");
    return r.rows[0].id;
  });
  paciente = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into public.pacientes (consultorio_id, nombre, apellido, correo)
       values ($1, 'Luz', 'Paz', 'luz.portal@demo.test') returning id`,
      [consultorio],
    );
    return r.rows[0].id;
  });
  await comoUsuario(bd, profesional, (tx) =>
    tx.query(
      `insert into public.invitaciones_paciente
         (consultorio_id, paciente_id, consultorio_nombre, correo, token_hash, expira_en, creada_por)
       values ($1, $2, 'Consultorio Portal', 'luz.portal@demo.test', $3, now() + interval '7 days', $4)`,
      [consultorio, paciente, HUELLA, profesional],
    ),
  );
  persona = await crearUsuario(bd, "luz.portal@demo.test", { nombre: "Luz", apellido: "Paz" });
}, 60_000);

afterAll(async () => {
  await bd?.close();
});

describe("invitación al portal", () => {
  it("informa el consultorio de una invitación pendiente", async () => {
    const porCorreo = await comoAnonimo(bd, (tx) =>
      tx.query<{ nombre: string }>("select public.nombre_consultorio_invitacion($1, null) as nombre", [
        "luz.portal@demo.test",
      ]),
    );
    expect(porCorreo.rows[0].nombre).toBe("Consultorio Portal");
  });

  it("vincula la ficha y asigna el tipo de cuenta al aceptar", async () => {
    await comoUsuario(bd, persona, (tx) => tx.query("select public.aceptar_invitacion($1)", [HUELLA]));

    const perfil = await bd.query<{ tipo_cuenta: string }>("select tipo_cuenta from public.perfiles where id = $1", [
      persona,
    ]);
    const ficha = await bd.query<{ usuario_id: string }>("select usuario_id from public.pacientes where id = $1", [
      paciente,
    ]);
    expect(perfil.rows[0].tipo_cuenta).toBe("paciente");
    expect(ficha.rows[0].usuario_id).toBe(persona);
  });

  it("impide que una cuenta de paciente cree un consultorio", async () => {
    await expect(
      comoUsuario(bd, persona, (tx) => tx.query("select public.crear_consultorio_inicial('Otro')")),
    ).rejects.toThrow(/cuenta_de_paciente/);
  });

  it("no deja ver notas privadas y sí las publicadas", async () => {
    await comoUsuario(bd, profesional, async (tx) => {
      await tx.query(
        `insert into public.evoluciones (consultorio_id, paciente_id, titulo, contenido)
         values ($1, $2, 'Privada', 'Solo el consultorio')`,
        [consultorio, paciente],
      );
      await tx.query(
        `insert into public.evoluciones
           (consultorio_id, paciente_id, titulo, contenido, es_borrador, visible_para_paciente)
         values ($1, $2, 'Compartida', 'Podés verla', false, true)`,
        [consultorio, paciente],
      );
    });

    const visibles = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ titulo: string }>("select titulo from public.evoluciones order by titulo"),
    );
    expect(visibles.rows.map((fila) => fila.titulo)).toEqual(["Compartida"]);
  });

  it("otra cuenta no ve las notas compartidas", async () => {
    const ajeno = await crearUsuario(bd, "ajeno.portal@demo.test");
    const filas = await comoUsuario(bd, ajeno, (tx) => tx.query("select id from public.evoluciones"));
    expect(filas.rows).toHaveLength(0);
  });

  it("un visitante anónimo no lee la ficha", async () => {
    await expect(comoAnonimo(bd, (tx) => tx.query("select id from public.pacientes"))).rejects.toThrow(/permission denied/);
  });

  it("exige una contraseña propia para volver a entrar", async () => {
    const sinClave = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ tiene: boolean }>("select public.tiene_ingreso_propio() as tiene"),
    );
    expect(sinClave.rows[0].tiene).toBe(false);

    await bd.query(
      "update auth.users set encrypted_password = 'hash', raw_user_meta_data = '{\"debe_elegir_contrasena\": true}'::jsonb where id = $1",
      [persona],
    );
    const pendiente = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ tiene: boolean }>("select public.tiene_ingreso_propio() as tiene"),
    );
    expect(pendiente.rows[0].tiene).toBe(false);

    await bd.query(
      `update auth.users
       set raw_app_meta_data = '{"provider":"email","providers":["email","google"]}'::jsonb
       where id = $1`,
      [persona],
    );
    const conGoogle = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ tiene: boolean }>("select public.tiene_ingreso_propio() as tiene"),
    );
    expect(conGoogle.rows[0].tiene).toBe(true);

    await bd.query("update auth.users set raw_app_meta_data = '{}'::jsonb where id = $1", [persona]);
    await bd.query(
      "update auth.users set raw_user_meta_data = raw_user_meta_data - 'debe_elegir_contrasena' where id = $1",
      [persona],
    );
    const conClave = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ tiene: boolean }>("select public.tiene_ingreso_propio() as tiene"),
    );
    expect(conClave.rows[0].tiene).toBe(true);
  });

  it("rechaza una huella que no corresponde al correo de la sesión", async () => {
    const intruso = await crearUsuario(bd, "intruso.portal@demo.test");
    await expect(
      comoUsuario(bd, intruso, (tx) => tx.query("select public.aceptar_invitacion($1)", [HUELLA])),
    ).rejects.toThrow(/invitacion_invalida/);
  });
});
