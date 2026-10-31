import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite;
let profesional: string;
let consultorio: string;
let luzId: string;
let luz: string;
let leo: string;
let ajeno: string;
let admin: string;
let desafio: string;

async function invitarYAceptar(pacienteId: string, correo: string, nombre: string, huella: string) {
  await comoUsuario(bd, profesional, (tx) =>
    tx.query(
      `insert into public.invitaciones_paciente
         (consultorio_id, paciente_id, consultorio_nombre, correo, token_hash, expira_en, creada_por)
       values ($1, $2, 'Consultorio Comunidad', $3, $4, now() + interval '7 days', $5)`,
      [consultorio, pacienteId, correo, huella, profesional],
    ),
  );
  const persona = await crearUsuario(bd, correo, { nombre });
  await comoUsuario(bd, persona, (tx) => tx.query("select public.aceptar_invitacion($1)", [huella]));
  return persona;
}

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  profesional = await crearUsuario(bd, "pro.comunidad@demo.test", { nombre: "Ana" });
  consultorio = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Comunidad') as id");
    return r.rows[0].id;
  });
  luzId = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into public.pacientes (consultorio_id, nombre, apellido, correo)
       values ($1, 'Luz', 'Paz', 'luz.comunidad@demo.test') returning id`,
      [consultorio],
    );
    return r.rows[0].id;
  });
  const leoId = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into public.pacientes (consultorio_id, nombre, apellido, correo)
       values ($1, 'Leo', 'Ríos', 'leo.comunidad@demo.test') returning id`,
      [consultorio],
    );
    return r.rows[0].id;
  });
  luz = await invitarYAceptar(luzId, "luz.comunidad@demo.test", "Luz", "ab".repeat(32));
  leo = await invitarYAceptar(leoId, "leo.comunidad@demo.test", "Leo", "cd".repeat(32));
  ajeno = await crearUsuario(bd, "ajeno.comunidad@demo.test", { nombre: "Otto" });
  await comoUsuario(bd, ajeno, (tx) => tx.query("select public.crear_consultorio_inicial('Otro consultorio')"));
  admin = await crearUsuario(bd, "admin.comunidad@demo.test");
  await bd.query("insert into public.administradores_plataforma (usuario_id) values ($1)", [admin]);
}, 60_000);

afterAll(async () => {
  await bd?.close();
});

describe("comunidad del consultorio", () => {
  it("el borrador lo ve el consultorio y no el paciente", async () => {
    desafio = await comoUsuario(bd, profesional, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `insert into public.desafios (consultorio_id, titulo, consigna, inicio, fin)
         values ($1, 'Caminatas', 'Contá las veces que saliste a caminar.', current_date, current_date + 7)
         returning id`,
        [consultorio],
      );
      return r.rows[0].id;
    });

    const delPaciente = await comoUsuario(bd, luz, (tx) => tx.query("select id from public.desafios"));
    const delAjeno = await comoUsuario(bd, ajeno, (tx) => tx.query("select id from public.desafios"));
    expect(delPaciente.rows).toHaveLength(0);
    expect(delAjeno.rows).toHaveLength(0);
  });

  it("un visitante anónimo no lee los desafíos", async () => {
    await expect(comoAnonimo(bd, (tx) => tx.query("select id from public.desafios"))).rejects.toThrow(/permission denied/);
  });

  it("el paciente no crea desafíos ni publica el borrador", async () => {
    await expect(
      comoUsuario(bd, luz, (tx) =>
        tx.query(
          `insert into public.desafios (consultorio_id, titulo, consigna, inicio, fin)
           values ($1, 'Ajeno', 'No', current_date, current_date)`,
          [consultorio],
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    await comoUsuario(bd, luz, (tx) => tx.query("update public.desafios set estado = 'publicado' where id = $1", [desafio]));
    const estado = await bd.query<{ estado: string }>("select estado from public.desafios where id = $1", [desafio]);
    expect(estado.rows[0].estado).toBe("borrador");
  });

  it("al publicar, el paciente se suma y escribe; otra persona del grupo lo lee", async () => {
    await comoUsuario(bd, profesional, (tx) =>
      tx.query("update public.desafios set estado = 'publicado' where id = $1", [desafio]),
    );

    await expect(
      comoUsuario(bd, luz, (tx) =>
        tx.query("insert into public.actividades_comunidad (desafio_id, texto) values ($1, 'Antes de sumarme')", [desafio]),
      ),
    ).rejects.toThrow(/participacion_requerida/);

    await comoUsuario(bd, luz, (tx) =>
      tx.query("insert into public.participaciones_desafio (desafio_id) values ($1)", [desafio]),
    );
    await comoUsuario(bd, luz, (tx) =>
      tx.query("insert into public.actividades_comunidad (desafio_id, texto) values ($1, 'Caminé tres veces')", [desafio]),
    );

    const leidas = await comoUsuario(bd, leo, (tx) =>
      tx.query<{ autor_visible: string; texto: string }>(
        "select autor_visible, texto from public.actividades_comunidad",
      ),
    );
    expect(leidas.rows).toEqual([{ autor_visible: "Luz", texto: "Caminé tres veces" }]);
  });

  it("el paciente no elige el nombre que se muestra", async () => {
    await expect(
      comoUsuario(bd, luz, (tx) =>
        tx.query(
          "insert into public.actividades_comunidad (desafio_id, texto, autor_visible) values ($1, 'Otra', 'Otra persona')",
          [desafio],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("solo la autora o el consultorio borran una actividad", async () => {
    const actividad = await comoUsuario(bd, luz, async (tx) => {
      const r = await tx.query<{ id: string }>("select id from public.actividades_comunidad");
      return r.rows[0].id;
    });

    await comoUsuario(bd, leo, (tx) => tx.query("delete from public.actividades_comunidad where id = $1", [actividad]));
    const sigue = await bd.query("select id from public.actividades_comunidad where id = $1", [actividad]);
    expect(sigue.rows).toHaveLength(1);

    await comoUsuario(bd, profesional, (tx) => tx.query("delete from public.actividades_comunidad where id = $1", [actividad]));
    const quedó = await bd.query("select id from public.actividades_comunidad where id = $1", [actividad]);
    expect(quedó.rows).toHaveLength(0);
  });

  it("un desafío cerrado se lee y no acepta textos nuevos", async () => {
    await comoUsuario(bd, profesional, (tx) =>
      tx.query("update public.desafios set estado = 'cerrado' where id = $1", [desafio]),
    );
    const visibles = await comoUsuario(bd, luz, (tx) => tx.query("select id from public.desafios"));
    expect(visibles.rows).toHaveLength(1);

    await expect(
      comoUsuario(bd, luz, (tx) =>
        tx.query("insert into public.actividades_comunidad (desafio_id, texto) values ($1, 'Tarde')", [desafio]),
      ),
    ).rejects.toThrow(/desafio_no_publicado/);

    await expect(
      comoUsuario(bd, profesional, (tx) =>
        tx.query("update public.desafios set estado = 'borrador' where id = $1", [desafio]),
      ),
    ).rejects.toThrow(/desafio_cerrado/);
  });

  it("el superadministrador no ve la comunidad", async () => {
    const filas = await comoUsuario(bd, admin, (tx) => tx.query("select id from public.desafios"));
    expect(filas.rows).toHaveLength(0);
  });

  it("un desafío publicado no se borra", async () => {
    await comoUsuario(bd, profesional, (tx) => tx.query("delete from public.desafios where id = $1", [desafio]));
    const sigue = await bd.query("select id from public.desafios where id = $1", [desafio]);
    expect(sigue.rows).toHaveLength(1);
  });
});
