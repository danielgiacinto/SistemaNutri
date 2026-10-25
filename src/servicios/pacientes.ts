import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import { patronIlike } from "@/lib/busqueda";
import { PACIENTES_POR_PAGINA } from "@/configuracion/clinica";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { Paciente } from "@/tipos/entidades";
import type { DatosAltaPacienteValidados, DatosEdicionPacienteValidados, FiltroPacientes } from "@/esquemas/paciente";

const MENSAJES: Record<string, string> = {
  duplicado: "Ya existe un paciente con ese documento en este consultorio.",
  "23505": "Ya existe un paciente con ese documento en este consultorio.",
  sin_permiso: "No tenés permiso para modificar este paciente.",
};

export type PacienteListado = Paciente & {
  proximoTurnoInicio: string | null;
  ultimaConsultaInicio: string | null;
};

export async function listarPacientes(
  cliente: ClienteSupabase,
  consultorioId: string,
  filtro: FiltroPacientes,
): Promise<{ filas: PacienteListado[]; total: number }> {
  const desde = (filtro.pagina - 1) * PACIENTES_POR_PAGINA;
  const hasta = desde + PACIENTES_POR_PAGINA - 1;

  let consulta = cliente.from("pacientes").select("*", { count: "exact" }).eq("consultorio_id", consultorioId);

  if (filtro.estado !== "todos") consulta = consulta.eq("estado", filtro.estado);

  const patron = patronIlike(filtro.q);
  if (patron) {
    consulta = consulta.or(`nombre.ilike.${patron},apellido.ilike.${patron},documento.ilike.${patron},correo.ilike.${patron}`);
  }

  consulta =
    filtro.orden === "reciente"
      ? consulta.order("creado_en", { ascending: false })
      : consulta.order("apellido").order("nombre");

  const { data, error, count } = await consulta.range(desde, hasta);
  if (error) {
    registrarError("listar_pacientes", error);
    throw new Error("No se pudo cargar el listado de pacientes.");
  }

  const filas = data ?? [];
  const ids = filas.map((fila) => fila.id);
  const [proximos, ultimas] = await Promise.all([
    enriquecerTurnos(cliente, consultorioId, ids, "proximo"),
    enriquecerTurnos(cliente, consultorioId, ids, "ultimo"),
  ]);

  return {
    total: count ?? 0,
    filas: filas.map((fila) => ({
      ...fila,
      proximoTurnoInicio: proximos.get(fila.id) ?? null,
      ultimaConsultaInicio: ultimas.get(fila.id) ?? null,
    })),
  };
}

async function enriquecerTurnos(
  cliente: ClienteSupabase,
  consultorioId: string,
  ids: string[],
  tipo: "proximo" | "ultimo",
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (ids.length === 0) return mapa;

  const ahora = new Date().toISOString();
  let consulta = cliente
    .from("turnos")
    .select("paciente_id, inicio")
    .eq("consultorio_id", consultorioId)
    .in("paciente_id", ids);

  consulta =
    tipo === "proximo"
      ? consulta
          .in("estado", ["programado", "confirmado"])
          .gte("inicio", ahora)
          .order("inicio", { ascending: true })
      : consulta.eq("estado", "completado").order("inicio", { ascending: false });

  const { data, error } = await consulta.limit(ids.length * 4);
  if (error) {
    registrarError(`enriquecer_turnos_${tipo}`, error);
    return mapa;
  }
  for (const fila of data ?? []) {
    if (!mapa.has(fila.paciente_id)) mapa.set(fila.paciente_id, fila.inicio);
  }
  return mapa;
}

export async function obtenerPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Paciente | null> {
  const { data, error } = await cliente
    .from("pacientes")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("id", pacienteId)
    .maybeSingle();

  if (error) {
    registrarError("obtener_paciente", error);
    throw new Error("No se pudo cargar el paciente.");
  }
  return data;
}

export async function listarPacientesActivos(
  cliente: ClienteSupabase,
  consultorioId: string,
): Promise<Pick<Paciente, "id" | "nombre" | "apellido">[]> {
  const { data, error } = await cliente
    .from("pacientes")
    .select("id, nombre, apellido")
    .eq("consultorio_id", consultorioId)
    .eq("estado", "activo")
    .order("apellido")
    .order("nombre")
    .limit(500);

  if (error) {
    registrarError("listar_pacientes_activos", error);
    throw new Error("No se pudo cargar el listado de pacientes.");
  }
  return data;
}

function camposPaciente(datos: DatosAltaPacienteValidados) {
  return {
    nombre: datos.nombre,
    apellido: datos.apellido,
    correo: datos.correo,
    telefono: datos.telefono,
    documento: datos.documento,
    fecha_nacimiento: datos.fechaNacimiento,
    notas_administrativas: datos.notasAdministrativas,
  };
}

export async function crearPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosAltaPacienteValidados,
): Promise<ResultadoAccion<{ pacienteId: string }>> {
  const { data, error } = await cliente
    .from("pacientes")
    .insert({ consultorio_id: consultorioId, ...camposPaciente(datos) })
    .select("id")
    .maybeSingle();

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (mensaje) return { ok: false, mensaje };
    registrarError("crear_paciente", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data) return { ok: false, mensaje: MENSAJES.sin_permiso };
  return { ok: true, datos: { pacienteId: data.id }, mensaje: "Paciente registrado." };
}

export async function actualizarPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
  datos: DatosEdicionPacienteValidados,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("pacientes")
    .update({
      ...camposPaciente(datos),
      estado: datos.estado,
    })
    .eq("id", pacienteId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (mensaje) return { ok: false, mensaje };
    registrarError("actualizar_paciente", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJES.sin_permiso };
  return { ok: true, mensaje: "Datos del paciente actualizados." };
}

export async function cambiarEstadoPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
  estado: "activo" | "inactivo",
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("pacientes")
    .update({ estado })
    .eq("id", pacienteId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    registrarError("cambiar_estado_paciente", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJES.sin_permiso };
  return {
    ok: true,
    mensaje: estado === "inactivo" ? "Paciente desactivado." : "Paciente reactivado.",
  };
}

export async function contarPacientes(
  cliente: ClienteSupabase,
  consultorioId: string,
): Promise<{ total: number; activos: number }> {
  const [total, activos] = await Promise.all([
    cliente.from("pacientes").select("id", { count: "exact", head: true }).eq("consultorio_id", consultorioId),
    cliente
      .from("pacientes")
      .select("id", { count: "exact", head: true })
      .eq("consultorio_id", consultorioId)
      .eq("estado", "activo"),
  ]);
  const error = total.error ?? activos.error;
  if (error) {
    registrarError("contar_pacientes", error);
    throw new Error("No se pudieron calcular las métricas de pacientes.");
  }
  return { total: total.count ?? 0, activos: activos.count ?? 0 };
}
