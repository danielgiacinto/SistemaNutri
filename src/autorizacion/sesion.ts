import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import {
  calcularDestino,
  esProfesionalActivo,
  type ContextoProfesional,
  type ContextoUsuario,
} from "@/autorizacion/contexto";
import { RUTAS } from "@/autorizacion/rutas";
import { esPaletaValida, PALETA_PREDETERMINADA } from "@/configuracion/apariencia";
import { ZONA_HORARIA_PREDETERMINADA } from "@/configuracion/producto";

/**
 * Capa de acceso a la sesión (Data Access Layer). Toda verificación de
 * identidad y rol pasa por acá; los componentes y las acciones nunca confían
 * en datos de rol enviados por el cliente.
 *
 * `cache` evita repetir la consulta dentro de un mismo renderizado.
 */
export const obtenerContextoUsuario = cache(async (): Promise<ContextoUsuario | null> => {
  // getClaims compara el vencimiento del JWT con Date.now(). En Cache Components
  // eso no puede entrar al prerender: hay que esperar el request.
  await connection();
  const supabase = await crearClienteServidor();

  // getClaims valida la firma del JWT; getSession no debe usarse para autorizar.
  const { data: datosSesion, error: errorSesion } = await supabase.auth.getClaims();
  if (errorSesion || !datosSesion?.claims?.sub) return null;

  const { data, error } = await supabase.rpc("obtener_mi_contexto").maybeSingle();
  if (error) {
    registrarError("obtener_mi_contexto", error);
    throw new Error("No se pudo cargar la información de la cuenta.");
  }
  if (!data) return null;

  return {
    usuarioId: data.usuario_id,
    correo: typeof datosSesion.claims.email === "string" ? datosSesion.claims.email : null,
    nombre: data.nombre,
    apellido: data.apellido,
    avatarUrl: data.avatar_url,
    tipoCuenta: data.tipo_cuenta,
    esSuperadmin: data.es_superadmin,
    preferencias: {
      tema: data.tema,
      paleta: esPaletaValida(data.paleta) ? data.paleta : PALETA_PREDETERMINADA,
    },
    consultorio:
      data.consultorio_id && data.consultorio_nombre && data.consultorio_estado && data.rol_consultorio
        ? {
            id: data.consultorio_id,
            nombre: data.consultorio_nombre,
            zonaHoraria: data.consultorio_zona_horaria ?? ZONA_HORARIA_PREDETERMINADA,
            estado: data.consultorio_estado,
            rol: data.rol_consultorio,
          }
        : null,
  };
});

/** Exige una sesión válida; si no existe, redirige al ingreso. */
export async function requerirUsuario(): Promise<ContextoUsuario> {
  const contexto = await obtenerContextoUsuario();
  if (!contexto) redirect(RUTAS.ingresar);
  return contexto;
}

/** Exige un profesional con consultorio activo. */
export async function requerirProfesional(): Promise<ContextoProfesional> {
  const contexto = await requerirUsuario();
  if (!esProfesionalActivo(contexto)) redirect(calcularDestino(contexto));
  return contexto;
}

/** Exige un profesional titular de su consultorio (configuración y datos comerciales). */
export async function requerirTitular(): Promise<ContextoProfesional> {
  const contexto = await requerirProfesional();
  if (contexto.consultorio.rol !== "titular") redirect(RUTAS.panel);
  return contexto;
}

/** Exige una cuenta de paciente vinculada. */
export async function requerirPaciente(): Promise<ContextoUsuario & { tipoCuenta: "paciente" }> {
  const contexto = await requerirUsuario();
  if (contexto.tipoCuenta !== "paciente") redirect(calcularDestino(contexto));
  return contexto as ContextoUsuario & { tipoCuenta: "paciente" };
}

/** Exige el rol de superadministrador de la plataforma. */
export async function requerirSuperadmin(): Promise<ContextoUsuario> {
  const contexto = await requerirUsuario();
  if (!contexto.esSuperadmin) redirect(calcularDestino(contexto));
  return contexto;
}
