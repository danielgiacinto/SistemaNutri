import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite;
let usuarioA: string;
let usuarioB: string;
let usuarioAdmin: string;
let consultorioA: string;
let consultorioB: string;

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  usuarioA = await crearUsuario(bd, "ana@demo.test", { nombre: "Ana", apellido: "Demo" });
  usuarioB = await crearUsuario(bd, "bruno@demo.test", { full_name: "Bruno Ejemplo Prueba" });
  usuarioAdmin = await crearUsuario(bd, "admin@demo.test");
  await bd.query("insert into public.administradores_plataforma (usuario_id) values ($1)", [usuarioAdmin]);

  consultorioA = await comoUsuario(bd, usuarioA, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Ana') as id");
    return r.rows[0].id;
  });
  consultorioB = await comoUsuario(bd, usuarioB, async (tx) => {
    const r = await tx.query<{ id: string }>(
      "select public.crear_consultorio_inicial('Consultorio Bruno', 'America/Argentina/Buenos_Aires') as id",
    );
    return r.rows[0].id;
  });
}, 60_000);

afterAll(async () => {
  await bd?.close();
});

describe("alta de usuarios y perfiles", () => {
  it("crea el perfil automáticamente con los datos de registro", async () => {
    const r = await bd.query<{ nombre: string; apellido: string }>(
      "select nombre, apellido from public.perfiles where id = $1",
      [usuarioB],
    );
    expect(r.rows[0]).toEqual({ nombre: "Bruno", apellido: "Ejemplo Prueba" });
  });

  it("ignora un tipo de cuenta enviado en los metadatos del cliente", async () => {
    const intruso = await crearUsuario(bd, "intruso@demo.test", { tipo_cuenta: "profesional", rol: "superadmin" });
    const r = await bd.query<{ tipo_cuenta: string | null }>(
      "select tipo_cuenta from public.perfiles where id = $1",
      [intruso],
    );
    expect(r.rows[0].tipo_cuenta).toBeNull();
  });
});

describe("onboarding del consultorio", () => {
  it("asigna el tipo de cuenta profesional y la titularidad", async () => {
    const contexto = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query<{ tipo_cuenta: string; consultorio_id: string; rol_consultorio: string; consultorio_zona_horaria: string }>(
        "select tipo_cuenta, consultorio_id, rol_consultorio, consultorio_zona_horaria from public.obtener_mi_contexto()",
      ),
    );
    expect(contexto.rows).toHaveLength(1);
    expect(contexto.rows[0]).toMatchObject({
      tipo_cuenta: "profesional",
      consultorio_id: consultorioA,
      rol_consultorio: "titular",
      consultorio_zona_horaria: "America/Argentina/Cordoba",
    });
  });

  it("impide crear un segundo consultorio", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) => tx.query("select public.crear_consultorio_inicial('Otro')")),
    ).rejects.toThrow(/consultorio_existente/);
  });

  it("rechaza zonas horarias inexistentes", async () => {
    const otro = await crearUsuario(bd, "zona@demo.test");
    await expect(
      comoUsuario(bd, otro, (tx) => tx.query("select public.crear_consultorio_inicial('Consultorio X', 'Marte/Olympus')")),
    ).rejects.toThrow(/check constraint/);
  });

  it("registra la creación en la auditoría", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query<{ accion: string }>("select accion from public.registros_auditoria where consultorio_id = $1", [consultorioA]),
    );
    expect(r.rows.map((f) => f.accion)).toContain("consultorio.creado");
  });
});

