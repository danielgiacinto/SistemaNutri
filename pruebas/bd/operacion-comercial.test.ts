import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearBaseDePruebas, crearUsuario, comoUsuario, comoAnonimo } from "./base-de-pruebas";

let bd: PGlite;
let secuencia = 0;
beforeAll(async () => { bd = await crearBaseDePruebas(); }, 60_000);
afterAll(async () => { await bd?.close(); });
async function alta() {
  const numero = ++secuencia;
  const usuario = await crearUsuario(bd, `operacion-${numero}@demo.test`);
  const { rows } = await comoUsuario(bd, usuario, (tx) => tx.query<{ id: string }>("select public.crear_consultorio_inicial('Operación') as id"));
  const consultorio = rows[0].id;
  const mp = `operacion-${numero}`;
  await bd.query("insert into public.suscripciones (consultorio_id, mp_id, estado_mp, precio) values ($1, $2, 'authorized', 10000)", [consultorio, mp]);
  return { usuario, consultorio, mp };
}
async function pago(mp: string, id: string, estado: string, ciclo: string) {
  await bd.query("select public.registrar_pago_verificado($1, $2, $3, 10000, 'ARS', $4::timestamptz, $4::timestamptz)", [mp, id, estado, ciclo]);
}
async function cobertura(mp: string) {
  const { rows } = await bd.query<{ cobertura_hasta: string | null; estado_mp: string }>("select cobertura_hasta, estado_mp from public.suscripciones where mp_id = $1", [mp]);
  return rows[0];
}
describe("operación comercial verificable", () => {
  it("usa el ciclo real, aunque lleguen primero pagos posteriores, y no duplica meses", async () => {
    const { mp } = await alta();
    await pago(mp, "ciclo-marzo", "aprobado", "2026-03-01T12:00:00Z");
    await pago(mp, "ciclo-enero", "aprobado", "2026-01-01T12:00:00Z");
    await pago(mp, "ciclo-febrero", "aprobado", "2026-02-01T12:00:00Z");
    await pago(mp, "ciclo-marzo", "aprobado", "2026-03-01T12:00:00Z");
    await pago(mp, "ciclo-marzo-duplicado-distinto-id", "aprobado", "2026-03-01T12:00:00Z");
    expect(new Date((await cobertura(mp)).cobertura_hasta!).toISOString()).toBe("2026-04-01T12:00:00.000Z");
  });
  it("una devolución retira su período, y un evento aprobado viejo no lo restaura", async () => {
    const { mp } = await alta();
    await pago(mp, "pago-a", "aprobado", "2099-01-01T12:00:00Z");
    await pago(mp, "pago-b", "aprobado", "2099-02-01T12:00:00Z");
    await pago(mp, "pago-b", "devuelto", "2099-02-01T12:00:00Z");
    await pago(mp, "pago-b", "aprobado", "2099-02-01T12:00:00Z");
    expect(new Date((await cobertura(mp)).cobertura_hasta!).toISOString()).toBe("2099-02-01T12:00:00.000Z");
    await pago(mp, "pago-a", "devuelto", "2099-01-01T12:00:00Z");
    expect((await cobertura(mp)).cobertura_hasta).toBeNull();
  });
  it("un cobro antiguo de una suscripción cancelada no concede acceso actual", async () => {
    const { usuario, consultorio, mp } = await alta();
    await bd.query("update public.pruebas_profesionales set vence_en = '2020-01-01' where consultorio_id = $1", [consultorio]);
    await bd.query("update public.suscripciones set estado_mp = 'cancelled' where mp_id = $1", [mp]);
    await pago(mp, "antiguo", "aprobado", "2021-01-01T12:00:00Z");
    const { rows } = await comoUsuario(bd, usuario, (tx) => tx.query<{ estado: string }>("select public.estado_acceso_comercial($1) as estado", [consultorio]));
    expect(rows[0].estado).toBe("vencido");
    expect((await cobertura(mp)).estado_mp).toBe("cancelled");
  });
  it("solicita cancelar desde la identidad, audita el motivo y conserva el período pagado", async () => {
    const { usuario, consultorio, mp } = await alta();
    await pago(mp, "pagado-cancelar", "aprobado", "2099-01-01T12:00:00Z");
    const antes = await cobertura(mp);
    const solicitar = () => comoUsuario(bd, usuario, (tx) => tx.query("select public.solicitar_cancelacion_suscripcion('No quiero renovar')"));
    await solicitar(); await solicitar();
    expect(await cobertura(mp)).toEqual(antes);
    const { rows } = await bd.query<{ actor_id: string; motivo: string }>("select actor_id, detalles->>'motivo' as motivo from public.registros_auditoria where consultorio_id = $1 and accion = 'suscripcion.cancelacion_solicitada'", [consultorio]);
    expect(rows).toEqual([{ actor_id: usuario, motivo: "No quiero renovar" }]);
  });
  it("impide que un titular reemplace una autorización vigente desde la API", async () => {
    const { usuario, consultorio } = await alta();
    await bd.query("update public.configuracion_comercial set precio_mensual = 10000");
    await expect(comoUsuario(bd, usuario, (tx) => tx.query("update public.suscripciones set mp_id = 'reemplazo', estado_mp = 'pending' where consultorio_id = $1", [consultorio]))).rejects.toThrow("cancelacion_pendiente");
    await expect(comoUsuario(bd, usuario, (tx) => tx.query("update public.suscripciones set conciliada_en = now() where consultorio_id = $1", [consultorio]))).rejects.toThrow();
  });
  it("no permite reclamar trabajos ni cancelar suscripciones a visitantes o cuentas sin membresía", async () => {
    const ajeno = await crearUsuario(bd, "sin-membresia@demo.test");
    await expect(comoUsuario(bd, ajeno, (tx) => tx.query("select public.solicitar_cancelacion_suscripcion('Cancelar ajena')"))).rejects.toThrow("suscripcion_inexistente");
    await expect(comoUsuario(bd, ajeno, (tx) => tx.query("select * from public.reclamar_conciliaciones(5)"))).rejects.toThrow();
    await expect(comoAnonimo(bd, (tx) => tx.query("select public.solicitar_cancelacion_suscripcion('Cancelar ajena')"))).rejects.toThrow();
  });
  it("reserva los trabajos por un plazo y no vuelve a entregarlos inmediatamente", async () => {
    await bd.query("update public.suscripciones set conciliacion_intento_en = now()");
    const { mp } = await alta();
    const reclamar = () => bd.transaction(async (tx) => {
      await tx.exec("set local role service_role");
      return tx.query<{ mp_id: string }>("select * from public.reclamar_conciliaciones(5)");
    });
    expect((await reclamar()).rows.map((fila) => fila.mp_id)).toEqual([mp]);
    expect((await reclamar()).rows).toHaveLength(0);
    await bd.query("update public.suscripciones set conciliacion_intento_en = now() - interval '11 minutes' where mp_id = $1", [mp]);
    expect((await reclamar()).rows).toHaveLength(1);
  });
  it("suma meses en UTC sin depender de la zona de la conexión", async () => {
    const { rows } = await bd.transaction(async (tx) => {
      await tx.exec("set local timezone = 'America/New_York'");
      return tx.query<{ fin: string }>("select privado.sumar_periodo('2026-01-31T12:00:00Z', 1, 'meses') as fin");
    });
    expect(new Date(rows[0].fin).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });
  it("bloquea la API clínica al vencer, conserva lectura del paciente y recupera al pagar", async () => {
    const { usuario, consultorio, mp } = await alta();
    const persona = await crearUsuario(bd, "paciente-lectura@demo.test");
    await bd.query("update public.perfiles set tipo_cuenta = 'paciente' where id = $1", [persona]);
    const paciente = await bd.query<{ id: string }>("insert into public.pacientes (consultorio_id, nombre, apellido, usuario_id) values ($1, 'Prueba', 'Portal', $2) returning id", [consultorio, persona]);
    await comoUsuario(bd, usuario, (tx) => tx.query("insert into public.mediciones (consultorio_id, paciente_id, registrado_en, peso_kg, visible_para_paciente) values ($1, $2, now(), 70, true), ($1, $2, now(), 71, false)", [consultorio, paciente.rows[0].id]));
    await bd.query("update public.pruebas_profesionales set vence_en = now() - interval '1 day' where consultorio_id = $1", [consultorio]);
    expect((await comoUsuario(bd, usuario, (tx) => tx.query("select id from public.pacientes"))).rows).toHaveLength(0);
    await expect(comoUsuario(bd, usuario, (tx) => tx.query("insert into public.pacientes (consultorio_id, nombre, apellido) values ($1, 'Sin', 'Acceso')", [consultorio]))).rejects.toThrow();
    expect((await comoUsuario(bd, usuario, (tx) => tx.query("select mp_id from public.suscripciones"))).rows).toHaveLength(1);
    expect((await comoUsuario(bd, persona, (tx) => tx.query("select id from public.mediciones"))).rows).toHaveLength(1);
    await bd.query("update public.consultorios set estado = 'suspendido' where id = $1", [consultorio]);
    expect((await comoUsuario(bd, persona, (tx) => tx.query("select id from public.mediciones"))).rows).toHaveLength(1);
    await bd.query("update public.consultorios set estado = 'activo' where id = $1", [consultorio]);
    await bd.query("select public.registrar_pago_verificado($1, 'recuperacion', 'aprobado', 10000, 'ARS', now(), now())", [mp]);
    expect((await comoUsuario(bd, usuario, (tx) => tx.query("select id from public.pacientes"))).rows).toHaveLength(1);
    expect((await bd.query("select id from public.mediciones where paciente_id = $1", [paciente.rows[0].id])).rows).toHaveLength(2);
  });
  it("solo el superadministrador suspende o reactiva y deja actor y motivo auditados", async () => {
    const { usuario, consultorio } = await alta();
    const admin = await crearUsuario(bd, "admin-operacion@demo.test");
    await bd.query("insert into public.administradores_plataforma (usuario_id, nota) values ($1, 'Prueba automatizada')", [admin]);
    await expect(comoUsuario(bd, usuario, (tx) => tx.query("select public.cambiar_estado_comercial_consultorio($1, true, 'Suspender cuenta')", [consultorio]))).rejects.toThrow("sin_permiso");
    await comoUsuario(bd, admin, (tx) => tx.query("select public.cambiar_estado_comercial_consultorio($1, true, 'Suspensión de prueba')", [consultorio]));
    expect((await comoUsuario(bd, usuario, (tx) => tx.query<{ estado: string }>("select public.estado_acceso_comercial($1) as estado", [consultorio]))).rows[0].estado).toBe("suspendido_admin");
    await comoUsuario(bd, usuario, (tx) => tx.query("select public.solicitar_cancelacion_suscripcion('No quiero renovar')"));
    await comoUsuario(bd, admin, (tx) => tx.query("select public.cambiar_estado_comercial_consultorio($1, false, 'Retirar suspensión de prueba')", [consultorio]));
    const { rows } = await bd.query<{ actor_id: string; accion: string; motivo: string }>("select actor_id, accion, detalles->>'motivo' as motivo from public.registros_auditoria where consultorio_id = $1 and accion in ('consultorio.suspendido', 'consultorio.reactivado') order by id", [consultorio]);
    expect(rows).toEqual([{ actor_id: admin, accion: "consultorio.suspendido", motivo: "Suspensión de prueba" }, { actor_id: admin, accion: "consultorio.reactivado", motivo: "Retirar suspensión de prueba" }]);
    const resumen = () => comoUsuario(bd, admin, (tx) => tx.query<{ ingreso_mes: string }>("select * from public.resumen_comercial()"));
    const antes = Number((await resumen()).rows[0].ingreso_mes);
    const { mp } = await alta();
    await bd.query("select public.registrar_pago_verificado($1, 'validacion-medio', 'aprobado', 1, 'ARS', now())", [mp]);
    expect(Number((await resumen()).rows[0].ingreso_mes)).toBe(antes);
    await bd.query("select public.registrar_pago_verificado($1, 'mensualidad-metrica', 'aprobado', 10000, 'ARS', now())", [mp]);
    expect(Number((await resumen()).rows[0].ingreso_mes)).toBe(antes + 10000);
    await expect(comoUsuario(bd, usuario, (tx) => tx.query("select * from public.resumen_comercial()"))).rejects.toThrow("sin_permiso");
  });
});
