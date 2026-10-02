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
      clientes: {
        Row: {
          acepta_terminos: boolean;
          acudiente_identificacion: string | null;
          acudiente_nombre: string | null;
          acudiente_telefono: string | null;
          alta: string;
          correo: string | null;
          creado_en: string;
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
        Insert: {
          acepta_terminos?: boolean;
          acudiente_identificacion?: string | null;
          acudiente_nombre?: string | null;
          acudiente_telefono?: string | null;
          alta?: string;
          correo?: string | null;
          creado_en?: string;
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
      equipo: {
        Row: {
          activo: boolean;
          alta: string;
          clases_semana: number;
          correo: string;
          id: string;
          nombre: string;
          rol: Database["public"]["Enums"]["rol_equipo"];
          telefono: string | null;
        };
        Insert: {
          activo?: boolean;
          alta?: string;
          clases_semana?: number;
          correo: string;
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
      membresias: {
        Row: {
          cliente_id: string;
          creado_en: string;
          id: string;
          importe: number;
          inicio: string;
          plan_id: string;
          vencimiento: string;
        };
        Insert: {
          cliente_id: string;
          creado_en?: string;
          id?: string;
          importe: number;
          inicio: string;
          plan_id: string;
          vencimiento: string;
        };
        Update: {
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
        ];
      };
      perfiles: {
        Row: {
          creado_en: string;
          id: string;
          nombre: string;
          rol: Database["public"]["Enums"]["rol_equipo"];
        };
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
          creado_en: string;
          descripcion: string;
          id: string;
          nombre: string;
          precio: number;
          se_vende: boolean;
          vigencia_dias: number;
        };
        Insert: {
          actualizado_en?: string;
          caracteristicas?: string[];
          clases_incluidas?: number | null;
          creado_en?: string;
          descripcion?: string;
          id?: string;
          nombre: string;
          precio: number;
          se_vende?: boolean;
          vigencia_dias: number;
        };
        Update: {
          actualizado_en?: string;
          caracteristicas?: string[];
          clases_incluidas?: number | null;
          creado_en?: string;
          descripcion?: string;
          id?: string;
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
        Relationships: [];
      };
    };
    Functions: {
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      es_mostrador: { Args: Record<PropertyKey, never>; Returns: boolean };
      estado_de_membresia: {
        Args: { p_hoy?: string; p_ultima_asistencia: string; p_vencimiento: string };
        Returns: Database["public"]["Enums"]["estado_membresia"];
      };
      mi_rol: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["rol_equipo"];
      };
      registrar_membresia: {
        Args: {
          p_cliente: string;
          p_metodo: Database["public"]["Enums"]["metodo_pago"];
          p_plan: string;
        };
        Returns: string;
      };
      tiene_perfil: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      categoria_gasto: "Arriendo" | "Nómina" | "Servicios" | "Mantenimiento" | "Marketing";
      estado_membresia: "Activa" | "Por vencer" | "Vencida" | "Inactiva" | "Sin plan";
      metodo_pago: "Efectivo" | "Nequi" | "Transferencia" | "Tarjeta";
      rol_equipo: "Instructora" | "Administración" | "Recepción";
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
      categoria_gasto: ["Arriendo", "Nómina", "Servicios", "Mantenimiento", "Marketing"],
      estado_membresia: ["Activa", "Por vencer", "Vencida", "Inactiva", "Sin plan"],
      metodo_pago: ["Efectivo", "Nequi", "Transferencia", "Tarjeta"],
      rol_equipo: ["Instructora", "Administración", "Recepción"],
      tipo_identificacion: ["C.C.", "T.I.", "C.E.", "Pasaporte", "R.C."],
    },
  },
} as const;
