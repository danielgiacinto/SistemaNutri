import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite;
let profesional: string;
let consultorio: string;
let paciente: string;
let persona: string;
let plan: string;

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  profesional = await crearUsuario(bd, "profesional.plan@demo.test", { nombre: "Ana" });
  consultorio = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Plan') as id");
    return r.rows[0].id;
  });
  paciente = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into public.pacientes (consultorio_id, nombre, apellido, correo)
       values ($1, 'Luz', 'Paz', 'luz.plan@demo.test') returning id`,
      [consultorio],
    );
    return r.rows[0].id;
  });
  persona = await crearUsuario(bd, "luz.plan@demo.test", { nombre: "Luz" });
  const huella = "cd".repeat(32);
  await comoUsuario(bd, profesional, (tx) =>
    tx.query(
      `insert into public.invitaciones_paciente
         (consultorio_id, paciente_id, consultorio_nombre, correo, token_hash, expira_en, creada_por)
       values ($1, $2, 'Consultorio Plan', 'luz.plan@demo.test', $3, now() + interval '7 days', $4)`,
      [consultorio, paciente, huella, profesional],
    ),
  );
  await comoUsuario(bd, persona, (tx) => tx.query("select public.aceptar_invitacion($1)", [huella]));
  plan = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into public.planes_alimentarios (consultorio_id, paciente_id, titulo)
       values ($1, $2, 'Plan de descenso') returning id`,
      [consultorio, paciente],
    );
    await tx.query(
      `insert into public.planes_comidas (plan_id, consultorio_id, orden, momento, detalle)
       values ($1, $2, 1, 'desayuno', 'Yogur con fruta')`,
      [r.rows[0].id, consultorio],
    );
    return r.rows[0].id;
  });
}, 60_000);

afterAll(async () => {
  await bd?.close();
});

describe("planes alimentarios", () => {
  it("oculta el borrador al paciente", async () => {
    const filas = await comoUsuario(bd, persona, (tx) => tx.query("select id from public.planes_comidas"));
    expect(filas.rows).toHaveLength(0);
  });

  it("publica una copia y no la cambia al editar el borrador", async () => {
    await comoUsuario(bd, profesional, (tx) => tx.query("select public.publicar_plan($1)", [plan]));

    const publicada = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ detalle: string }>(
        `select c.detalle
         from public.planes_publicaciones_comidas c
         join public.planes_publicaciones p on p.id = c.publicacion_id`,
      ),
    );
    expect(publicada.rows.map((fila) => fila.detalle)).toEqual(["Yogur con fruta"]);

    await comoUsuario(bd, profesional, (tx) =>
      tx.query("update public.planes_comidas set detalle = 'Avena' where plan_id = $1", [plan]),
    );

    const sigueIgual = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ detalle: string }>("select detalle from public.planes_publicaciones_comidas"),
    );
    expect(sigueIgual.rows.map((fila) => fila.detalle)).toEqual(["Yogur con fruta"]);

    const numero = await comoUsuario(bd, profesional, (tx) =>
      tx.query<{ publicar_plan: number }>("select public.publicar_plan($1)", [plan]),
    );
    expect(numero.rows[0].publicar_plan).toBe(2);

    const versiones = await comoUsuario(bd, persona, (tx) =>
      tx.query<{ numero: number; detalle: string }>(
        `select p.numero, c.detalle
         from public.planes_publicaciones p
         join public.planes_publicaciones_comidas c on c.publicacion_id = p.id
         order by p.numero`,
      ),
    );
    expect(versiones.rows).toEqual([
      { numero: 1, detalle: "Yogur con fruta" },
      { numero: 2, detalle: "Avena" },
    ]);
  });

  it("otra cuenta no ve las publicaciones", async () => {
    const ajeno = await crearUsuario(bd, "ajeno.plan@demo.test");
    const filas = await comoUsuario(bd, ajeno, (tx) => tx.query("select id from public.planes_publicaciones"));
    expect(filas.rows).toHaveLength(0);
  });

  it("un visitante anónimo no lee las publicaciones", async () => {
    await expect(comoAnonimo(bd, (tx) => tx.query("select id from public.planes_publicaciones"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("no deja borrar un plan ya publicado", async () => {
    const borrado = await comoUsuario(bd, profesional, (tx) =>
      tx.query("delete from public.planes_alimentarios where id = $1", [plan]),
    );
    expect(borrado.rows).toHaveLength(0);
    const sigue = await comoUsuario(bd, profesional, (tx) =>
      tx.query("select id from public.planes_alimentarios where id = $1", [plan]),
    );
    expect(sigue.rows).toHaveLength(1);
  });
});
