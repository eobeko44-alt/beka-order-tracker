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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      games: {
        Row: {
          accent_color: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          sort_order: number
        }
        Insert: {
          accent_color?: string
          created_at?: string
          id: string
          is_active?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
        }
        Update: {
          accent_color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_sdg: number
          created_at: string
          customer_name: string | null
          game_id: string
          id: string
          package_id: string
          payer_account: string | null
          payment_method_id: string
          player_id: string
          receipt_path: string | null
          reviewed_at: string | null
          status: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          amount_sdg?: number
          created_at?: string
          customer_name?: string | null
          game_id: string
          id?: string
          package_id: string
          payer_account?: string | null
          payment_method_id: string
          player_id: string
          receipt_path?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          amount_sdg?: number
          created_at?: string
          customer_name?: string | null
          game_id?: string
          id?: string
          package_id?: string
          payer_account?: string | null
          payment_method_id?: string
          player_id?: string
          receipt_path?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_email_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          game_id: string
          id: string
          is_active: boolean
          label_ar: string
          price_sdg: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id: string
          is_active?: boolean
          label_ar: string
          price_sdg: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          price_sdg?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_label_ar: string
          account_value: string
          created_at: string
          id: string
          instructions_ar: string | null
          is_active: boolean
          name_ar: string
          sort_order: number
        }
        Insert: {
          account_label_ar: string
          account_value: string
          created_at?: string
          id: string
          instructions_ar?: string | null
          is_active?: boolean
          name_ar: string
          sort_order?: number
        }
        Update: {
          account_label_ar?: string
          account_value?: string
          created_at?: string
          id?: string
          instructions_ar?: string | null
          is_active?: boolean
          name_ar?: string
          sort_order?: number
        }
        Relationships: []
      }
      phone_login_requests: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          email: string | null
          id: string
          legacy_user_id: string | null
          name: string | null
          phone: string | null
          points: number
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id: string
          legacy_user_id?: string | null
          name?: string | null
          phone?: string | null
          points?: number
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          legacy_user_id?: string | null
          name?: string | null
          phone?: string | null
          points?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          customer_name: string
          game_id: string | null
          id: string
          order_id: string | null
          rating: number
          reviewed_at: string | null
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          customer_name: string
          game_id?: string | null
          id?: string
          order_id?: string | null
          rating: number
          reviewed_at?: string | null
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          customer_name?: string
          game_id?: string | null
          id?: string
          order_id?: string | null
          rating?: number
          reviewed_at?: string | null
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topups: {
        Row: {
          amount_sdg: number
          created_at: string
          id: string
          method: string
          receipt_path: string
          reviewed_at: string | null
          status: string
          transaction_number: string
          user_id: string
        }
        Insert: {
          amount_sdg: number
          created_at?: string
          id?: string
          method: string
          receipt_path: string
          reviewed_at?: string | null
          status?: string
          transaction_number: string
          user_id?: string
        }
        Update: {
          amount_sdg?: number
          created_at?: string
          id?: string
          method?: string
          receipt_path?: string
          reviewed_at?: string | null
          status?: string
          transaction_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: never; Returns: boolean }
      place_wallet_order: {
        Args: {
          p_customer_name: string
          p_game_id: string
          p_package_id: string
          p_player_id: string
          p_whatsapp: string
        }
        Returns: string
      }
      review_order: {
        Args: { p_approve: boolean; p_order_id: string }
        Returns: undefined
      }
      review_phone_login: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: undefined
      }
      review_topup: {
        Args: { p_approve: boolean; p_topup_id: string }
        Returns: undefined
      }
      submit_review: {
        Args: { p_comment: string; p_order_id: string; p_rating: number }
        Returns: string
      }
      track_orders: {
        Args: { p_query: string }
        Returns: {
          created_at: string
          game_name: string
          order_code: string
          package_label: string
          player_id: string
          reviewed_at: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "owner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner"],
    },
  },
} as const
