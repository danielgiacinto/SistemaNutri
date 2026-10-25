import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite;
let usuarioA: string;
let usuarioB: string;
let usuarioAdmin: string;
let consultorioA: string;
let consultorioB: string;
let pacienteA: string;
let pacienteB: string;

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  usuarioA = await crearUsuario(bd, "ana.clinica@demo.test", { nombre: "Ana" });
  usuarioB = await crearUsuario(bd, "bruno.clinica@demo.test", { nombre: "Bruno" });
  usuarioAdmin = await crearUsuario(bd, "admin.clinica@demo.test");
  await bd.query("insert into public.administradores_plataforma (usuario_id) values ($1)", [usuarioAdmin]);

  consultorioA = await comoUsuario(bd, usuarioA, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Ana') as id");
    return r.rows[0].id;
  });
  consultorioB = await comoUsuario(bd, usuarioB, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Bruno') as id");
    return r.rows[0].id;
  });

  pacienteA = await comoUsuario(bd, usuarioA, async (tx) => {
    const r = await tx.query<{ id: string }>(
      "insert into public.pacientes (consultorio_id, nombre, apellido, documento) values ($1, 'María', 'Rojas', '34551992') returning id",
      [consultorioA],
    );
    return r.rows[0].id;
  });
  pacienteB = await comoUsuario(bd, usuarioB, async (tx) => {
    const r = await tx.query<{ id: string }>(
      "insert into public.pacientes (consultorio_id, nombre, apellido) values ($1, 'Luis', 'Pérez') returning id",
      [consultorioB],
    );
    return r.rows[0].id;
  });
}, 60_000);

afterAll(async () => {
  await bd?.close();
});

describe("aislamiento de pacientes", () => {
  it("cada profesional ve solo sus pacientes", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) => tx.query<{ id: string }>("select id from public.pacientes"));
    expect(r.rows.map((f) => f.id)).toEqual([pacienteA]);
  });

  it("no se puede leer un paciente ajeno por id", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query("select id from public.pacientes where id = $1", [pacienteB]),
    );
    expect(r.rows).toHaveLength(0);
  });

  it("no se puede insertar un paciente en un consultorio ajeno", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query("insert into public.pacientes (consultorio_id, nombre, apellido) values ($1, 'Intruso', 'X')", [
          consultorioB,
        ]),
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it("rechaza un documento duplicado en el mismo consultorio", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query(
          "insert into public.pacientes (consultorio_id, nombre, apellido, documento) values ($1, 'Otra', 'Persona', '34551992')",
          [consultorioA],
        ),
      ),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it("el superadministrador no ve pacientes", async () => {
    const r = await comoUsuario(bd, usuarioAdmin, (tx) => tx.query("select id from public.pacientes"));
    expect(r.rows).toHaveLength(0);
  });
});

describe("turnos", () => {
  it("impide solapar turnos del mismo consultorio", async () => {
    await comoUsuario(bd, usuarioA, (tx) =>
      tx.query(
        "insert into public.turnos (consultorio_id, paciente_id, inicio, fin) values ($1, $2, '2026-10-26 13:00:00+00', '2026-10-26 13:45:00+00')",
        [consultorioA, pacienteA],
      ),
    );
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query(
          "insert into public.turnos (consultorio_id, paciente_id, inicio, fin) values ($1, $2, '2026-10-26 13:30:00+00', '2026-10-26 14:00:00+00')",
          [consultorioA, pacienteA],
        ),
      ),
    ).rejects.toThrow(/turno_solapado/);
  });

  it("rechaza un turno fuera del horario de atención cuando hay franjas", async () => {
    await comoUsuario(bd, usuarioA, (tx) =>
      tx.query(
        "insert into public.horarios_atencion (consultorio_id, dia_semana, hora_inicio, hora_fin) values ($1, 1, '09:00', '12:00')",
        [consultorioA],
      ),
    );
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query(
          "insert into public.turnos (consultorio_id, paciente_id, inicio, fin) values ($1, $2, '2026-10-26 16:00:00+00', '2026-10-26 16:45:00+00')",
          [consultorioA, pacienteA],
        ),
      ),
    ).rejects.toThrow(/turno_fuera_de_horario/);
  });

  it("un profesional no ve los turnos de otro consultorio", async () => {
    const r = await comoUsuario(bd, usuarioB, (tx) => tx.query("select id from public.turnos"));
    expect(r.rows).toHaveLength(0);
  });
});

describe("evoluciones privadas", () => {
  it("crea una evolución privada en borrador y no la comparte si sigue en borrador", async () => {
    const id = await comoUsuario(bd, usuarioA, async (tx) => {
      const r = await tx.query<{ id: string }>(
        "insert into public.evoluciones (consultorio_id, paciente_id, contenido) values ($1, $2, 'Nota privada') returning id",
        [consultorioA, pacienteA],
      );
      return r.rows[0].id;
    });
    const fila = await bd.query<{ es_borrador: boolean; visible_para_paciente: boolean }>(
      "select es_borrador, visible_para_paciente from public.evoluciones where id = $1",
      [id],
    );
    expect(fila.rows[0]).toEqual({ es_borrador: true, visible_para_paciente: false });

    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query("update public.evoluciones set visible_para_paciente = true where id = $1", [id]),
      ),
    ).rejects.toThrow();
  });

  it("guarda una versión al modificar el contenido", async () => {
    const id = await comoUsuario(bd, usuarioA, async (tx) => {
      const r = await tx.query<{ id: string }>(
        "insert into public.evoluciones (consultorio_id, paciente_id, contenido, es_borrador) values ($1, $2, 'Original', false) returning id",
        [consultorioA, pacienteA],
      );
      await tx.query("update public.evoluciones set contenido = 'Corregido' where id = $1", [r.rows[0].id]);
      return r.rows[0].id;
    });
    const versiones = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query<{ contenido: string }>("select contenido from public.evoluciones_versiones where evolucion_id = $1", [id]),
    );
    expect(versiones.rows.map((f) => f.contenido)).toContain("Original");
  });

  it("el otro profesional no ve evoluciones ajenas", async () => {
    const r = await comoUsuario(bd, usuarioB, (tx) => tx.query("select id from public.evoluciones"));
    expect(r.rows).toHaveLength(0);
  });
});

describe("acceso anónimo a datos clínicos", () => {
  it("un visitante no lee tablas clínicas", async () => {
    for (const tabla of ["pacientes", "turnos", "evoluciones", "objetivos", "mediciones"]) {
      await expect(comoAnonimo(bd, (tx) => tx.query(`select * from public.${tabla}`))).rejects.toThrow(/permission denied/);
    }
  });
});
