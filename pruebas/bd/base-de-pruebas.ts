import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const DIRECTORIO_MIGRACIONES = join(process.cwd(), "supabase", "migrations");
const SCRIPT_SUPABASE_SIMULADO = join(process.cwd(), "pruebas", "bd", "supabase-simulado.sql");

/**
 * Crea una base PostgreSQL en memoria con la simulación de Supabase y todas
 * las migraciones del repositorio aplicadas en orden.
 */
export async function crearBaseDePruebas(): Promise<PGlite> {
  const bd = await PGlite.create();
  await bd.exec(readFileSync(SCRIPT_SUPABASE_SIMULADO, "utf8"));

  const migraciones = readdirSync(DIRECTORIO_MIGRACIONES)
    .filter((archivo) => archivo.endsWith(".sql"))
    .sort();

  for (const migracion of migraciones) {
    await bd.exec(readFileSync(join(DIRECTORIO_MIGRACIONES, migracion), "utf8"));
  }

  return bd;
}

/** Inserta un usuario en auth.users (como lo haría Supabase Auth) y devuelve su id. */
export async function crearUsuario(
  bd: PGlite,
  correo: string,
  metadatos: Record<string, unknown> = {},
): Promise<string> {
  const resultado = await bd.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [correo, JSON.stringify(metadatos)],
  );
  return resultado.rows[0].id;
}

/**
 * Ejecuta `operacion` dentro de una transacción con el rol `authenticated` y el
 * JWT del usuario indicado, igual que PostgREST. La transacción se confirma
 * salvo que la operación lance un error.
 */
export async function comoUsuario<T>(
  bd: PGlite,
  usuarioId: string,
  operacion: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return bd.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: usuarioId, role: "authenticated" }),
    ]);
    await tx.exec("set local role authenticated");
    return operacion(tx);
  });
}

/** Ejecuta `operacion` como visitante anónimo (rol `anon`, sin JWT de usuario). */
export async function comoAnonimo<T>(
  bd: PGlite,
  operacion: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return bd.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return operacion(tx);
  });
}
