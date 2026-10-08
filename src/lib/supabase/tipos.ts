export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ajustes: {
        Row: {
          agenda_generada_hasta: string | null;
          horas_para_cancelar: number;
          id: boolean;
          meta_clientes: number;
          semanas_por_delante: number;
        };
        ComputedFields: never;
        Insert: {
          agenda_generada_hasta?: string | null;
          horas_para_cancelar?: number;
          id?: boolean;
          meta_clientes?: number;
          semanas_por_delante?: number;
        };
        Update: {
          agenda_generada_hasta?: string | null;
          horas_para_cancelar?: number;
          id?: boolean;
          meta_clientes?: number;
          semanas_por_delante?: number;
        };
        Relationships: [];
      };
      clases: {
        Row: {
          cancelada: boolean;
          creado_en: string;
          cupos: number;
          duracion_min: number;
          fecha: string;
          franja_id: string | null;
          hora_inicio: string;
          id: string;
          instructora_id: string;
          sala: string;
          tipo: Database["public"]["Enums"]["tipo_clase"];
        };
        ComputedFields: never;
        Insert: {
          cancelada?: boolean;
          creado_en?: string;
          cupos: number;
          duracion_min: number;
          fecha: string;
          franja_id?: string | null;
          hora_inicio: string;
          id?: string;
          instructora_id: string;
          sala: string;
          tipo: Database["public"]["Enums"]["tipo_clase"];
        };
        Update: {
          cancelada?: boolean;
          creado_en?: string;
          cupos?: number;
          duracion_min?: number;
          fecha?: string;
          franja_id?: string | null;
          hora_inicio?: string;
          id?: string;
          instructora_id?: string;
          sala?: string;
          tipo?: Database["public"]["Enums"]["tipo_clase"];
        };
        Relationships: [
          {
            foreignKeyName: "clases_franja_id_fkey";
            columns: ["franja_id"];
            isOneToOne: false;
            referencedRelation: "horario_semanal";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clases_instructora_id_fkey";
            columns: ["instructora_id"];
            isOneToOne: false;
            referencedRelation: "equipo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clases_sala_fkey";
            columns: ["sala"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          acepta_terminos: boolean;
          acudiente_identificacion: string | null;
          acudiente_nombre: string | null;
          acudiente_telefono: string | null;
          alta: string;
          correo: string | null;
          creado_en: string;
          cuenta_id: string | null;
          emergencia_nombre: string | null;
          emergencia_telefono: string | null;
          eps: string | null;
          fecha_nacimiento: string | null;
          id: string;
          identificacion: string;
          nombre: string;
          telefono: string | null;
          tipo_identificacion: Database["public"]["Enums"]["tipo_identificacion"];
          ultima_asistencia: string | null;
        };
        ComputedFields: never;
        Insert: {
          acepta_terminos?: boolean;
          acudiente_identificacion?: string | null;
          acudiente_nombre?: string | null;
          acudiente_telefono?: string | null;
          alta?: string;
          correo?: string | null;
          creado_en?: string;
          cuenta_id?: string | null;
          emergencia_nombre?: string | null;
          emergencia_telefono?: string | null;
          eps?: string | null;
          fecha_nacimiento?: string | null;
          id?: string;
          identificacion: string;
          nombre: string;
          telefono?: string | null;
          tipo_identificacion?: Database["public"]["Enums"]["tipo_identificacion"];
          ultima_asistencia?: string | null;
        };
        Update: {
          acepta_terminos?: boolean;
          acudiente_identificacion?: string | null;
          acudiente_nombre?: string | null;
          acudiente_telefono?: string | null;
          alta?: string;
          correo?: string | null;
          creado_en?: string;
          cuenta_id?: string | null;
          emergencia_nombre?: string | null;
          emergencia_telefono?: string | null;
          eps?: string | null;
          fecha_nacimiento?: string | null;
          id?: string;
          identificacion?: string;
          nombre?: string;
          telefono?: string | null;
          tipo_identificacion?: Database["public"]["Enums"]["tipo_identificacion"];
          ultima_asistencia?: string | null;
        };
        Relationships: [];
      };
      dias_cerrados: {
        Row: {
          fecha: string;
          motivo: string;
        };
        ComputedFields: never;
        Insert: {
          fecha: string;
          motivo: string;
        };
        Update: {
          fecha?: string;
          motivo?: string;
        };
        Relationships: [];
      };
      equipo: {
        Row: {
          activo: boolean;
          alta: string;
          clases_semana: number;
          correo: string;
          cuenta_id: string | null;
          id: string;
          nombre: string;
          rol: Database["public"]["Enums"]["rol_equipo"];
          telefono: string | null;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          alta?: string;
          clases_semana?: number;
          correo: string;
          cuenta_id?: string | null;
          id?: string;
          nombre: string;
          rol: Database["public"]["Enums"]["rol_equipo"];
          telefono?: string | null;
        };
        Update: {
          activo?: boolean;
          alta?: string;
          clases_semana?: number;
          correo?: string;
          cuenta_id?: string | null;
          id?: string;
          nombre?: string;
          rol?: Database["public"]["Enums"]["rol_equipo"];
          telefono?: string | null;
        };
        Relationships: [];
      };
      gastos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_gasto"];
          comprobante_path: string | null;
          concepto: string;
          creado_en: string;
          fecha: string;
          id: string;
          importe: number;
          metodo: Database["public"]["Enums"]["metodo_pago"];
          registrado_por: string | null;
        };
        ComputedFields: never;
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_gasto"];
          comprobante_path?: string | null;
          concepto: string;
          creado_en?: string;
          fecha: string;
          id?: string;
          importe: number;
          metodo: Database["public"]["Enums"]["metodo_pago"];
          registrado_por?: string | null;
        };
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_gasto"];
          comprobante_path?: string | null;
          concepto?: string;
          creado_en?: string;
          fecha?: string;
          id?: string;
          importe?: number;
          metodo?: Database["public"]["Enums"]["metodo_pago"];
          registrado_por?: string | null;
        };
        Relationships: [];
      };
      horario_semanal: {
        Row: {
          activa: boolean;
          dia: number;
          duracion_min: number;
          hora_inicio: string;
          id: string;
          instructora_id: string | null;
          sala: string;
        };
        ComputedFields: never;
        Insert: {
          activa?: boolean;
          dia: number;
          duracion_min?: number;
          hora_inicio: string;
          id?: string;
          instructora_id?: string | null;
          sala: string;
        };
        Update: {
          activa?: boolean;
          dia?: number;
          duracion_min?: number;
          hora_inicio?: string;
          id?: string;
          instructora_id?: string | null;
          sala?: string;
        };
        Relationships: [
          {
            foreignKeyName: "horario_semanal_instructora_id_fkey";
            columns: ["instructora_id"];
            isOneToOne: false;
            referencedRelation: "equipo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "horario_semanal_sala_fkey";
            columns: ["sala"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
        ];
      };
      lista_espera: {
        Row: {
          clase_id: string;
          cliente_id: string;
          creado_en: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          clase_id: string;
          cliente_id: string;
          creado_en?: string;
          id?: string;
        };
        Update: {
          clase_id?: string;
          cliente_id?: string;
          creado_en?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lista_espera_clase_id_fkey";
            columns: ["clase_id"];
            isOneToOne: false;
            referencedRelation: "clases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lista_espera_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lista_espera_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_vigentes";
            referencedColumns: ["id"];
          },
        ];
      };
      membresias: {
        Row: {
          clases_mat: number;
          clases_reformer: number;
          cliente_id: string;
          creado_en: string;
          id: string;
          importe: number;
          inicio: string;
          plan_id: string;
          vencimiento: string;
        };
        ComputedFields: never;
        Insert: {
          clases_mat: number;
          clases_reformer: number;
          cliente_id: string;
          creado_en?: string;
          id?: string;
          importe: number;
          inicio: string;
          plan_id: string;
          vencimiento: string;
        };
        Update: {
          clases_mat?: number;
          clases_reformer?: number;
          cliente_id?: string;
          creado_en?: string;
          id?: string;
          importe?: number;
          inicio?: string;
          plan_id?: string;
          vencimiento?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membresias_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membresias_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membresias_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "planes";
            referencedColumns: ["id"];
          },
        ];
      };
      pagos: {
        Row: {
          cliente_id: string;
          creado_en: string;
          fecha: string;
          id: string;
          importe: number;
          membresia_id: string | null;
          metodo: Database["public"]["Enums"]["metodo_pago"];
        };
        ComputedFields: never;
        Insert: {
          cliente_id: string;
          creado_en?: string;
          fecha: string;
          id?: string;
          importe: number;
          membresia_id?: string | null;
          metodo: Database["public"]["Enums"]["metodo_pago"];
        };
        Update: {
          cliente_id?: string;
          creado_en?: string;
          fecha?: string;
          id?: string;
          importe?: number;
          membresia_id?: string | null;
          metodo?: Database["public"]["Enums"]["metodo_pago"];
        };
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagos_membresia_id_fkey";
            columns: ["membresia_id"];
            isOneToOne: false;
            referencedRelation: "membresias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagos_membresia_id_fkey";
            columns: ["membresia_id"];
            isOneToOne: false;
            referencedRelation: "membresias_pendientes";
            referencedColumns: ["membresia_id"];
          },
        ];
      };
      perfiles: {
        Row: {
          creado_en: string;
          id: string;
          nombre: string;
          rol: Database["public"]["Enums"]["rol_equipo"];
        };
        ComputedFields: never;
        Insert: {
          creado_en?: string;
          id: string;
          nombre: string;
          rol?: Database["public"]["Enums"]["rol_equipo"];
        };
        Update: {
          creado_en?: string;
          id?: string;
          nombre?: string;
          rol?: Database["public"]["Enums"]["rol_equipo"];
        };
        Relationships: [];
      };
      planes: {
        Row: {
          actualizado_en: string;
          caracteristicas: string[];
          clases_incluidas: number | null;
          clases_mat: number;
          clases_reformer: number;
          creado_en: string;
          descripcion: string;
          id: string;
          modalidad: Database["public"]["Enums"]["modalidad_plan"];
          nombre: string;
          precio: number;
          se_vende: boolean;
          vigencia_dias: number;
        };
        ComputedFields: never;
        Insert: {
          actualizado_en?: string;
          caracteristicas?: string[];
          clases_incluidas?: never;
          clases_mat?: number;
          clases_reformer?: number;
          creado_en?: string;
          descripcion?: string;
          id?: string;
          modalidad?: Database["public"]["Enums"]["modalidad_plan"];
          nombre: string;
          precio: number;
          se_vende?: boolean;
          vigencia_dias: number;
        };
        Update: {
          actualizado_en?: string;
          caracteristicas?: string[];
          clases_incluidas?: never;
          clases_mat?: number;
          clases_reformer?: number;
          creado_en?: string;
          descripcion?: string;
          id?: string;
          modalidad?: Database["public"]["Enums"]["modalidad_plan"];
          nombre?: string;
          precio?: number;
          se_vende?: boolean;
          vigencia_dias?: number;
        };
        Relationships: [];
      };
      presupuestos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_gasto"];
          importe: number;
          mes: string;
        };
        ComputedFields: never;
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_gasto"];
          importe: number;
          mes: string;
        };
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_gasto"];
          importe?: number;
          mes?: string;
        };
        Relationships: [];
      };
      reservas: {
        Row: {
          asistencia: Database["public"]["Enums"]["asistencia"] | null;
          asistencia_marcada_en: string | null;
          asistencia_marcada_por: string | null;
          clase_id: string;
          cliente_id: string;
          creado_en: string;
          id: string;
          membresia_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          asistencia?: Database["public"]["Enums"]["asistencia"] | null;
          asistencia_marcada_en?: string | null;
          asistencia_marcada_por?: string | null;
          clase_id: string;
          cliente_id: string;
          creado_en?: string;
          id?: string;
          membresia_id?: string | null;
        };
        Update: {
          asistencia?: Database["public"]["Enums"]["asistencia"] | null;
          asistencia_marcada_en?: string | null;
          asistencia_marcada_por?: string | null;
          clase_id?: string;
          cliente_id?: string;
          creado_en?: string;
          id?: string;
          membresia_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservas_clase_id_fkey";
            columns: ["clase_id"];
            isOneToOne: false;
            referencedRelation: "clases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservas_membresia_id_fkey";
            columns: ["membresia_id"];
            isOneToOne: false;
            referencedRelation: "membresias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservas_membresia_id_fkey";
            columns: ["membresia_id"];
            isOneToOne: false;
            referencedRelation: "membresias_pendientes";
            referencedColumns: ["membresia_id"];
          },
        ];
      };
      salas: {
        Row: {
          capacidad: number;
          id: string;
          nombre: string;
        };
        ComputedFields: never;
        Insert: {
          capacidad: number;
          id: string;
          nombre: string;
        };
        Update: {
          capacidad?: number;
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      clientes_vigentes: {
        Row: {
          alta: string | null;
          correo: string | null;
          estado: Database["public"]["Enums"]["estado_membresia"] | null;
          id: string | null;
          identificacion: string | null;
          importe_renovacion: number | null;
          nombre: string | null;
          plan: string | null;
          telefono: string | null;
          tipo_identificacion: Database["public"]["Enums"]["tipo_identificacion"] | null;
          ultima_asistencia: string | null;
          vencimiento: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      membresias_pendientes: {
        Row: {
          cliente_id: string | null;
          importe: number | null;
          inicio: string | null;
          membresia_id: string | null;
          nombre: string | null;
          pagado: number | null;
          pendiente: number | null;
          plan: string | null;
          telefono: string | null;
          vencimiento: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "membresias_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membresias_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_vigentes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      agenda_cliente: {
        Args: { p_desde: string; p_hasta: string };
        Returns: {
          cupos: number;
          disponibles: number;
          duracion_min: number;
          fecha: string;
          hora_inicio: string;
          id: string;
          instructora: string;
          puesto_espera: number;
          reservada: boolean;
          reservas: number;
          tipo: Database["public"]["Enums"]["tipo_clase"];
        }[];
      };
      cambiar_rol_equipo: {
        Args: { p_equipo: string; p_rol: Database["public"]["Enums"]["rol_equipo"] };
        Returns: undefined;
      };
      cancelar_mi_reserva: { Args: { p_clase: string }; Returns: undefined };
      clases_usadas: {
        Args: { p_membresia: string; p_tipo: Database["public"]["Enums"]["tipo_clase"] };
        Returns: number;
      };
      copiar_dia_horario: { Args: { p_desde: number; p_dias: number[] }; Returns: number };
      crear_clases_de_horario: {
        Args: { p_desde: string; p_franja?: string; p_hasta: string };
        Returns: number;
      };
      disponibles_para: {
        Args: { p_fecha: string; p_tipo: Database["public"]["Enums"]["tipo_clase"] };
        Returns: {
          cliente_id: string;
          disponibles: number;
        }[];
      };
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      es_mostrador: { Args: Record<PropertyKey, never>; Returns: boolean };
      estado_de_membresia: {
        Args: { p_hoy?: string; p_ultima_asistencia: string; p_vencimiento: string };
        Returns: Database["public"]["Enums"]["estado_membresia"];
      };
      extender_agenda: { Args: Record<PropertyKey, never>; Returns: number };
      extender_agenda_interna: { Args: Record<PropertyKey, never>; Returns: number };
      marcar_asistencia: {
        Args: { p_asistencia: Database["public"]["Enums"]["asistencia"]; p_reserva: string };
        Returns: undefined;
      };
      membresia_para: {
        Args: {
          p_cliente: string;
          p_fecha: string;
          p_tipo: Database["public"]["Enums"]["tipo_clase"];
        };
        Returns: string;
      };
      mi_cliente_id: { Args: Record<PropertyKey, never>; Returns: string };
      mi_equipo_id: { Args: Record<PropertyKey, never>; Returns: string };
      mi_rol: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["rol_equipo"];
      };
      mover_reserva: { Args: { p_clase: string; p_reserva: string }; Returns: undefined };
      promover_lista_espera: { Args: { p_clase: string }; Returns: number };
      registrar_membresia: {
        Args: {
          p_abono?: number;
          p_cliente: string;
          p_metodo: Database["public"]["Enums"]["metodo_pago"];
          p_plan: string;
        };
        Returns: string;
      };
      reprogramar_mi_reserva: { Args: { p_desde: string; p_hacia: string }; Returns: undefined };
      reservar_mi_clase: { Args: { p_clase: string }; Returns: undefined };
      saldo_clases: {
        Args: { p_cliente: string };
        Returns: {
          clases_mat: number;
          clases_reformer: number;
          inicio: string;
          membresia_id: string;
          modalidad: Database["public"]["Enums"]["modalidad_plan"];
          plan: string;
          usadas_mat: number;
          usadas_reformer: number;
          vencimiento: string;
        }[];
      };
      salir_lista_espera: { Args: { p_clase: string }; Returns: undefined };
      tiene_perfil: { Args: Record<PropertyKey, never>; Returns: boolean };
      unirme_lista_espera: { Args: { p_clase: string }; Returns: number };
    };
    Enums: {
      asistencia: "Asistió" | "No vino";
      categoria_gasto: "Arriendo" | "Nómina" | "Servicios" | "Mantenimiento" | "Marketing";
      estado_membresia: "Activa" | "Por vencer" | "Vencida" | "Inactiva" | "Sin plan";
      metodo_pago: "Efectivo" | "Nequi" | "Transferencia" | "Tarjeta" | "Daviplata" | "Otro";
      modalidad_plan: "Mat" | "Reformer" | "Fusión";
      rol_equipo: "Instructora" | "Administración" | "Recepción";
      tipo_clase: "Reformer" | "Mat" | "Privada";
      tipo_identificacion: "C.C." | "T.I." | "C.E." | "Pasaporte" | "R.C.";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asistencia: ["Asistió", "No vino"],
      categoria_gasto: ["Arriendo", "Nómina", "Servicios", "Mantenimiento", "Marketing"],
      estado_membresia: ["Activa", "Por vencer", "Vencida", "Inactiva", "Sin plan"],
      metodo_pago: ["Efectivo", "Nequi", "Transferencia", "Tarjeta", "Daviplata", "Otro"],
      modalidad_plan: ["Mat", "Reformer", "Fusión"],
      rol_equipo: ["Instructora", "Administración", "Recepción"],
      tipo_clase: ["Reformer", "Mat", "Privada"],
      tipo_identificacion: ["C.C.", "T.I.", "C.E.", "Pasaporte", "R.C."],
    },
  },
} as const;
