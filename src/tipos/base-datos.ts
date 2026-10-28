// Tipos de la base de datos con el formato de `supabase gen types typescript`.
// Regenerar con `npm run bd:tipos` (requiere Supabase local) después de cada migración.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      administradores_plataforma: {
        Row: {
          creado_en: string
          nota: string | null
          usuario_id: string
        }
        Insert: {
          creado_en?: string
          nota?: string | null
          usuario_id: string
        }
        Update: {
          creado_en?: string
          nota?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      consultorios: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          direccion: string | null
          duracion_turno_minutos: number
          estado: Database["public"]["Enums"]["estado_consultorio"]
          id: string
          nombre: string
          telefono: string | null
          zona_horaria: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          duracion_turno_minutos?: number
          estado?: Database["public"]["Enums"]["estado_consultorio"]
          id?: string
          nombre: string
          telefono?: string | null
          zona_horaria?: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          duracion_turno_minutos?: number
          estado?: Database["public"]["Enums"]["estado_consultorio"]
          id?: string
          nombre?: string
          telefono?: string | null
          zona_horaria?: string
        }
        Relationships: []
      }
      miembros_consultorio: {
        Row: {
          consultorio_id: string
          creado_en: string
          rol: Database["public"]["Enums"]["rol_consultorio"]
          usuario_id: string
        }
        Insert: {
          consultorio_id: string
          creado_en?: string
          rol?: Database["public"]["Enums"]["rol_consultorio"]
          usuario_id: string
        }
        Update: {
          consultorio_id?: string
          creado_en?: string
          rol?: Database["public"]["Enums"]["rol_consultorio"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_consultorio_consultorio_id_fkey"
            columns: ["consultorio_id"]
            isOneToOne: false
            referencedRelation: "consultorios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          actualizado_en: string
          apellido: string
          avatar_url: string | null
          creado_en: string
          id: string
          nombre: string
          paleta: string
          tema: Database["public"]["Enums"]["preferencia_tema"]
          tipo_cuenta: Database["public"]["Enums"]["tipo_cuenta"] | null
        }
        Insert: {
          actualizado_en?: string
          apellido?: string
          avatar_url?: string | null
          creado_en?: string
          id: string
          nombre?: string
          paleta?: string
          tema?: Database["public"]["Enums"]["preferencia_tema"]
          tipo_cuenta?: Database["public"]["Enums"]["tipo_cuenta"] | null
        }
        Update: {
          actualizado_en?: string
          apellido?: string
          avatar_url?: string | null
          creado_en?: string
          id?: string
          nombre?: string
          paleta?: string
          tema?: Database["public"]["Enums"]["preferencia_tema"]
          tipo_cuenta?: Database["public"]["Enums"]["tipo_cuenta"] | null
        }
        Relationships: []
      }
      registros_auditoria: {
        Row: {
          accion: string
          actor_id: string | null
          consultorio_id: string | null
          creado_en: string
          detalles: Json
          entidad: string
          entidad_id: string | null
          id: number
        }
        Insert: {
          accion: string
          actor_id?: string | null
          consultorio_id?: string | null
          creado_en?: string
          detalles?: Json
          entidad: string
          entidad_id?: string | null
          id?: never
        }
        Update: {
          accion?: string
          actor_id?: string | null
          consultorio_id?: string | null
          creado_en?: string
          detalles?: Json
          entidad?: string
          entidad_id?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "registros_auditoria_consultorio_id_fkey"
            columns: ["consultorio_id"]
            isOneToOne: false
            referencedRelation: "consultorios"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          actualizado_en: string
          apellido: string
          consultorio_id: string
          correo: string | null
          creado_en: string
          creado_por: string | null
          documento: string | null
          estado: Database["public"]["Enums"]["estado_paciente"]
          fecha_nacimiento: string | null
          id: string
          nombre: string
          notas_administrativas: string | null
          telefono: string | null
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          apellido: string
          consultorio_id: string
          correo?: string | null
          creado_en?: string
          creado_por?: string | null
          documento?: string | null
          estado?: Database["public"]["Enums"]["estado_paciente"]
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          notas_administrativas?: string | null
          telefono?: string | null
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          apellido?: string
          consultorio_id?: string
          correo?: string | null
          creado_en?: string
          creado_por?: string | null
          documento?: string | null
          estado?: Database["public"]["Enums"]["estado_paciente"]
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          notas_administrativas?: string | null
          telefono?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_consultorio_id_fkey"
            columns: ["consultorio_id"]
            isOneToOne: false
            referencedRelation: "consultorios"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_atencion: {
        Row: {
          consultorio_id: string
          creado_en: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: string
        }
        Insert: {
          consultorio_id: string
          creado_en?: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: string
        }
        Update: {
          consultorio_id?: string
          creado_en?: string
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_atencion_consultorio_id_fkey"
            columns: ["consultorio_id"]
            isOneToOne: false
            referencedRelation: "consultorios"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueos_agenda: {
        Row: {
          consultorio_id: string
          creado_en: string
          creado_por: string | null
          fin: string
          id: string
          inicio: string
          motivo: string | null
        }
        Insert: {
          consultorio_id: string
          creado_en?: string
          creado_por?: string | null
          fin: string
          id?: string
          inicio: string
          motivo?: string | null
        }
        Update: {
          consultorio_id?: string
          creado_en?: string
          creado_por?: string | null
          fin?: string
          id?: string
          inicio?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bloqueos_agenda_consultorio_id_fkey"
            columns: ["consultorio_id"]
            isOneToOne: false
            referencedRelation: "consultorios"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          actualizado_en: string
          cancelado_en: string | null
          consultorio_id: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fin: string
          id: string
          inicio: string
          motivo: string | null
          motivo_cancelacion: string | null
          notas_administrativas: string | null
          paciente_id: string
          profesional_id: string
          recordatorio_enviado_en: string | null
          tipo: Database["public"]["Enums"]["tipo_consulta"]
        }
        Insert: {
          actualizado_en?: string
          cancelado_en?: string | null
          consultorio_id: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_turno"]
          fin: string
          id?: string
          inicio: string
          motivo?: string | null
          motivo_cancelacion?: string | null
          notas_administrativas?: string | null
          paciente_id: string
          profesional_id?: string
          recordatorio_enviado_en?: string | null
          tipo?: Database["public"]["Enums"]["tipo_consulta"]
        }
        Update: {
          actualizado_en?: string
          cancelado_en?: string | null
          consultorio_id?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_turno"]
          fin?: string
          id?: string
          inicio?: string
          motivo?: string | null
          motivo_cancelacion?: string | null
          notas_administrativas?: string | null
          paciente_id?: string
          profesional_id?: string
          recordatorio_enviado_en?: string | null
          tipo?: Database["public"]["Enums"]["tipo_consulta"]
        }
        Relationships: [
          {
            foreignKeyName: "turnos_paciente_consultorio_fk"
            columns: ["paciente_id", "consultorio_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id", "consultorio_id"]
          },
        ]
      }
      evoluciones: {
        Row: {
          actualizado_en: string
          consultorio_id: string
          contenido: string
          creado_en: string
          es_borrador: boolean
          id: string
          indicaciones: string | null
          observaciones: string | null
          paciente_id: string
          profesional_id: string
          titulo: string | null
          turno_id: string | null
          visible_para_paciente: boolean
        }
        Insert: {
          actualizado_en?: string
          consultorio_id: string
          contenido: string
          creado_en?: string
          es_borrador?: boolean
          id?: string
          indicaciones?: string | null
          observaciones?: string | null
          paciente_id: string
          profesional_id?: string
          titulo?: string | null
          turno_id?: string | null
          visible_para_paciente?: boolean
        }
        Update: {
          actualizado_en?: string
          consultorio_id?: string
          contenido?: string
          creado_en?: string
          es_borrador?: boolean
          id?: string
          indicaciones?: string | null
          observaciones?: string | null
          paciente_id?: string
          profesional_id?: string
          titulo?: string | null
          turno_id?: string | null
          visible_para_paciente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evoluciones_paciente_consultorio_fk"
            columns: ["paciente_id", "consultorio_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id", "consultorio_id"]
          },
        ]
      }
      evoluciones_versiones: {
        Row: {
          consultorio_id: string
          contenido: string
          creado_en: string
          es_borrador: boolean
          evolucion_id: string
          id: number
          indicaciones: string | null
          observaciones: string | null
          profesional_id: string | null
          titulo: string | null
          visible_para_paciente: boolean
        }
        Insert: {
          consultorio_id: string
          contenido: string
          creado_en?: string
          es_borrador: boolean
          evolucion_id: string
          id?: never
          indicaciones?: string | null
          observaciones?: string | null
          profesional_id?: string | null
          titulo?: string | null
          visible_para_paciente: boolean
        }
        Update: {
          consultorio_id?: string
          contenido?: string
          creado_en?: string
          es_borrador?: boolean
          evolucion_id?: string
          id?: never
          indicaciones?: string | null
          observaciones?: string | null
          profesional_id?: string | null
          titulo?: string | null
          visible_para_paciente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evoluciones_versiones_evolucion_id_fkey"
            columns: ["evolucion_id"]
            isOneToOne: false
            referencedRelation: "evoluciones"
            referencedColumns: ["id"]
          },
        ]
      }
      objetivos: {
        Row: {
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_objetivo"]
          completado_en: string | null
          consultorio_id: string
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_objetivo"]
          fecha_objetivo: string | null
          id: string
          observaciones: string | null
          paciente_id: string
          profesional_id: string
          progreso: number | null
          titulo: string
          unidad: string | null
          valor_inicial: number | null
          valor_objetivo: number | null
          visible_para_paciente: boolean
        }
        Insert: {
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria_objetivo"]
          completado_en?: string | null
          consultorio_id: string
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_objetivo"]
          fecha_objetivo?: string | null
          id?: string
          observaciones?: string | null
          paciente_id: string
          profesional_id?: string
          progreso?: number | null
          titulo: string
          unidad?: string | null
          valor_inicial?: number | null
          valor_objetivo?: number | null
          visible_para_paciente?: boolean
        }
        Update: {
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria_objetivo"]
          completado_en?: string | null
          consultorio_id?: string
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_objetivo"]
          fecha_objetivo?: string | null
          id?: string
          observaciones?: string | null
          paciente_id?: string
          profesional_id?: string
          progreso?: number | null
          titulo?: string
          unidad?: string | null
          valor_inicial?: number | null
          valor_objetivo?: number | null
          visible_para_paciente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "objetivos_paciente_consultorio_fk"
            columns: ["paciente_id", "consultorio_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id", "consultorio_id"]
          },
        ]
      }
      invitaciones_paciente: {
        Row: {
          aceptada_en: string | null
          consultorio_id: string
          consultorio_nombre: string
          correo: string
          creada_por: string | null
          creado_en: string
          expira_en: string
          id: string
          paciente_id: string
          revocada_en: string | null
        }
        Insert: {
          aceptada_en?: string | null
          consultorio_id: string
          consultorio_nombre: string
          correo: string
          creada_por?: string | null
          creado_en?: string
          expira_en: string
          id?: string
          paciente_id: string
          revocada_en?: string | null
          token_hash: string
        }
        Update: {
          aceptada_en?: string | null
          consultorio_id?: string
          consultorio_nombre?: string
          correo?: string
          creada_por?: string | null
          creado_en?: string
          expira_en?: string
          id?: string
          paciente_id?: string
          revocada_en?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      mediciones: {
        Row: {
          actualizado_en: string
          circunferencia_cadera_cm: number | null
          circunferencia_cintura_cm: number | null
          consultorio_id: string
          creado_en: string
          id: string
          masa_muscular_kg: number | null
          observaciones: string | null
          paciente_id: string
          peso_kg: number | null
          porcentaje_grasa: number | null
          profesional_id: string
          registrado_en: string
          talla_cm: number | null
          visible_para_paciente: boolean
        }
        Insert: {
          actualizado_en?: string
          circunferencia_cadera_cm?: number | null
          circunferencia_cintura_cm?: number | null
          consultorio_id: string
          creado_en?: string
          id?: string
          masa_muscular_kg?: number | null
          observaciones?: string | null
          paciente_id: string
          peso_kg?: number | null
          porcentaje_grasa?: number | null
          profesional_id?: string
          registrado_en: string
          talla_cm?: number | null
          visible_para_paciente?: boolean
        }
        Update: {
          actualizado_en?: string
          circunferencia_cadera_cm?: number | null
          circunferencia_cintura_cm?: number | null
          consultorio_id?: string
          creado_en?: string
          id?: string
          masa_muscular_kg?: number | null
          observaciones?: string | null
          paciente_id?: string
          peso_kg?: number | null
          porcentaje_grasa?: number | null
          profesional_id?: string
          registrado_en?: string
          talla_cm?: number | null
          visible_para_paciente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mediciones_paciente_consultorio_fk"
            columns: ["paciente_id", "consultorio_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id", "consultorio_id"]
          },
        ]
      }
      planes_alimentarios: {
        Row: {
          actualizado_en: string
          cambios_sin_publicar: boolean
          consultorio_id: string
          creado_en: string
          id: string
          indicaciones: string | null
          paciente_id: string
          profesional_id: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string
          cambios_sin_publicar?: boolean
          consultorio_id: string
          creado_en?: string
          id?: string
          indicaciones?: string | null
          paciente_id: string
          profesional_id?: string
          titulo: string
        }
        Update: {
          actualizado_en?: string
          cambios_sin_publicar?: boolean
          consultorio_id?: string
          creado_en?: string
          id?: string
          indicaciones?: string | null
          paciente_id?: string
          profesional_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "planes_alimentarios_paciente_id_consultorio_id_fkey"
            columns: ["paciente_id", "consultorio_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id", "consultorio_id"]
          },
        ]
      }
      planes_comidas: {
        Row: {
          consultorio_id: string
          detalle: string
          id: string
          momento: Database["public"]["Enums"]["momento_comida"]
          orden: number
          plan_id: string
        }
        Insert: {
          consultorio_id: string
          detalle: string
          id?: string
          momento: Database["public"]["Enums"]["momento_comida"]
          orden: number
          plan_id: string
        }
        Update: {
          consultorio_id?: string
          detalle?: string
          id?: string
          momento?: Database["public"]["Enums"]["momento_comida"]
          orden?: number
          plan_id?: string
        }
        Relationships: []
      }
      planes_publicaciones: {
        Row: {
          consultorio_id: string
          id: string
          indicaciones: string | null
          numero: number
          paciente_id: string
          plan_id: string
          publicada_en: string
          titulo: string
        }
        Insert: {
          consultorio_id: string
          id?: string
          indicaciones?: string | null
          numero: number
          paciente_id: string
          plan_id: string
          publicada_en?: string
          titulo: string
        }
        Update: {
          consultorio_id?: string
          id?: string
          indicaciones?: string | null
          numero?: number
          paciente_id?: string
          plan_id?: string
          publicada_en?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "planes_publicaciones_plan_id_consultorio_id_fkey"
            columns: ["plan_id", "consultorio_id"]
            isOneToOne: false
            referencedRelation: "planes_alimentarios"
            referencedColumns: ["id", "consultorio_id"]
          },
        ]
      }
      planes_publicaciones_comidas: {
        Row: {
          consultorio_id: string
          detalle: string
          id: string
          momento: Database["public"]["Enums"]["momento_comida"]
          orden: number
          publicacion_id: string
        }
        Insert: {
          consultorio_id: string
          detalle: string
          id?: string
          momento: Database["public"]["Enums"]["momento_comida"]
          orden: number
          publicacion_id: string
        }
        Update: {
          consultorio_id?: string
          detalle?: string
          id?: string
          momento?: Database["public"]["Enums"]["momento_comida"]
          orden?: number
          publicacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planes_publicaciones_comidas_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "planes_publicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_comercial: {
        Row: {
          actualizado_en: string
          dias_gracia: number
          id: boolean
          moneda: string
          precio_mensual: number | null
          prueba_cantidad: number
          prueba_unidad: string
          pruebas_habilitadas: boolean
        }
        Insert: {
          actualizado_en?: string
          dias_gracia?: number
          id?: boolean
          moneda?: string
          precio_mensual?: number | null
          prueba_cantidad?: number
          prueba_unidad?: string
          pruebas_habilitadas?: boolean
        }
        Update: {
          actualizado_en?: string
          dias_gracia?: number
          id?: boolean
          moneda?: string
          precio_mensual?: number | null
          prueba_cantidad?: number
          prueba_unidad?: string
          pruebas_habilitadas?: boolean
        }
        Relationships: []
      }
      pruebas_profesionales: {
        Row: {
          cantidad: number
          consultorio_id: string | null
          correo: string
          creado_en: string
          id: string
          inicio: string
          unidad: string
          usuario_id: string | null
          vence_en: string
        }
        Insert: {
          cantidad: number
          consultorio_id?: string | null
          correo: string
          creado_en?: string
          id?: string
          inicio: string
          unidad: string
          usuario_id?: string | null
          vence_en: string
        }
        Update: {
          cantidad?: number
          consultorio_id?: string | null
          correo?: string
          creado_en?: string
          id?: string
          inicio?: string
          unidad?: string
          usuario_id?: string | null
          vence_en?: string
        }
        Relationships: []
      }
      suscripciones: {
        Row: {
          actualizado_en: string
          cancelada_en: string | null
          cobertura_hasta: string | null
          consultorio_id: string
          estado_mp: string
          id: string
          moneda: string
          mp_actualizado_en: string | null
          mp_id: string | null
          precio: number
          proximo_cobro_en: string | null
          ultimo_cobro_en: string | null
        }
        Insert: {
          actualizado_en?: string
          cancelada_en?: string | null
          cobertura_hasta?: string | null
          consultorio_id: string
          estado_mp?: string
          id?: string
          moneda?: string
          mp_actualizado_en?: string | null
          mp_id?: string | null
          precio: number
          proximo_cobro_en?: string | null
          ultimo_cobro_en?: string | null
        }
        Update: {
          actualizado_en?: string
          cancelada_en?: string | null
          cobertura_hasta?: string | null
          consultorio_id?: string
          estado_mp?: string
          id?: string
          moneda?: string
          mp_actualizado_en?: string | null
          mp_id?: string | null
          precio?: number
          proximo_cobro_en?: string | null
          ultimo_cobro_en?: string | null
        }
        Relationships: []
      }
      pagos_suscripcion: {
        Row: {
          cobrado_en: string | null
          creado_en: string
          estado: string
          id: string
          moneda: string
          monto: number
          mp_pago_id: string
          periodo_desde: string | null
          periodo_hasta: string | null
          suscripcion_id: string
        }
        Insert: {
          cobrado_en?: string | null
          creado_en?: string
          estado: string
          id?: string
          moneda: string
          monto: number
          mp_pago_id: string
          periodo_desde?: string | null
          periodo_hasta?: string | null
          suscripcion_id: string
        }
        Update: {
          cobrado_en?: string | null
          creado_en?: string
          estado?: string
          id?: string
          moneda?: string
          monto?: number
          mp_pago_id?: string
          periodo_desde?: string | null
          periodo_hasta?: string | null
          suscripcion_id?: string
        }
        Relationships: []
      }
      avisos_comerciales: {
        Row: {
          codigo: string
          consultorio_id: string
          creado_en: string
          id: string
          visto_en: string | null
        }
        Insert: {
          codigo: string
          consultorio_id: string
          creado_en?: string
          id?: string
          visto_en?: string | null
        }
        Update: {
          codigo?: string
          consultorio_id?: string
          creado_en?: string
          id?: string
          visto_en?: string | null
        }
        Relationships: []
      }
      eventos_proveedor: {
        Row: {
          creado_en: string
          error: string | null
          id: string
          id_evento: string
          procesado_en: string | null
          proveedor: string
          recurso_id: string | null
          tipo: string
        }
        Insert: {
          creado_en?: string
          error?: string | null
          id?: string
          id_evento: string
          procesado_en?: string | null
          proveedor?: string
          recurso_id?: string | null
          tipo: string
        }
        Update: {
          creado_en?: string
          error?: string | null
          id?: string
          id_evento?: string
          procesado_en?: string | null
          proveedor?: string
          recurso_id?: string | null
          tipo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_invitacion: {
        Args: { p_huella?: string }
        Returns: undefined
      }
      tiene_ingreso_propio: {
        Args: never
        Returns: boolean
      }
      nombre_consultorio_invitacion: {
        Args: { p_correo?: string; p_huella?: string }
        Returns: string
      }
      guardar_plan: {
        Args: { p_comidas: Json; p_indicaciones: string | null; p_plan_id: string; p_titulo: string }
        Returns: undefined
      }
      publicar_plan: {
        Args: { p_plan_id: string }
        Returns: number
      }
      oferta_publica: {
        Args: never
        Returns: {
          moneda: string
          precio_mensual: number | null
          prueba_cantidad: number
          prueba_unidad: string
          pruebas_habilitadas: boolean
        }[]
      }
      estado_acceso_comercial: {
        Args: { p_consultorio_id: string }
        Returns: string
      }
      ajustar_prueba: {
        Args: { p_consultorio_id: string; p_motivo: string; p_vence_en: string }
        Returns: undefined
      }
      registrar_pago_verificado: {
        Args: {
          p_cobrado_en: string
          p_estado: string
          p_moneda: string
          p_monto: number
          p_mp_pago: string
          p_mp_suscripcion: string
        }
        Returns: undefined
      }
      crear_consultorio_inicial: {
        Args: { p_nombre: string; p_zona_horaria?: string }
        Returns: string
      }
      obtener_mi_contexto: {
        Args: never
        Returns: {
          apellido: string
          avatar_url: string | null
          consultorio_estado: Database["public"]["Enums"]["estado_consultorio"] | null
          consultorio_id: string | null
          consultorio_nombre: string | null
          consultorio_zona_horaria: string | null
          es_superadmin: boolean
          nombre: string
          paleta: string
          rol_consultorio: Database["public"]["Enums"]["rol_consultorio"] | null
          tema: Database["public"]["Enums"]["preferencia_tema"]
          tipo_cuenta: Database["public"]["Enums"]["tipo_cuenta"] | null
          usuario_id: string
        }[]
      }
    }
    Enums: {
      categoria_objetivo: "peso" | "habito" | "analitica" | "bienestar" | "otro"
      estado_consultorio: "activo" | "suspendido" | "baja"
      estado_objetivo: "pendiente" | "en_progreso" | "completado" | "cancelado"
      estado_paciente: "activo" | "inactivo"
      estado_turno: "programado" | "confirmado" | "completado" | "cancelado" | "ausente"
      momento_comida: "desayuno" | "media_manana" | "almuerzo" | "merienda" | "cena" | "colacion"
      preferencia_tema: "claro" | "oscuro" | "sistema"
      rol_consultorio: "titular" | "colaborador"
      tipo_consulta: "primera_consulta" | "seguimiento" | "control" | "otro"
      tipo_cuenta: "profesional" | "paciente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
