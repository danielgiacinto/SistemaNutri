import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { comoAnonimo, comoUsuario, crearBaseDePruebas, crearUsuario } from "./base-de-pruebas";

let bd: PGlite;
let profesional: string;
let consultorio: string;

beforeAll(async () => {
  bd = await crearBaseDePruebas();
  profesional = await crearUsuario(bd, "pro.facturacion@demo.test", { nombre: "Ana" });
  consultorio = await comoUsuario(bd, profesional, async (tx) => {
    const r = await tx.query<{ id: string }>("select public.crear_consultorio_inicial('Consultorio Pago') as id");
    return r.rows[0].id;
  });
}, 60_000);

afterAll(async () => {
  await bd?.close();
});

describe("acceso comercial", () => {
  it("un alta nueva queda en prueba", async () => {
    const estado = await comoUsuario(bd, profesional, (tx) =>
      tx.query<{ estado: string }>("select public.estado_acceso_comercial($1) as estado", [consultorio]),
    );
    expect(estado.rows[0].estado).toBe("prueba");
  });

  it("cambiar la configuración global no acorta la prueba ya concedida", async () => {
    const antes = await bd.query<{ vence_en: string }>(
      "select vence_en from public.pruebas_profesionales where consultorio_id = $1",
      [consultorio],
    );
    await bd.query("update public.configuracion_comercial set prueba_cantidad = 3, prueba_unidad = 'dias'");
    const despues = await bd.query<{ vence_en: string }>(
      "select vence_en from public.pruebas_profesionales where consultorio_id = $1",
      [consultorio],
    );
    expect(new Date(despues.rows[0].vence_en).toISOString()).toBe(new Date(antes.rows[0].vence_en).toISOString());
  });

  it("una prueba vencida sin pago deja el acceso vencido y no borra el consultorio", async () => {
    await bd.query("update public.pruebas_profesionales set vence_en = now() - interval '1 day' where consultorio_id = $1", [
      consultorio,
    ]);
    const estado = await comoUsuario(bd, profesional, (tx) =>
      tx.query<{ estado: string }>("select public.estado_acceso_comercial($1) as estado", [consultorio]),
    );
    expect(estado.rows[0].estado).toBe("vencido");
    const sigue = await bd.query("select id from public.consultorios where id = $1", [consultorio]);
    expect(sigue.rows).toHaveLength(1);
  });

  it("un cobro aprobado cubre un mes y un duplicado no lo extiende dos veces", async () => {
    await bd.query(
      `insert into public.suscripciones (consultorio_id, mp_id, estado_mp, precio)
       values ($1, 'pre-1', 'authorized', 10000)`,
      [consultorio],
    );
    await bd.query(
      `select public.registrar_pago_verificado('pre-1', 'pago-1', 'aprobado', 10000, 'ARS', now())`,
    );
    await bd.query(
      `select public.registrar_pago_verificado('pre-1', 'pago-1', 'aprobado', 10000, 'ARS', now())`,
    );
    const pagos = await bd.query("select id from public.pagos_suscripcion");
    expect(pagos.rows).toHaveLength(1);
    const estado = await comoUsuario(bd, profesional, (tx) =>
      tx.query<{ estado: string }>("select public.estado_acceso_comercial($1) as estado", [consultorio]),
    );
    expect(estado.rows[0].estado).toBe("activo");
  });

  it("un cobro menor al precio no extiende la cobertura", async () => {
    const antes = await bd.query<{ cobertura_hasta: string }>(
      "select cobertura_hasta from public.suscripciones where consultorio_id = $1",
      [consultorio],
    );
    await bd.query(`select public.registrar_pago_verificado('pre-1', 'pago-chico', 'aprobado', 10, 'ARS', now())`);
    const despues = await bd.query<{ cobertura_hasta: string }>(
      "select cobertura_hasta from public.suscripciones where consultorio_id = $1",
      [consultorio],
    );
    expect(new Date(despues.rows[0].cobertura_hasta).toISOString()).toBe(
      new Date(antes.rows[0].cobertura_hasta).toISOString(),
    );
  });

  it("un visitante ve el precio publicado y no puede modificarlo", async () => {
    await bd.query("update public.configuracion_comercial set precio_mensual = 15999");
    const oferta = await comoAnonimo(bd, (tx) =>
      tx.query<{ precio_mensual: string }>("select precio_mensual from public.oferta_publica()"),
    );
    expect(Number(oferta.rows[0].precio_mensual)).toBe(15999);
    await expect(
      comoAnonimo(bd, (tx) => tx.query("update public.configuracion_comercial set precio_mensual = 1")),
    ).rejects.toThrow();
  });
});
