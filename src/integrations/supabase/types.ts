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
      audit_logs: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          ip_address: string | null
          metadata: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
          user_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      competitive_assessments: {
        Row: {
          competitive_advantage: string | null
          competitors: Json | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          opportunities: string[] | null
          opportunity_id: string
          risk_mitigation: string | null
          sensitivity_level:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          strategic_recommendation: string | null
          strengths: string[] | null
          threats: string[] | null
          updated_at: string
          weaknesses: string[] | null
        }
        Insert: {
          competitive_advantage?: string | null
          competitors?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          opportunities?: string[] | null
          opportunity_id: string
          risk_mitigation?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          strategic_recommendation?: string | null
          strengths?: string[] | null
          threats?: string[] | null
          updated_at?: string
          weaknesses?: string[] | null
        }
        Update: {
          competitive_advantage?: string | null
          competitors?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          opportunities?: string[] | null
          opportunity_id?: string
          risk_mitigation?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          strategic_recommendation?: string | null
          strengths?: string[] | null
          threats?: string[] | null
          updated_at?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "competitive_assessments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_intelligence: {
        Row: {
          avg_price_position: string | null
          company_description: string | null
          competitor_name: string
          created_at: string
          differentiators: string[] | null
          headquarters: string | null
          id: string
          key_strengths: string[] | null
          key_weaknesses: string[] | null
          metadata: Json | null
          pricing_strategy_notes: string | null
          primary_markets: string[] | null
          sensitivity_level:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          service_specialties: string[] | null
          size_category: string | null
          total_bids: number | null
          total_losses: number | null
          total_wins: number | null
          typical_discount_percent: number | null
          updated_at: string
          website: string | null
          win_rate_percent: number | null
        }
        Insert: {
          avg_price_position?: string | null
          company_description?: string | null
          competitor_name: string
          created_at?: string
          differentiators?: string[] | null
          headquarters?: string | null
          id?: string
          key_strengths?: string[] | null
          key_weaknesses?: string[] | null
          metadata?: Json | null
          pricing_strategy_notes?: string | null
          primary_markets?: string[] | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          service_specialties?: string[] | null
          size_category?: string | null
          total_bids?: number | null
          total_losses?: number | null
          total_wins?: number | null
          typical_discount_percent?: number | null
          updated_at?: string
          website?: string | null
          win_rate_percent?: number | null
        }
        Update: {
          avg_price_position?: string | null
          company_description?: string | null
          competitor_name?: string
          created_at?: string
          differentiators?: string[] | null
          headquarters?: string | null
          id?: string
          key_strengths?: string[] | null
          key_weaknesses?: string[] | null
          metadata?: Json | null
          pricing_strategy_notes?: string | null
          primary_markets?: string[] | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          service_specialties?: string[] | null
          size_category?: string | null
          total_bids?: number | null
          total_losses?: number | null
          total_wins?: number | null
          typical_discount_percent?: number | null
          updated_at?: string
          website?: string | null
          win_rate_percent?: number | null
        }
        Relationships: []
      }
      document_qa_conversations: {
        Row: {
          created_at: string
          document_name: string
          id: string
          opportunity_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_name: string
          id?: string
          opportunity_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_name?: string
          id?: string
          opportunity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_qa_conversations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      document_qa_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_qa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "document_qa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      go_no_go_evaluations: {
        Row: {
          competitor_analysis_notes: string | null
          competitor_analysis_score: number | null
          contract_approach_notes: string | null
          contract_approach_score: number | null
          created_at: string
          created_by: string | null
          decision_rationale: string | null
          executive_summary: string | null
          id: string
          metadata: Json | null
          opportunity_id: string
          past_performance_notes: string | null
          past_performance_score: number | null
          reality_check_notes: string | null
          reality_check_score: number | null
          recommendation: string | null
          roi_potential_notes: string | null
          roi_potential_score: number | null
          sensitivity_level:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          strategic_fit_notes: string | null
          strategic_fit_score: number | null
          timeline_feasibility_notes: string | null
          timeline_feasibility_score: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          competitor_analysis_notes?: string | null
          competitor_analysis_score?: number | null
          contract_approach_notes?: string | null
          contract_approach_score?: number | null
          created_at?: string
          created_by?: string | null
          decision_rationale?: string | null
          executive_summary?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id: string
          past_performance_notes?: string | null
          past_performance_score?: number | null
          reality_check_notes?: string | null
          reality_check_score?: number | null
          recommendation?: string | null
          roi_potential_notes?: string | null
          roi_potential_score?: number | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          strategic_fit_notes?: string | null
          strategic_fit_score?: number | null
          timeline_feasibility_notes?: string | null
          timeline_feasibility_score?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          competitor_analysis_notes?: string | null
          competitor_analysis_score?: number | null
          contract_approach_notes?: string | null
          contract_approach_score?: number | null
          created_at?: string
          created_by?: string | null
          decision_rationale?: string | null
          executive_summary?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id?: string
          past_performance_notes?: string | null
          past_performance_score?: number | null
          reality_check_notes?: string | null
          reality_check_score?: number | null
          recommendation?: string | null
          roi_potential_notes?: string | null
          roi_potential_score?: number | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          strategic_fit_notes?: string | null
          strategic_fit_score?: number | null
          timeline_feasibility_notes?: string | null
          timeline_feasibility_score?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "go_no_go_evaluations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
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
          documents: Json | null
          ems_plan_url: string | null
          estimated_value_max: number | null
          estimated_value_min: number | null
          geography_city: string | null
          geography_county: string | null
          geography_state: string
          hot_flagged_type: Database["public"]["Enums"]["hot_flag_type"] | null
          id: string
          is_hot: boolean
          issue_date: string | null
          lemsa_site: string | null
          lifecycle_notes: string | null
          lifecycle_stage:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"]
            | null
          link: string
          pre_bid_meeting: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          proposal_due: string
          questions_due: string | null
          recommended_action: string | null
          sensitivity_level:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
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
          documents?: Json | null
          ems_plan_url?: string | null
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          geography_city?: string | null
          geography_county?: string | null
          geography_state: string
          hot_flagged_type?: Database["public"]["Enums"]["hot_flag_type"] | null
          id?: string
          is_hot?: boolean
          issue_date?: string | null
          lemsa_site?: string | null
          lifecycle_notes?: string | null
          lifecycle_stage?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"]
            | null
          link: string
          pre_bid_meeting?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          proposal_due: string
          questions_due?: string | null
          recommended_action?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
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
          documents?: Json | null
          ems_plan_url?: string | null
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          geography_city?: string | null
          geography_county?: string | null
          geography_state?: string
          hot_flagged_type?: Database["public"]["Enums"]["hot_flag_type"] | null
          id?: string
          is_hot?: boolean
          issue_date?: string | null
          lemsa_site?: string | null
          lifecycle_notes?: string | null
          lifecycle_stage?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"]
            | null
          link?: string
          pre_bid_meeting?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          proposal_due?: string
          questions_due?: string | null
          recommended_action?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
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
      opportunity_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          lifecycle_stage: Database["public"]["Enums"]["opportunity_lifecycle_stage"]
          opportunity_id: string
          task_description: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          lifecycle_stage: Database["public"]["Enums"]["opportunity_lifecycle_stage"]
          opportunity_id: string
          task_description?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          lifecycle_stage?: Database["public"]["Enums"]["opportunity_lifecycle_stage"]
          opportunity_id?: string
          task_description?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_tasks_opportunity_id_fkey"
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
      proposal_compliance_checks: {
        Row: {
          check_data: Json | null
          checked_at: string
          checked_by: string | null
          compliance_score: number | null
          created_at: string
          id: string
          missing_categories: string[] | null
          opportunity_id: string
          requirements_completed: number
          requirements_missing: number
          requirements_partial: number
          total_requirements: number
          total_word_count: number
        }
        Insert: {
          check_data?: Json | null
          checked_at?: string
          checked_by?: string | null
          compliance_score?: number | null
          created_at?: string
          id?: string
          missing_categories?: string[] | null
          opportunity_id: string
          requirements_completed?: number
          requirements_missing?: number
          requirements_partial?: number
          total_requirements?: number
          total_word_count?: number
        }
        Update: {
          check_data?: Json | null
          checked_at?: string
          checked_by?: string | null
          compliance_score?: number | null
          created_at?: string
          id?: string
          missing_categories?: string[] | null
          opportunity_id?: string
          requirements_completed?: number
          requirements_missing?: number
          requirements_partial?: number
          total_requirements?: number
          total_word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_compliance_checks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_content_block_versions: {
        Row: {
          change_description: string | null
          content: string
          content_block_id: string
          content_type: Database["public"]["Enums"]["content_block_type"]
          created_at: string
          created_by: string | null
          id: string
          is_template: boolean | null
          lifecycle_stages:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata: Json | null
          tags: string[] | null
          title: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          content: string
          content_block_id: string
          content_type: Database["public"]["Enums"]["content_block_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean | null
          lifecycle_stages?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata?: Json | null
          tags?: string[] | null
          title: string
          version_number: number
        }
        Update: {
          change_description?: string | null
          content?: string
          content_block_id?: string
          content_type?: Database["public"]["Enums"]["content_block_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean | null
          lifecycle_stages?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata?: Json | null
          tags?: string[] | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_content_block_versions_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "proposal_content_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_content_blocks: {
        Row: {
          content: string
          content_type: Database["public"]["Enums"]["content_block_type"]
          created_at: string
          created_by: string | null
          id: string
          is_template: boolean | null
          lifecycle_stages:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata: Json | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          content_type: Database["public"]["Enums"]["content_block_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean | null
          lifecycle_stages?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: Database["public"]["Enums"]["content_block_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean | null
          lifecycle_stages?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_instances: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          opportunity_id: string
          status: string
          submitted_at: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id: string
          status?: string
          submitted_at?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id?: string
          status?: string
          submitted_at?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_instances_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_requirement_mappings: {
        Row: {
          content_block_ids: string[] | null
          created_at: string
          custom_content: string | null
          id: string
          is_complete: boolean | null
          last_updated_by: string | null
          opportunity_id: string
          page_limit: number | null
          requirement_category: string | null
          requirement_id: string
          requirement_text: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          content_block_ids?: string[] | null
          created_at?: string
          custom_content?: string | null
          id?: string
          is_complete?: boolean | null
          last_updated_by?: string | null
          opportunity_id: string
          page_limit?: number | null
          requirement_category?: string | null
          requirement_id: string
          requirement_text: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          content_block_ids?: string[] | null
          created_at?: string
          custom_content?: string | null
          id?: string
          is_complete?: boolean | null
          last_updated_by?: string | null
          opportunity_id?: string
          page_limit?: number | null
          requirement_category?: string | null
          requirement_id?: string
          requirement_text?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_requirement_mappings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_template_sections: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          placeholder_text: string | null
          required_content_type:
            | Database["public"]["Enums"]["content_block_type"]
            | null
          section_description: string | null
          section_order: number
          section_title: string
          suggested_content_blocks: string[] | null
          template_id: string
          word_count_target: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          placeholder_text?: string | null
          required_content_type?:
            | Database["public"]["Enums"]["content_block_type"]
            | null
          section_description?: string | null
          section_order: number
          section_title: string
          suggested_content_blocks?: string[] | null
          template_id: string
          word_count_target?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          placeholder_text?: string | null
          required_content_type?:
            | Database["public"]["Enums"]["content_block_type"]
            | null
          section_description?: string | null
          section_order?: number
          section_title?: string
          suggested_content_blocks?: string[] | null
          template_id?: string
          word_count_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          lifecycle_stages:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata: Json | null
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          lifecycle_stages?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata?: Json | null
          name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          lifecycle_stages?:
            | Database["public"]["Enums"]["opportunity_lifecycle_stage"][]
            | null
          metadata?: Json | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ptw_analyses: {
        Row: {
          competitor_prices: Json | null
          confidence_level: string | null
          created_at: string
          created_by: string | null
          direct_costs: number | null
          id: string
          indirect_costs: number | null
          market_average_price: number | null
          metadata: Json | null
          opportunity_id: string
          our_estimated_price: number | null
          overhead_rate: number | null
          price_justification: string | null
          pricing_strategy: string | null
          recommended_price: number | null
          risk_assessment: string | null
          sensitivity_level:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          target_margin_percent: number | null
          updated_at: string
          win_probability_percent: number | null
        }
        Insert: {
          competitor_prices?: Json | null
          confidence_level?: string | null
          created_at?: string
          created_by?: string | null
          direct_costs?: number | null
          id?: string
          indirect_costs?: number | null
          market_average_price?: number | null
          metadata?: Json | null
          opportunity_id: string
          our_estimated_price?: number | null
          overhead_rate?: number | null
          price_justification?: string | null
          pricing_strategy?: string | null
          recommended_price?: number | null
          risk_assessment?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          target_margin_percent?: number | null
          updated_at?: string
          win_probability_percent?: number | null
        }
        Update: {
          competitor_prices?: Json | null
          confidence_level?: string | null
          created_at?: string
          created_by?: string | null
          direct_costs?: number | null
          id?: string
          indirect_costs?: number | null
          market_average_price?: number | null
          metadata?: Json | null
          opportunity_id?: string
          our_estimated_price?: number | null
          overhead_rate?: number | null
          price_justification?: string | null
          pricing_strategy?: string | null
          recommended_price?: number | null
          risk_assessment?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          target_margin_percent?: number | null
          updated_at?: string
          win_probability_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_analyses_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
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
      scraping_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          opportunities_found: number | null
          retry_count: number | null
          session_id: string
          source_name: string
          source_url: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          opportunities_found?: number | null
          retry_count?: number | null
          session_id: string
          source_name: string
          source_url: string
          started_at?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          opportunities_found?: number | null
          retry_count?: number | null
          session_id?: string
          source_name?: string
          source_url?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
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
      win_loss_history: {
        Row: {
          award_date: string | null
          competitor_intelligence: Json | null
          contract_value: number | null
          created_at: string
          final_gonogo_score: number | null
          final_ptw_recommended_price: number | null
          final_win_probability: number | null
          id: string
          key_loss_factors: string[] | null
          key_win_factors: string[] | null
          lessons_learned: string | null
          metadata: Json | null
          opportunity_id: string | null
          our_price: number | null
          outcome: string
          price_differential_percent: number | null
          sensitivity_level:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          winning_competitor: string | null
          winning_price: number | null
        }
        Insert: {
          award_date?: string | null
          competitor_intelligence?: Json | null
          contract_value?: number | null
          created_at?: string
          final_gonogo_score?: number | null
          final_ptw_recommended_price?: number | null
          final_win_probability?: number | null
          id?: string
          key_loss_factors?: string[] | null
          key_win_factors?: string[] | null
          lessons_learned?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          our_price?: number | null
          outcome: string
          price_differential_percent?: number | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          winning_competitor?: string | null
          winning_price?: number | null
        }
        Update: {
          award_date?: string | null
          competitor_intelligence?: Json | null
          contract_value?: number | null
          created_at?: string
          final_gonogo_score?: number | null
          final_ptw_recommended_price?: number | null
          final_win_probability?: number | null
          id?: string
          key_loss_factors?: string[] | null
          key_win_factors?: string[] | null
          lessons_learned?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          our_price?: number | null
          outcome?: string
          price_differential_percent?: number | null
          sensitivity_level?:
            | Database["public"]["Enums"]["data_sensitivity_level"]
            | null
          winning_competitor?: string | null
          winning_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "win_loss_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ml_training_data: {
        Row: {
          actual_our_price: number | null
          actual_value: number | null
          competitor_analysis_score: number | null
          competitors: Json | null
          contract_approach_score: number | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          estimated_value_max: number | null
          estimated_value_min: number | null
          geography_state: string | null
          gonogo_score: number | null
          id: string | null
          key_loss_factors: string[] | null
          key_win_factors: string[] | null
          market_average_price: number | null
          our_estimated_price: number | null
          outcome: string | null
          past_performance_score: number | null
          predicted_win_prob: number | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          reality_check_score: number | null
          recommendation: string | null
          roi_potential_score: number | null
          service_tags: Database["public"]["Enums"]["service_tag"][] | null
          strategic_fit_score: number | null
          strengths: string[] | null
          swot_opportunities: string[] | null
          target_margin_percent: number | null
          threats: string[] | null
          timeline_feasibility_score: number | null
          weaknesses: string[] | null
          winning_price: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_ml_training_data: {
        Args: never
        Returns: {
          actual_our_price: number
          actual_value: number
          competitor_analysis_score: number
          competitors: Json
          contract_approach_score: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          estimated_value_max: number
          estimated_value_min: number
          geography_state: string
          gonogo_score: number
          id: string
          key_loss_factors: string[]
          key_win_factors: string[]
          market_average_price: number
          our_estimated_price: number
          outcome: string
          past_performance_score: number
          predicted_win_prob: number
          priority: Database["public"]["Enums"]["priority_level"]
          reality_check_score: number
          recommendation: string
          roi_potential_score: number
          service_tags: Database["public"]["Enums"]["service_tag"][]
          strategic_fit_score: number
          strengths: string[]
          swot_opportunities: string[]
          target_margin_percent: number
          threats: string[]
          timeline_feasibility_score: number
          weaknesses: string[]
          winning_price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_data_access: {
        Args: {
          _action: string
          _metadata?: Json
          _record_id: string
          _table_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
      content_block_type:
        | "past_performance"
        | "technical_approach"
        | "team_bio"
        | "executive_summary"
        | "management_approach"
        | "quality_control"
        | "staffing_plan"
        | "other"
      contract_type:
        | "RFP"
        | "RFQ"
        | "RFI"
        | "Sources Sought"
        | "Pre-solicitation"
        | "Sole-Source Notice"
      data_sensitivity_level: "public" | "internal" | "restricted"
      hot_flag_type: "manual" | "automatic"
      opportunity_lifecycle_stage:
        | "identified"
        | "bd_intel_deck"
        | "capture_plan"
        | "pre_drfp"
        | "drfp_kickoff"
        | "proposal_development"
        | "pink_team"
        | "red_team"
        | "gold_team"
        | "final_review"
        | "submitted"
        | "awaiting_award"
        | "won"
        | "lost"
        | "no_bid"
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
      content_block_type: [
        "past_performance",
        "technical_approach",
        "team_bio",
        "executive_summary",
        "management_approach",
        "quality_control",
        "staffing_plan",
        "other",
      ],
      contract_type: [
        "RFP",
        "RFQ",
        "RFI",
        "Sources Sought",
        "Pre-solicitation",
        "Sole-Source Notice",
      ],
      data_sensitivity_level: ["public", "internal", "restricted"],
      hot_flag_type: ["manual", "automatic"],
      opportunity_lifecycle_stage: [
        "identified",
        "bd_intel_deck",
        "capture_plan",
        "pre_drfp",
        "drfp_kickoff",
        "proposal_development",
        "pink_team",
        "red_team",
        "gold_team",
        "final_review",
        "submitted",
        "awaiting_award",
        "won",
        "lost",
        "no_bid",
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
