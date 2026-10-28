import type { Database } from "@/tipos/base-datos";

type EsquemaPublico = Database["public"];

/** Fila de una tabla del esquema público. */
export type Fila<T extends keyof EsquemaPublico["Tables"]> = EsquemaPublico["Tables"][T]["Row"];

/** Valores posibles de un tipo enumerado de PostgreSQL. */
export type Enumerado<T extends keyof EsquemaPublico["Enums"]> = EsquemaPublico["Enums"][T];

export type TipoCuenta = Enumerado<"tipo_cuenta">;
export type EstadoConsultorio = Enumerado<"estado_consultorio">;
export type RolConsultorio = Enumerado<"rol_consultorio">;
export type EstadoPaciente = Enumerado<"estado_paciente">;
export type EstadoTurno = Enumerado<"estado_turno">;
export type TipoConsulta = Enumerado<"tipo_consulta">;
export type EstadoObjetivo = Enumerado<"estado_objetivo">;
export type CategoriaObjetivo = Enumerado<"categoria_objetivo">;

export type Paciente = Fila<"pacientes">;
export type InvitacionPaciente = Fila<"invitaciones_paciente">;
export type Turno = Fila<"turnos">;
export type Evolucion = Fila<"evoluciones">;
export type Objetivo = Fila<"objetivos">;
export type Medicion = Fila<"mediciones">;
export type PlanAlimentario = Fila<"planes_alimentarios">;
export type ComidaPlan = Fila<"planes_comidas">;
export type PublicacionPlan = Fila<"planes_publicaciones">;
export type ComidaPublicada = Fila<"planes_publicaciones_comidas">;
export type MomentoComida = Enumerado<"momento_comida">;
export type HorarioAtencion = Fila<"horarios_atencion">;
export type BloqueoAgenda = Fila<"bloqueos_agenda">;
