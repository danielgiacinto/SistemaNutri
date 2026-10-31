export type EstadoListadoPacientes = "activo" | "inactivo" | "todos";
export type OrdenListadoPacientes = "apellido" | "reciente";

export type ConsultaListadoPacientes = {
  q: string;
  estado: EstadoListadoPacientes;
  orden: OrdenListadoPacientes;
  pagina?: number;
};

/** Arma la URL del listado. Omite los valores por defecto para que la barra quede limpia. */
export function hrefListadoPacientes(filtro: ConsultaListadoPacientes): string {
  const parametros = new URLSearchParams();
  if (filtro.q) parametros.set("q", filtro.q);
  if (filtro.estado !== "activo") parametros.set("estado", filtro.estado);
  if (filtro.orden !== "apellido") parametros.set("orden", filtro.orden);
  if (filtro.pagina && filtro.pagina > 1) parametros.set("pagina", String(filtro.pagina));
  const consulta = parametros.toString();
  return consulta ? `/panel/pacientes?${consulta}` : "/panel/pacientes";
}
