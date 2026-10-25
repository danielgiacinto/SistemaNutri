import { iniciales, nombreVisible, type ContextoUsuario } from "@/autorizacion/contexto";
import { RUTAS } from "@/autorizacion/rutas";
import type { DatosUsuarioMenu, EnlaceMenuUsuario } from "@/componentes/disposicion/menu-usuario";

type Area = "panel" | "admin" | "portal";

export function datosMenuUsuario(contexto: ContextoUsuario, rotulo: string): DatosUsuarioMenu {
  return {
    nombre: nombreVisible(contexto),
    correo: contexto.correo,
    iniciales: iniciales(contexto),
    avatarUrl: contexto.avatarUrl,
    rotulo,
  };
}

/** Enlaces del menú de usuario según el área actual y los roles verificados en el servidor. */
export function enlacesMenuUsuario(contexto: ContextoUsuario, areaActual: Area): EnlaceMenuUsuario[] {
  const enlaces: EnlaceMenuUsuario[] = [];
  if (areaActual === "panel") enlaces.push({ href: `${RUTAS.panel}/configuracion`, etiqueta: "Configuración" });
  if (areaActual !== "admin" && contexto.esSuperadmin) {
    enlaces.push({ href: RUTAS.admin, etiqueta: "Administración de la plataforma" });
  }
  if (areaActual !== "panel" && contexto.tipoCuenta === "profesional" && contexto.consultorio?.estado === "activo") {
    enlaces.push({ href: RUTAS.panel, etiqueta: "Ir a mi consultorio" });
  }
  return enlaces;
}
