import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearBaseDePruebas, crearUsuario, comoUsuario } from "./base-de-pruebas";

let bd: PGlite;
beforeAll(async () => { bd = await crearBaseDePruebas(); }, 60_000);
afterAll(async () => { await bd?.close(); });

describe("avisos comerciales privados", () => {
  it("solo el servicio reclama la cola y la clave evita repetir un aviso", async () => {
    const usuario = await crearUsuario(bd, "correo-comercial@demo.test");
    const { rows } = await comoUsuario(bd, usuario, (tx) => tx.query<{ id: string }>("select public.crear_consultorio_inicial('Correo') as id"));
    const consultorio = rows[0].id;
    await bd.query("insert into public.correos_comerciales (consultorio_id, clave_evento, tipo, destinatario, asunto, texto) values ($1, 'prueba-1', 'prueba_por_vencer', 'correo-comercial@demo.test', 'Aviso', 'Prueba') on conflict do nothing", [consultorio]);
    await bd.query("insert into public.correos_comerciales (consultorio_id, clave_evento, tipo, destinatario, asunto, texto) values ($1, 'prueba-1', 'prueba_por_vencer', 'correo-comercial@demo.test', 'Aviso', 'Prueba') on conflict do nothing", [consultorio]);
    const { rows: pendientes } = await bd.transaction(async (tx) => {
      await tx.exec("set local role service_role");
      return tx.query<{ id: string; intentos: number }>("select id, intentos from public.reclamar_correos_comerciales(10)");
    });
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].intentos).toBe(1);
    const repetidos = await bd.transaction(async (tx) => { await tx.exec("set local role service_role"); return tx.query("select * from public.reclamar_correos_comerciales(10)"); });
    expect(repetidos.rows).toHaveLength(0);
    await expect(comoUsuario(bd, usuario, (tx) => tx.query("select * from public.reclamar_correos_comerciales(10)"))).rejects.toThrow();
  });
});
