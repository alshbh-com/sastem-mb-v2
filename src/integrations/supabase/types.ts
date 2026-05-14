export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string | null
          id: string
          last_login_at: string | null
          last_login_ip: string | null
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          username?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          invoice_number: number
          is_locked: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: number
          is_locked?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: number
          is_locked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          color: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string
          governorate: string
          id: string
          info: string | null
          invoice_id: string | null
          order_number: number
          phone: string
          product_id: string | null
          quantity: number | null
          size: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_price: number
        }
        Insert: {
          address?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string
          governorate?: string
          id?: string
          info?: string | null
          invoice_id?: string | null
          order_number?: number
          phone?: string
          product_id?: string | null
          quantity?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_price?: number
        }
        Update: {
          address?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string
          governorate?: string
          id?: string
          info?: string | null
          invoice_id?: string | null
          order_number?: number
          phone?: string
          product_id?: string | null
          quantity?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_colors: string[] | null
          available_sizes: string[] | null
          created_at: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          available_colors?: string[] | null
          available_sizes?: string[] | null
          created_at?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          available_colors?: string[] | null
          available_sizes?: string[] | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user: {
        Args: {
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_username: string
        }
        Returns: Json
      }
      login: { Args: { p_password: string; p_username: string }; Returns: Json }
      login_by_password: { Args: { p_password: string }; Returns: Json }
    }
    Enums: {
      order_status: "new" | "shipped" | "delivered"
      user_role: "admin" | "moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: ["new", "shipped", "delivered"],
      user_role: ["admin", "moderator"],
    },
  },
} as const
