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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      notification_preferences: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          min_priority: Database["public"]["Enums"]["priority_level"]
          service_tags: Database["public"]["Enums"]["service_tag"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          id?: string
          min_priority?: Database["public"]["Enums"]["priority_level"]
          service_tags?: Database["public"]["Enums"]["service_tag"][]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          min_priority?: Database["public"]["Enums"]["priority_level"]
          service_tags?: Database["public"]["Enums"]["service_tag"][]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          agency: string
          contract_expiration: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          county_notes: string | null
          created_at: string
          created_by: string | null
          current_911_provider: string | null
          current_nemt_provider: string | null
          current_procurement_type: string | null
          ems_plan_url: string | null
          estimated_value_max: number | null
          estimated_value_min: number | null
          geography_city: string | null
          geography_county: string | null
          geography_state: string
          id: string
          issue_date: string | null
          lemsa_site: string | null
          link: string
          pre_bid_meeting: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          proposal_due: string
          questions_due: string | null
          recommended_action: string | null
          service_tags: Database["public"]["Enums"]["service_tag"][]
          source: string
          status: Database["public"]["Enums"]["opportunity_status"]
          summary: string
          term_length: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency: string
          contract_expiration?: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          county_notes?: string | null
          created_at?: string
          created_by?: string | null
          current_911_provider?: string | null
          current_nemt_provider?: string | null
          current_procurement_type?: string | null
          ems_plan_url?: string | null
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          geography_city?: string | null
          geography_county?: string | null
          geography_state: string
          id?: string
          issue_date?: string | null
          lemsa_site?: string | null
          link: string
          pre_bid_meeting?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          proposal_due: string
          questions_due?: string | null
          recommended_action?: string | null
          service_tags?: Database["public"]["Enums"]["service_tag"][]
          source: string
          status?: Database["public"]["Enums"]["opportunity_status"]
          summary: string
          term_length?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency?: string
          contract_expiration?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          county_notes?: string | null
          created_at?: string
          created_by?: string | null
          current_911_provider?: string | null
          current_nemt_provider?: string | null
          current_procurement_type?: string | null
          ems_plan_url?: string | null
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          geography_city?: string | null
          geography_county?: string | null
          geography_state?: string
          id?: string
          issue_date?: string | null
          lemsa_site?: string | null
          link?: string
          pre_bid_meeting?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          proposal_due?: string
          questions_due?: string | null
          recommended_action?: string | null
          service_tags?: Database["public"]["Enums"]["service_tag"][]
          source?: string
          status?: Database["public"]["Enums"]["opportunity_status"]
          summary?: string
          term_length?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_changes: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          opportunity_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          opportunity_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_changes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      scraped_sources: {
        Row: {
          created_at: string
          id: string
          last_scraped_at: string | null
          source_name: string
          source_url: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          source_name: string
          source_url: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          source_name?: string
          source_url?: string
          status?: string
        }
        Relationships: []
      }
      scraping_history: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          opportunities_found: number | null
          opportunities_inserted: number | null
          source_name: string
          source_type: string
          source_url: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opportunities_found?: number | null
          opportunities_inserted?: number | null
          source_name: string
          source_type: string
          source_url: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opportunities_found?: number | null
          opportunities_inserted?: number | null
          source_name?: string
          source_type?: string
          source_url?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string
          generated_by: string | null
          high_priority_count: number
          id: string
          report_data: Json
          report_date: string
          total_opportunities: number
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          high_priority_count?: number
          id?: string
          report_data: Json
          report_date: string
          total_opportunities?: number
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          high_priority_count?: number
          id?: string
          report_data?: Json
          report_date?: string
          total_opportunities?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
      contract_type:
        | "RFP"
        | "RFQ"
        | "RFI"
        | "Sources Sought"
        | "Pre-solicitation"
        | "Sole-Source Notice"
      opportunity_status: "new" | "monitoring" | "in-pipeline" | "archived"
      priority_level: "high" | "medium" | "low"
      service_tag:
        | "EMS 911"
        | "Non-Emergency"
        | "IFT"
        | "BLS"
        | "ALS"
        | "CCT"
        | "MEDEVAC"
        | "Billing"
        | "CQI"
        | "EMS Tech"
        | "VR/Sim"
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
      app_role: ["admin", "member", "viewer"],
      contract_type: [
        "RFP",
        "RFQ",
        "RFI",
        "Sources Sought",
        "Pre-solicitation",
        "Sole-Source Notice",
      ],
      opportunity_status: ["new", "monitoring", "in-pipeline", "archived"],
      priority_level: ["high", "medium", "low"],
      service_tag: [
        "EMS 911",
        "Non-Emergency",
        "IFT",
        "BLS",
        "ALS",
        "CCT",
        "MEDEVAC",
        "Billing",
        "CQI",
        "EMS Tech",
        "VR/Sim",
      ],
    },
  },
} as const
