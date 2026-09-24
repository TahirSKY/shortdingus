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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      image_library: {
        Row: {
          created_at: string
          id: string
          storage_path: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          storage_path?: string | null
          title?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          storage_path?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      saved_renders: {
        Row: {
          created_at: string
          id: string
          mode: string
          notes: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      saved_templates: {
        Row: {
          code: string
          created_at: string
          description: string
          emoji: string
          id: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      studio_assets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          metadata: Json | null
          mime_type: string
          project_id: string
          storage_path: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind: string
          metadata?: Json | null
          mime_type: string
          project_id: string
          storage_path?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          metadata?: Json | null
          mime_type?: string
          project_id?: string
          storage_path?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          payload: Json | null
          project_id: string
          role: string
          sequence: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          project_id: string
          role: string
          sequence: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          project_id?: string
          role?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          created_at: string
          edl: Json | null
          footage_analysis: Json | null
          id: string
          mode: string
          revision: number
          script: Json | null
          selected_direction: Json | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edl?: Json | null
          footage_analysis?: Json | null
          id?: string
          mode: string
          revision?: number
          script?: Json | null
          selected_direction?: Json | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edl?: Json | null
          footage_analysis?: Json | null
          id?: string
          mode?: string
          revision?: number
          script?: Json | null
          selected_direction?: Json | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_analyses: {
        Row: {
          beats: Json
          created_at: string
          duration_seconds: number
          error_message: string | null
          id: string
          mime_type: string
          status: string
          storage_path: string
          summary: string | null
          updated_at: string
          video_name: string
        }
        Insert: {
          beats?: Json
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          id?: string
          mime_type: string
          status?: string
          storage_path: string
          summary?: string | null
          updated_at?: string
          video_name: string
        }
        Update: {
          beats?: Json
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          id?: string
          mime_type?: string
          status?: string
          storage_path?: string
          summary?: string | null
          updated_at?: string
          video_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