describe("aislamiento entre consultorios (RLS)", () => {
  it("cada profesional ve solo su consultorio", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) => tx.query<{ id: string }>("select id from public.consultorios"));
    expect(r.rows.map((f) => f.id)).toEqual([consultorioA]);
  });

  it("no se puede consultar un consultorio ajeno por id", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query("select id from public.consultorios where id = $1", [consultorioB]),
    );
    expect(r.rows).toHaveLength(0);
  });

  it("no se puede modificar un consultorio ajeno", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query("update public.consultorios set nombre = 'Hackeado' where id = $1", [consultorioB]),
    );
    expect(r.affectedRows).toBe(0);
    const nombre = await bd.query<{ nombre: string }>("select nombre from public.consultorios where id = $1", [consultorioB]);
    expect(nombre.rows[0].nombre).toBe("Consultorio Bruno");
  });

  it("el titular puede editar los datos permitidos de su consultorio y queda auditado", async () => {
    await comoUsuario(bd, usuarioA, (tx) =>
      tx.query("update public.consultorios set telefono = '351 555-0000' where id = $1", [consultorioA]),
    );
    const r = await bd.query<{ detalles: { campos: string[] } }>(
      "select detalles from public.registros_auditoria where accion = 'consultorio.actualizado' and consultorio_id = $1",
      [consultorioA],
    );
    expect(r.rows.at(-1)?.detalles.campos).toEqual(["telefono"]);
  });

  it("el profesional no puede cambiar el estado comercial de su consultorio", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query("update public.consultorios set estado = 'activo' where id = $1", [consultorioA]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("no se ven perfiles ni membresías de otros consultorios", async () => {
    const perfiles = await comoUsuario(bd, usuarioA, (tx) => tx.query<{ id: string }>("select id from public.perfiles"));
    expect(perfiles.rows.map((f) => f.id)).toEqual([usuarioA]);
    const miembros = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query<{ consultorio_id: string }>("select consultorio_id from public.miembros_consultorio"),
    );
    expect(miembros.rows.map((f) => f.consultorio_id)).toEqual([consultorioA]);
  });

  it("no se ve la auditoría de otros consultorios", async () => {
    const r = await comoUsuario(bd, usuarioA, (tx) =>
      tx.query("select id from public.registros_auditoria where consultorio_id = $1", [consultorioB]),
    );
    expect(r.rows).toHaveLength(0);
  });
});

describe("prevención de escalada de privilegios", () => {
  it("el usuario no puede cambiar su tipo de cuenta", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) => tx.query("update public.perfiles set tipo_cuenta = 'paciente' where id = $1", [usuarioA])),
    ).rejects.toThrow(/permission denied/);
  });

  it("el usuario no puede auto-asignarse como superadministrador", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query("insert into public.administradores_plataforma (usuario_id) values ($1)", [usuarioA]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("el usuario no puede insertar membresías ni registros de auditoría", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query("insert into public.miembros_consultorio (consultorio_id, usuario_id) values ($1, $2)", [consultorioB, usuarioA]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      comoUsuario(bd, usuarioA, (tx) =>
        tx.query("insert into public.registros_auditoria (accion, entidad) values ('x', 'y')"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("el usuario no puede invocar funciones internas de auditoría", async () => {
    await expect(
      comoUsuario(bd, usuarioA, (tx) => tx.query("select privado.registrar_auditoria('x', 'y')")),
    ).rejects.toThrow(/permission denied/);
  });

  it("el usuario puede actualizar sus preferencias", async () => {
    await comoUsuario(bd, usuarioA, (tx) =>
      tx.query("update public.perfiles set tema = 'oscuro', paleta = 'oceano' where id = $1", [usuarioA]),
    );
    const r = await bd.query<{ tema: string; paleta: string }>("select tema, paleta from public.perfiles where id = $1", [usuarioA]);
    expect(r.rows[0]).toEqual({ tema: "oscuro", paleta: "oceano" });
  });
});

describe("acceso anónimo y de plataforma", () => {
  it("un visitante anónimo no accede a ninguna tabla", async () => {
    for (const tabla of ["perfiles", "consultorios", "miembros_consultorio", "registros_auditoria", "administradores_plataforma"]) {
      await expect(comoAnonimo(bd, (tx) => tx.query(`select * from public.${tabla}`))).rejects.toThrow(/permission denied/);
    }
  });

  it("un visitante anónimo no puede crear consultorios", async () => {
    await expect(
      comoAnonimo(bd, (tx) => tx.query("select public.crear_consultorio_inicial('Anon')")),
    ).rejects.toThrow(/permission denied/);
  });

  it("el superadministrador ve todos los consultorios y se identifica en su contexto", async () => {
    const consultorios = await comoUsuario(bd, usuarioAdmin, (tx) => tx.query<{ id: string }>("select id from public.consultorios"));
    expect(consultorios.rows.map((f) => f.id).sort()).toEqual(expect.arrayContaining([consultorioA, consultorioB]));
    const contexto = await comoUsuario(bd, usuarioAdmin, (tx) =>
      tx.query<{ es_superadmin: boolean }>("select es_superadmin from public.obtener_mi_contexto()"),
    );
    expect(contexto.rows[0].es_superadmin).toBe(true);
  });

  it("un profesional común no figura como superadministrador", async () => {
    const r = await comoUsuario(bd, usuarioB, (tx) =>
      tx.query<{ es_superadmin: boolean }>("select es_superadmin from public.obtener_mi_contexto()"),
    );
    expect(r.rows[0].es_superadmin).toBe(false);
  });
});
