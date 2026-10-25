import { RUTAS } from "@/autorizacion/rutas";
import type { Paleta, Tema } from "@/configuracion/apariencia";
import type { EstadoConsultorio, RolConsultorio, TipoCuenta } from "@/tipos/entidades";

/** Información del usuario autenticado que necesita la aplicación. Se obtiene siempre del servidor. */
export type ContextoUsuario = {
  usuarioId: string;
  correo: string | null;
  nombre: string;
  apellido: string;
  avatarUrl: string | null;
  tipoCuenta: TipoCuenta | null;
  esSuperadmin: boolean;
  preferencias: { tema: Tema; paleta: Paleta };
  consultorio: {
    id: string;
    nombre: string;
    zonaHoraria: string;
    estado: EstadoConsultorio;
    rol: RolConsultorio;
  } | null;
};

export type ContextoProfesional = ContextoUsuario & {
  tipoCuenta: "profesional";
  consultorio: NonNullable<ContextoUsuario["consultorio"]>;
};

/** Ruta inicial de cada usuario según su rol y el estado de su alta. */
export function calcularDestino(contexto: ContextoUsuario | null): string {
  if (!contexto) return RUTAS.ingresar;
  if (contexto.esSuperadmin) return RUTAS.admin;
  if (contexto.tipoCuenta === "profesional" && contexto.consultorio) {
    return contexto.consultorio.estado === "activo" ? RUTAS.panel : RUTAS.cuentaInactiva;
  }
  if (contexto.tipoCuenta === "paciente") return RUTAS.portal;
  return RUTAS.bienvenida;
}

export function esProfesionalActivo(contexto: ContextoUsuario): contexto is ContextoProfesional {
  return (
    contexto.tipoCuenta === "profesional" &&
    contexto.consultorio !== null &&
    contexto.consultorio.estado === "activo"
  );
}

export function nombreVisible(contexto: Pick<ContextoUsuario, "nombre" | "apellido" | "correo">): string {
  const completo = `${contexto.nombre} ${contexto.apellido}`.trim();
  return completo || contexto.correo || "Usuario";
}

export function iniciales(contexto: Pick<ContextoUsuario, "nombre" | "apellido" | "correo">): string {
  const partes = [contexto.nombre, contexto.apellido].filter(Boolean);
  if (partes.length === 0) return (contexto.correo?.[0] ?? "U").toUpperCase();
  return partes.map((parte) => parte[0]).join("").slice(0, 2).toUpperCase();
}
