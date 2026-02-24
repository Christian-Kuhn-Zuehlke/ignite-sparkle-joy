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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abc_analysis_runs: {
        Row: {
          a_class_count: number | null
          a_class_revenue_share: number | null
          a_threshold_percent: number | null
          ai_summary: string | null
          analysis_period_days: number
          analysis_type: string
          b_class_count: number | null
          b_class_revenue_share: number | null
          b_threshold_percent: number | null
          c_class_count: number | null
          c_class_revenue_share: number | null
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          key_insights: Json | null
          started_at: string
          status: string
          total_revenue_analyzed: number | null
          total_skus_analyzed: number | null
        }
        Insert: {
          a_class_count?: number | null
          a_class_revenue_share?: number | null
          a_threshold_percent?: number | null
          ai_summary?: string | null
          analysis_period_days?: number
          analysis_type?: string
          b_class_count?: number | null
          b_class_revenue_share?: number | null
          b_threshold_percent?: number | null
          c_class_count?: number | null
          c_class_revenue_share?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          key_insights?: Json | null
          started_at?: string
          status?: string
          total_revenue_analyzed?: number | null
          total_skus_analyzed?: number | null
        }
        Update: {
          a_class_count?: number | null
          a_class_revenue_share?: number | null
          a_threshold_percent?: number | null
          ai_summary?: string | null
          analysis_period_days?: number
          analysis_type?: string
          b_class_count?: number | null
          b_class_revenue_share?: number | null
          b_threshold_percent?: number | null
          c_class_count?: number | null
          c_class_revenue_share?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          key_insights?: Json | null
          started_at?: string
          status?: string
          total_revenue_analyzed?: number | null
          total_skus_analyzed?: number | null
        }
        Relationships: []
      }
      abc_classifications: {
        Row: {
          abc_class: string
          analysis_date: string
          avg_days_in_warehouse: number | null
          class_changed_at: string | null
          company_id: string
          created_at: string
          current_stock: number | null
          days_of_stock: number | null
          id: string
          order_count: number | null
          overstock_risk_score: number | null
          pick_pack_cost_per_unit: number | null
          previous_abc_class: string | null
          product_name: string | null
          return_cost_total: number | null
          return_rate_percent: number | null
          revenue_share_percent: number | null
          sku: string
          stockout_risk_score: number | null
          storage_cost_monthly: number | null
          total_revenue: number | null
          trending_direction: string | null
          units_sold: number | null
          updated_at: string
        }
        Insert: {
          abc_class: string
          analysis_date?: string
          avg_days_in_warehouse?: number | null
          class_changed_at?: string | null
          company_id: string
          created_at?: string
          current_stock?: number | null
          days_of_stock?: number | null
          id?: string
          order_count?: number | null
          overstock_risk_score?: number | null
          pick_pack_cost_per_unit?: number | null
          previous_abc_class?: string | null
          product_name?: string | null
          return_cost_total?: number | null
          return_rate_percent?: number | null
          revenue_share_percent?: number | null
          sku: string
          stockout_risk_score?: number | null
          storage_cost_monthly?: number | null
          total_revenue?: number | null
          trending_direction?: string | null
          units_sold?: number | null
          updated_at?: string
        }
        Update: {
          abc_class?: string
          analysis_date?: string
          avg_days_in_warehouse?: number | null
          class_changed_at?: string | null
          company_id?: string
          created_at?: string
          current_stock?: number | null
          days_of_stock?: number | null
          id?: string
          order_count?: number | null
          overstock_risk_score?: number | null
          pick_pack_cost_per_unit?: number | null
          previous_abc_class?: string | null
          product_name?: string | null
          return_cost_total?: number | null
          return_rate_percent?: number | null
          revenue_share_percent?: number | null
          sku?: string
          stockout_risk_score?: number | null
          storage_cost_monthly?: number | null
          total_revenue?: number | null
          trending_direction?: string | null
          units_sold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      abc_recommendations: {
        Row: {
          action_notes: string | null
          actioned_at: string | null
          actioned_by: string | null
          classification_id: string | null
          company_id: string
          confidence_score: number | null
          created_at: string
          description: string
          estimated_impact_type: string | null
          estimated_impact_value: number | null
          id: string
          key_metrics: Json | null
          priority: string
          reasoning: string | null
          recommendation_type: string
          sku: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_notes?: string | null
          actioned_at?: string | null
          actioned_by?: string | null
          classification_id?: string | null
          company_id: string
          confidence_score?: number | null
          created_at?: string
          description: string
          estimated_impact_type?: string | null
          estimated_impact_value?: number | null
          id?: string
          key_metrics?: Json | null
          priority: string
          reasoning?: string | null
          recommendation_type: string
          sku: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_notes?: string | null
          actioned_at?: string | null
          actioned_by?: string | null
          classification_id?: string | null
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          estimated_impact_type?: string | null
          estimated_impact_value?: number | null
          id?: string
          key_metrics?: Json | null
          priority?: string
          reasoning?: string | null
          recommendation_type?: string
          sku?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abc_recommendations_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "abc_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          company_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: Database["public"]["Enums"]["audit_resource"]
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          company_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: Database["public"]["Enums"]["audit_resource"]
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          company_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: Database["public"]["Enums"]["audit_resource"]
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          planned_items: number
          planned_orders: number
          planned_revenue: number | null
          planned_shipments: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type: string
          planned_items?: number
          planned_orders?: number
          planned_revenue?: number | null
          planned_shipments?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          planned_items?: number
          planned_orders?: number
          planned_revenue?: number | null
          planned_shipments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      celebration_settings: {
        Row: {
          company_id: string
          confetti_enabled: boolean
          created_at: string
          id: string
          orders_today_threshold: number
          perfect_day_enabled: boolean
          shipments_threshold: number
          show_achievement_toast: boolean
          sla_streak_threshold: number
          updated_at: string
        }
        Insert: {
          company_id: string
          confetti_enabled?: boolean
          created_at?: string
          id?: string
          orders_today_threshold?: number
          perfect_day_enabled?: boolean
          shipments_threshold?: number
          show_achievement_toast?: boolean
          sla_streak_threshold?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          confetti_enabled?: boolean
          created_at?: string
          id?: string
          orders_today_threshold?: number
          perfect_day_enabled?: boolean
          shipments_threshold?: number
          show_achievement_toast?: boolean
          sla_streak_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebration_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clarification_cases: {
        Row: {
          actual_value: number | null
          ai_confidence_score: number | null
          ai_explanation: string | null
          case_type: string
          company_id: string
          created_at: string
          description: string | null
          detected_at: string
          discrepancy_value: number | null
          expected_value: number | null
          id: string
          metadata: Json | null
          recommended_action: string | null
          related_order_id: string | null
          related_po_id: string | null
          related_return_id: string | null
          related_sku: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          ai_confidence_score?: number | null
          ai_explanation?: string | null
          case_type: string
          company_id: string
          created_at?: string
          description?: string | null
          detected_at?: string
          discrepancy_value?: number | null
          expected_value?: number | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          related_order_id?: string | null
          related_po_id?: string | null
          related_return_id?: string | null
          related_sku?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          ai_confidence_score?: number | null
          ai_explanation?: string | null
          case_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          discrepancy_value?: number | null
          expected_value?: number | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          related_order_id?: string | null
          related_po_id?: string | null
          related_return_id?: string | null
          related_sku?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          accent_color: string | null
          brand_keywords: string[] | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string
          default_language: string | null
          domain: string | null
          go_live_date: string | null
          hubspot_company_id: string | null
          id: string
          industry: string | null
          logo_url: string | null
          ms_client_id: string | null
          ms_client_token: string | null
          name: string
          notes: string | null
          onboarding_completed_at: string | null
          onboarding_completed_steps: Json | null
          onboarding_started_at: string | null
          primary_color: string | null
          status: Database["public"]["Enums"]["company_status"] | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_keywords?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string
          default_language?: string | null
          domain?: string | null
          go_live_date?: string | null
          hubspot_company_id?: string | null
          id: string
          industry?: string | null
          logo_url?: string | null
          ms_client_id?: string | null
          ms_client_token?: string | null
          name: string
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_completed_steps?: Json | null
          onboarding_started_at?: string | null
          primary_color?: string | null
          status?: Database["public"]["Enums"]["company_status"] | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_keywords?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string
          default_language?: string | null
          domain?: string | null
          go_live_date?: string | null
          hubspot_company_id?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          ms_client_id?: string | null
          ms_client_token?: string | null
          name?: string
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_completed_steps?: Json | null
          onboarding_started_at?: string | null
          primary_color?: string | null
          status?: Database["public"]["Enums"]["company_status"] | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_kpis: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          name: string
          target_value: number
          unit: Database["public"]["Enums"]["kpi_unit"]
          updated_at: string
          warning_threshold: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          name: string
          target_value: number
          unit?: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
          warning_threshold?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kpi_type?: Database["public"]["Enums"]["kpi_type"]
          name?: string
          target_value?: number
          unit?: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_assignments: {
        Row: {
          company_id: string
          created_at: string
          csm_user_id: string
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          csm_user_id: string
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          csm_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csm_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string
          factors: Json | null
          forecast_date: string
          forecast_type: string
          forecasted_quantity: number | null
          forecasted_value: number | null
          id: string
          lower_bound: number | null
          product_name: string | null
          sku: string
          upper_bound: number | null
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string
          factors?: Json | null
          forecast_date: string
          forecast_type: string
          forecasted_quantity?: number | null
          forecasted_value?: number | null
          id?: string
          lower_bound?: number | null
          product_name?: string | null
          sku: string
          upper_bound?: number | null
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          factors?: Json | null
          forecast_date?: string
          forecast_type?: string
          forecasted_quantity?: number | null
          forecasted_value?: number | null
          id?: string
          lower_bound?: number | null
          product_name?: string | null
          sku?: string
          upper_bound?: number | null
        }
        Relationships: []
      }
      discrepancies: {
        Row: {
          actual_qty: number | null
          company_id: string
          created_at: string
          expected_qty: number | null
          id: string
          notes: string | null
          po_line_id: string | null
          resolution: Database["public"]["Enums"]["discrepancy_resolution"]
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          severity: Database["public"]["Enums"]["discrepancy_severity"]
          sku: string | null
          type: Database["public"]["Enums"]["discrepancy_type"]
          updated_at: string
        }
        Insert: {
          actual_qty?: number | null
          company_id: string
          created_at?: string
          expected_qty?: number | null
          id?: string
          notes?: string | null
          po_line_id?: string | null
          resolution?: Database["public"]["Enums"]["discrepancy_resolution"]
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          severity?: Database["public"]["Enums"]["discrepancy_severity"]
          sku?: string | null
          type: Database["public"]["Enums"]["discrepancy_type"]
          updated_at?: string
        }
        Update: {
          actual_qty?: number | null
          company_id?: string
          created_at?: string
          expected_qty?: number | null
          id?: string
          notes?: string | null
          po_line_id?: string | null
          resolution?: Database["public"]["Enums"]["discrepancy_resolution"]
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          severity?: Database["public"]["Enums"]["discrepancy_severity"]
          sku?: string | null
          type?: Database["public"]["Enums"]["discrepancy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discrepancies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discrepancies_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discrepancies_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "receiving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_toggles: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_toggles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          company_id: string
          confidence_level: number | null
          created_at: string
          created_by: string | null
          forecasted_items: number
          forecasted_orders: number
          forecasted_revenue: number | null
          forecasted_shipments: number
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          confidence_level?: number | null
          created_at?: string
          created_by?: string | null
          forecasted_items?: number
          forecasted_orders?: number
          forecasted_revenue?: number | null
          forecasted_shipments?: number
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          confidence_level?: number | null
          created_at?: string
          created_by?: string | null
          forecasted_items?: number
          forecasted_orders?: number
          forecasted_revenue?: number | null
          forecasted_shipments?: number
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_snapshots: {
        Row: {
          avg_oph: number | null
          avg_uph: number | null
          company_id: string
          created_at: string
          id: string
          period_type: string
          quality_index: number | null
          sla_fulfillment_percent: number | null
          snapshot_date: string
          total_items: number
          total_orders: number
          total_revenue: number | null
          total_shipments: number
        }
        Insert: {
          avg_oph?: number | null
          avg_uph?: number | null
          company_id: string
          created_at?: string
          id?: string
          period_type: string
          quality_index?: number | null
          sla_fulfillment_percent?: number | null
          snapshot_date: string
          total_items?: number
          total_orders?: number
          total_revenue?: number | null
          total_shipments?: number
        }
        Update: {
          avg_oph?: number | null
          avg_uph?: number | null
          company_id?: string
          created_at?: string
          id?: string
          period_type?: string
          quality_index?: number | null
          sla_fulfillment_percent?: number | null
          snapshot_date?: string
          total_items?: number
          total_orders?: number
          total_revenue?: number | null
          total_shipments?: number
        }
        Relationships: [
          {
            foreignKeyName: "historical_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          data_type: string
          details: Json | null
          error_message: string | null
          failed_records: number | null
          file_size: number | null
          filename: string
          id: string
          imported_records: number | null
          started_at: string
          status: string
          total_records: number | null
          updated_records: number | null
          user_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          data_type: string
          details?: Json | null
          error_message?: string | null
          failed_records?: number | null
          file_size?: number | null
          filename: string
          id?: string
          imported_records?: number | null
          started_at?: string
          status?: string
          total_records?: number | null
          updated_records?: number | null
          user_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          data_type?: string
          details?: Json | null
          error_message?: string | null
          failed_records?: number | null
          file_size?: number | null
          filename?: string
          id?: string
          imported_records?: number | null
          started_at?: string
          status?: string
          total_records?: number | null
          updated_records?: number | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_status: string | null
          name: string
          type: Database["public"]["Enums"]["integration_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          name: string
          type: Database["public"]["Enums"]["integration_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          type?: Database["public"]["Enums"]["integration_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available: number | null
          company_id: string
          created_at: string
          id: string
          low_stock_threshold: number | null
          name: string
          on_hand: number
          reserved: number
          sku: string
          source_system: string | null
          updated_at: string
        }
        Insert: {
          available?: number | null
          company_id: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          name: string
          on_hand?: number
          reserved?: number
          sku: string
          source_system?: string | null
          updated_at?: string
        }
        Update: {
          available?: number | null
          company_id?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          name?: string
          on_hand?: number
          reserved?: number
          sku?: string
          source_system?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kpi_measurements: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          id: string
          kpi_id: string
          measured_value: number
          period_end: string
          period_start: string
          success_count: number | null
          total_count: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          details?: Json | null
          id?: string
          kpi_id: string
          measured_value: number
          period_end: string
          period_start: string
          success_count?: number | null
          total_count?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          kpi_id?: string
          measured_value?: number
          period_end?: string
          period_start?: string
          success_count?: number | null
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_measurements_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "company_kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          company_id: string
          created_at: string
          email_enabled: boolean | null
          id: string
          notification_email: string | null
          notify_low_stock: boolean | null
          notify_order_created: boolean | null
          notify_order_delivered: boolean | null
          notify_order_shipped: boolean | null
          notify_returns: boolean | null
          notify_sla_warning: boolean | null
          push_enabled: boolean | null
          push_subscription: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notification_email?: string | null
          notify_low_stock?: boolean | null
          notify_order_created?: boolean | null
          notify_order_delivered?: boolean | null
          notify_order_shipped?: boolean | null
          notify_returns?: boolean | null
          notify_sla_warning?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notification_email?: string | null
          notify_low_stock?: boolean | null
          notify_order_created?: boolean | null
          notify_order_delivered?: boolean | null
          notify_order_shipped?: boolean | null
          notify_returns?: boolean | null
          notify_sla_warning?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          event_type: string
          id: string
          metadata: Json | null
          new_status: string | null
          occurred_at: string
          old_status: string | null
          order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          occurred_at?: string
          old_status?: string | null
          order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          occurred_at?: string
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          cost_price: number | null
          created_at: string
          id: string
          name: string
          order_id: string
          price: number | null
          quantity: number
          sku: string
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          id?: string
          name: string
          order_id: string
          price?: number | null
          quantity?: number
          sku: string
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          price?: number | null
          quantity?: number
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          order_id: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          order_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          order_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string
          company_name: string
          created_at: string
          customer_no: string | null
          external_document_no: string | null
          id: string
          order_amount: number | null
          order_date: string
          posted_invoice_date: string | null
          posted_shipment_date: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_name: string
          ship_to_postcode: string | null
          shipping_agent_code: string | null
          source_no: string
          source_system: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_date: string | null
          tracking_code: string | null
          tracking_link: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          customer_no?: string | null
          external_document_no?: string | null
          id?: string
          order_amount?: number | null
          order_date?: string
          posted_invoice_date?: string | null
          posted_shipment_date?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name: string
          ship_to_postcode?: string | null
          shipping_agent_code?: string | null
          source_no: string
          source_system?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_date?: string | null
          tracking_code?: string | null
          tracking_link?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          customer_no?: string | null
          external_document_no?: string | null
          id?: string
          order_amount?: number | null
          order_date?: string
          posted_invoice_date?: string | null
          posted_shipment_date?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string
          ship_to_postcode?: string | null
          shipping_agent_code?: string | null
          source_no?: string
          source_system?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_date?: string | null
          tracking_code?: string | null
          tracking_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      packaging_metrics: {
        Row: {
          anomaly_count: number | null
          avg_fill_rate_percent: number | null
          company_id: string
          created_at: string
          id: string
          metric_date: string
          overpackaged_count: number | null
          potential_savings_cents: number | null
          total_co2_grams: number | null
          total_packaging_cost_cents: number | null
          total_shipments: number | null
          total_shipping_cost_cents: number | null
          underpackaged_count: number | null
        }
        Insert: {
          anomaly_count?: number | null
          avg_fill_rate_percent?: number | null
          company_id: string
          created_at?: string
          id?: string
          metric_date?: string
          overpackaged_count?: number | null
          potential_savings_cents?: number | null
          total_co2_grams?: number | null
          total_packaging_cost_cents?: number | null
          total_shipments?: number | null
          total_shipping_cost_cents?: number | null
          underpackaged_count?: number | null
        }
        Update: {
          anomaly_count?: number | null
          avg_fill_rate_percent?: number | null
          company_id?: string
          created_at?: string
          id?: string
          metric_date?: string
          overpackaged_count?: number | null
          potential_savings_cents?: number | null
          total_co2_grams?: number | null
          total_packaging_cost_cents?: number | null
          total_shipments?: number | null
          total_shipping_cost_cents?: number | null
          underpackaged_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_recommendations: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string
          current_packaging_code: string | null
          estimated_co2_savings_g: number | null
          estimated_savings_cents: number | null
          id: string
          implemented_at: string | null
          is_implemented: boolean | null
          reason: string | null
          recommendation_type: string
          recommended_packaging_code: string | null
          sample_size: number | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string
          current_packaging_code?: string | null
          estimated_co2_savings_g?: number | null
          estimated_savings_cents?: number | null
          id?: string
          implemented_at?: string | null
          is_implemented?: boolean | null
          reason?: string | null
          recommendation_type: string
          recommended_packaging_code?: string | null
          sample_size?: number | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          current_packaging_code?: string | null
          estimated_co2_savings_g?: number | null
          estimated_savings_cents?: number | null
          id?: string
          implemented_at?: string | null
          is_implemented?: boolean | null
          reason?: string | null
          recommendation_type?: string
          recommended_packaging_code?: string | null
          sample_size?: number | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_recommendations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_records: {
        Row: {
          actual_weight_g: number | null
          carrier_code: string | null
          carrier_service: string | null
          company_id: string
          created_at: string
          declared_weight_g: number | null
          fill_rate_percent: number | null
          id: string
          is_overpackaged: boolean | null
          is_underpackaged: boolean | null
          order_id: string
          packaging_code: string | null
          packaging_type_id: string | null
          shipping_cost_cents: number | null
          shipping_zone: string | null
        }
        Insert: {
          actual_weight_g?: number | null
          carrier_code?: string | null
          carrier_service?: string | null
          company_id: string
          created_at?: string
          declared_weight_g?: number | null
          fill_rate_percent?: number | null
          id?: string
          is_overpackaged?: boolean | null
          is_underpackaged?: boolean | null
          order_id: string
          packaging_code?: string | null
          packaging_type_id?: string | null
          shipping_cost_cents?: number | null
          shipping_zone?: string | null
        }
        Update: {
          actual_weight_g?: number | null
          carrier_code?: string | null
          carrier_service?: string | null
          company_id?: string
          created_at?: string
          declared_weight_g?: number | null
          fill_rate_percent?: number | null
          id?: string
          is_overpackaged?: boolean | null
          is_underpackaged?: boolean | null
          order_id?: string
          packaging_code?: string | null
          packaging_type_id?: string | null
          shipping_cost_cents?: number | null
          shipping_zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "packaging_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_records_packaging_type_id_fkey"
            columns: ["packaging_type_id"]
            isOneToOne: false
            referencedRelation: "packaging_types"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_types: {
        Row: {
          co2_grams: number | null
          code: string
          company_id: string
          cost_cents: number | null
          created_at: string
          height_cm: number | null
          id: string
          is_active: boolean | null
          is_eco_friendly: boolean | null
          length_cm: number | null
          name: string
          updated_at: string
          volume_cm3: number | null
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          co2_grams?: number | null
          code: string
          company_id: string
          cost_cents?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          is_eco_friendly?: boolean | null
          length_cm?: number | null
          name: string
          updated_at?: string
          volume_cm3?: number | null
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          co2_grams?: number | null
          code?: string
          company_id?: string
          cost_cents?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          is_eco_friendly?: boolean | null
          length_cm?: number | null
          name?: string
          updated_at?: string
          volume_cm3?: number | null
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      po_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          po_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          po_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          po_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_attachments_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_metrics: {
        Row: {
          backlog_orders: number | null
          company_id: string
          created_at: string
          id: string
          orders_per_fte: number | null
          orders_per_hour: number | null
          pack_throughput: number | null
          recorded_at: string
          units_per_hour: number | null
        }
        Insert: {
          backlog_orders?: number | null
          company_id: string
          created_at?: string
          id?: string
          orders_per_fte?: number | null
          orders_per_hour?: number | null
          pack_throughput?: number | null
          recorded_at?: string
          units_per_hour?: number | null
        }
        Update: {
          backlog_orders?: number | null
          company_id?: string
          created_at?: string
          id?: string
          orders_per_fte?: number | null
          orders_per_hour?: number | null
          pack_throughput?: number | null
          recorded_at?: string
          units_per_hour?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productivity_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          preferred_language: string | null
          requested_company_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          preferred_language?: string | null
          requested_company_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          preferred_language?: string | null
          requested_company_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          gtin: string | null
          id: string
          line_number: number | null
          notes: string | null
          po_id: string
          product_name: string | null
          qty_expected: number
          qty_received: number
          sku: string
          uom: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gtin?: string | null
          id?: string
          line_number?: number | null
          notes?: string | null
          po_id: string
          product_name?: string | null
          qty_expected?: number
          qty_received?: number
          sku: string
          uom?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gtin?: string | null
          id?: string
          line_number?: number | null
          notes?: string | null
          po_id?: string
          product_name?: string | null
          qty_expected?: number
          qty_received?: number
          sku?: string
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          arrival_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          eta: string | null
          id: string
          location: string | null
          notes: string | null
          po_number: string
          source: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_code: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          arrival_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          eta?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          po_number: string
          source?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_code?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          arrival_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          eta?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          po_number?: string
          source?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_code?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_errors: {
        Row: {
          company_id: string
          corrective_action: string | null
          cost_impact: number | null
          created_at: string
          description: string | null
          detected_at: string
          detected_by: string | null
          error_type: Database["public"]["Enums"]["quality_error_type"]
          id: string
          metadata: Json | null
          order_id: string | null
          product_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          return_id: string | null
          root_cause: string | null
          root_cause_category: string | null
          severity: string | null
          shift: string | null
          sku: string | null
          updated_at: string
          worker_id: string | null
          zone: string | null
        }
        Insert: {
          company_id: string
          corrective_action?: string | null
          cost_impact?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          detected_by?: string | null
          error_type: Database["public"]["Enums"]["quality_error_type"]
          id?: string
          metadata?: Json | null
          order_id?: string | null
          product_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_id?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          severity?: string | null
          shift?: string | null
          sku?: string | null
          updated_at?: string
          worker_id?: string | null
          zone?: string | null
        }
        Update: {
          company_id?: string
          corrective_action?: string | null
          cost_impact?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          detected_by?: string | null
          error_type?: Database["public"]["Enums"]["quality_error_type"]
          id?: string
          metadata?: Json | null
          order_id?: string | null
          product_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_id?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          severity?: string | null
          shift?: string | null
          sku?: string | null
          updated_at?: string
          worker_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_errors_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "quality_errors_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_errors_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_metrics: {
        Row: {
          company_id: string
          created_at: string
          error_rate: number | null
          id: string
          recorded_date: string
          return_rate: number | null
          rework_rate: number | null
          scanner_discipline_score: number | null
          short_picks: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error_rate?: number | null
          id?: string
          recorded_date?: string
          return_rate?: number | null
          rework_rate?: number | null
          scanner_discipline_score?: number | null
          short_picks?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error_rate?: number | null
          id?: string
          recorded_date?: string
          return_rate?: number | null
          rework_rate?: number | null
          scanner_discipline_score?: number | null
          short_picks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_scores: {
        Row: {
          accuracy_score: number | null
          by_error_type: Json | null
          by_shift: Json | null
          by_zone: Json | null
          company_id: string
          created_at: string
          damage_score: number | null
          error_rate: number | null
          id: string
          overall_score: number | null
          packaging_score: number | null
          score_date: string
          timeliness_score: number | null
          top_error_skus: Json | null
          total_errors: number | null
          total_orders: number | null
        }
        Insert: {
          accuracy_score?: number | null
          by_error_type?: Json | null
          by_shift?: Json | null
          by_zone?: Json | null
          company_id: string
          created_at?: string
          damage_score?: number | null
          error_rate?: number | null
          id?: string
          overall_score?: number | null
          packaging_score?: number | null
          score_date: string
          timeliness_score?: number | null
          top_error_skus?: Json | null
          total_errors?: number | null
          total_orders?: number | null
        }
        Update: {
          accuracy_score?: number | null
          by_error_type?: Json | null
          by_shift?: Json | null
          by_zone?: Json | null
          company_id?: string
          created_at?: string
          damage_score?: number | null
          error_rate?: number | null
          id?: string
          overall_score?: number | null
          packaging_score?: number | null
          score_date?: string
          timeliness_score?: number | null
          top_error_skus?: Json | null
          total_errors?: number | null
          total_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_counts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          po_line_id: string | null
          qty_received: number
          scanned_at: string
          scanned_by: string | null
          session_id: string
          sku: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          po_line_id?: string | null
          qty_received?: number
          scanned_at?: string
          scanned_by?: string | null
          session_id: string
          sku: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          po_line_id?: string | null
          qty_received?: number
          scanned_at?: string
          scanned_by?: string | null
          session_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_counts_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_counts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "receiving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_sessions: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          method: string | null
          notes: string | null
          po_id: string
          started_at: string
          started_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          po_id: string
          started_at?: string
          started_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          po_id?: string
          started_at?: string
          started_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_sessions_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      replenishment_suggestions: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          avg_daily_demand: number | null
          company_id: string
          created_at: string
          current_stock: number
          days_of_stock_remaining: number | null
          factors: Json | null
          id: string
          is_launch_product: boolean | null
          launch_date: string | null
          order_by_date: string
          priority: string
          product_name: string | null
          reasoning: string | null
          sku: string
          status: string
          stockout_date: string | null
          stockout_probability: number | null
          suggested_order_quantity: number
          updated_at: string
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          avg_daily_demand?: number | null
          company_id: string
          created_at?: string
          current_stock: number
          days_of_stock_remaining?: number | null
          factors?: Json | null
          id?: string
          is_launch_product?: boolean | null
          launch_date?: string | null
          order_by_date: string
          priority?: string
          product_name?: string | null
          reasoning?: string | null
          sku: string
          status?: string
          stockout_date?: string | null
          stockout_probability?: number | null
          suggested_order_quantity: number
          updated_at?: string
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          avg_daily_demand?: number | null
          company_id?: string
          created_at?: string
          current_stock?: number
          days_of_stock_remaining?: number | null
          factors?: Json | null
          id?: string
          is_launch_product?: boolean | null
          launch_date?: string | null
          order_by_date?: string
          priority?: string
          product_name?: string | null
          reasoning?: string | null
          sku?: string
          status?: string
          stockout_date?: string | null
          stockout_probability?: number | null
          suggested_order_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      return_lines: {
        Row: {
          created_at: string
          id: string
          name: string
          quantity: number
          return_id: string
          sku: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          quantity?: number
          return_id: string
          sku: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          return_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string
          id: string
          order_id: string | null
          reason: string | null
          return_date: string
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          return_date?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          return_date?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      root_cause_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "root_cause_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "root_cause_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_anomalies: {
        Row: {
          actual_value: string | null
          anomaly_type: string
          company_id: string
          created_at: string
          description: string | null
          expected_value: string | null
          id: string
          is_resolved: boolean | null
          order_id: string
          potential_savings_cents: number | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          actual_value?: string | null
          anomaly_type: string
          company_id: string
          created_at?: string
          description?: string | null
          expected_value?: string | null
          id?: string
          is_resolved?: boolean | null
          order_id: string
          potential_savings_cents?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Update: {
          actual_value?: string | null
          anomaly_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          expected_value?: string | null
          id?: string
          is_resolved?: boolean | null
          order_id?: string
          potential_savings_cents?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_anomalies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_sla_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "shipping_anomalies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stockout_alerts: {
        Row: {
          abc_class: string | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_severity: string
          avg_daily_demand: number | null
          company_id: string
          created_at: string
          current_stock: number
          days_until_stockout: number | null
          estimated_revenue_at_risk: number | null
          id: string
          product_name: string | null
          sku: string
          status: string
          stockout_probability: number | null
        }
        Insert: {
          abc_class?: string | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_severity?: string
          avg_daily_demand?: number | null
          company_id: string
          created_at?: string
          current_stock: number
          days_until_stockout?: number | null
          estimated_revenue_at_risk?: number | null
          id?: string
          product_name?: string | null
          sku: string
          status?: string
          stockout_probability?: number | null
        }
        Update: {
          abc_class?: string | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_severity?: string
          avg_daily_demand?: number | null
          company_id?: string
          created_at?: string
          current_stock?: number
          days_until_stockout?: number | null
          estimated_revenue_at_risk?: number | null
          id?: string
          product_name?: string | null
          sku?: string
          status?: string
          stockout_probability?: number | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_messages: string[] | null
          id: string
          inventory_errors: number | null
          inventory_imported: number | null
          inventory_updated: number | null
          orders_errors: number | null
          orders_imported: number | null
          orders_updated: number | null
          status: string
          sync_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_messages?: string[] | null
          id?: string
          inventory_errors?: number | null
          inventory_imported?: number | null
          inventory_updated?: number | null
          orders_errors?: number | null
          orders_imported?: number | null
          orders_updated?: number | null
          status?: string
          sync_type?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_messages?: string[] | null
          id?: string
          inventory_errors?: number | null
          inventory_imported?: number | null
          inventory_updated?: number | null
          orders_errors?: number | null
          orders_imported?: number | null
          orders_updated?: number | null
          status?: string
          sync_type?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhooks: {
        Row: {
          company_id: string
          created_at: string
          events: Database["public"]["Enums"]["webhook_event"][]
          id: string
          is_active: boolean
          last_status_code: number | null
          last_triggered_at: string | null
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          events?: Database["public"]["Enums"]["webhook_event"][]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          events?: Database["public"]["Enums"]["webhook_event"][]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_sla_status: {
        Row: {
          company_id: string | null
          created_at: string | null
          order_id: string | null
          processing_hours: number | null
          sla_status: string | null
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_order_events: { Args: never; Returns: number }
      count_orders_in_period: {
        Args: {
          p_company_id?: string
          p_from_date: string
          p_status?: string[]
          p_to_date: string
        }
        Returns: number
      }
      create_audit_log: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_company_id?: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: Database["public"]["Enums"]["audit_resource"]
        }
        Returns: string
      }
      get_abc_sku_aggregates: {
        Args: { p_company_id: string; p_period_start: string }
        Returns: {
          order_count: number
          sku: string
          total_revenue: number
          units_sold: number
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_primary_company: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_csm_assigned: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_membership_approved: { Args: { _user_id: string }; Returns: boolean }
      refresh_order_sla_status: { Args: never; Returns: undefined }
      restore_user_account: { Args: { p_user_id: string }; Returns: boolean }
      search_companies_fuzzy: {
        Args: { search_term: string }
        Returns: {
          id: string
          name: string
          similarity_score: number
        }[]
      }
      soft_delete_user_account: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "viewer"
        | "admin"
        | "msd_csm"
        | "msd_ma"
        | "system_admin"
        | "msd_ops"
        | "msd_management"
      audit_action:
        | "login"
        | "logout"
        | "view"
        | "create"
        | "update"
        | "delete"
        | "export"
        | "import"
        | "approve"
        | "reject"
        | "status_change"
      audit_resource:
        | "order"
        | "inventory"
        | "return"
        | "user"
        | "membership"
        | "company"
        | "settings"
        | "api_key"
        | "webhook"
        | "integration"
        | "kpi"
      company_status: "pending" | "onboarding" | "live" | "paused" | "churned"
      discrepancy_resolution:
        | "pending"
        | "accepted"
        | "rejected"
        | "returned_to_supplier"
        | "adjusted"
        | "escalated"
      discrepancy_severity: "low" | "medium" | "high" | "critical"
      discrepancy_type:
        | "over_quantity"
        | "under_quantity"
        | "unknown_sku"
        | "damaged"
        | "missing_docs"
        | "wrong_item"
        | "quality_issue"
      integration_type:
        | "business_central"
        | "woocommerce"
        | "shopify"
        | "dhl"
        | "post_ch"
        | "custom"
      kpi_type: "delivery_time_sla" | "processing_time" | "dock_to_stock"
      kpi_unit: "percent" | "hours" | "days"
      membership_status: "pending" | "approved" | "rejected"
      order_status:
        | "received"
        | "putaway"
        | "picking"
        | "packing"
        | "ready_to_ship"
        | "shipped"
        | "delivered"
      po_status:
        | "draft"
        | "submitted"
        | "confirmed"
        | "in_transit"
        | "arrived"
        | "receiving"
        | "received"
        | "completed"
        | "cancelled"
      quality_error_type:
        | "wrong_item"
        | "missing_item"
        | "damaged"
        | "wrong_quantity"
        | "packaging_error"
        | "labeling_error"
        | "shipping_error"
        | "other"
      return_status:
        | "initiated"
        | "in_transit"
        | "received"
        | "processing"
        | "completed"
      webhook_event:
        | "order_created"
        | "order_updated"
        | "order_shipped"
        | "return_created"
        | "return_updated"
        | "inventory_low"
        | "inventory_updated"
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
      app_role: [
        "viewer",
        "admin",
        "msd_csm",
        "msd_ma",
        "system_admin",
        "msd_ops",
        "msd_management",
      ],
      audit_action: [
        "login",
        "logout",
        "view",
        "create",
        "update",
        "delete",
        "export",
        "import",
        "approve",
        "reject",
        "status_change",
      ],
      audit_resource: [
        "order",
        "inventory",
        "return",
        "user",
        "membership",
        "company",
        "settings",
        "api_key",
        "webhook",
        "integration",
        "kpi",
      ],
      company_status: ["pending", "onboarding", "live", "paused", "churned"],
      discrepancy_resolution: [
        "pending",
        "accepted",
        "rejected",
        "returned_to_supplier",
        "adjusted",
        "escalated",
      ],
      discrepancy_severity: ["low", "medium", "high", "critical"],
      discrepancy_type: [
        "over_quantity",
        "under_quantity",
        "unknown_sku",
        "damaged",
        "missing_docs",
        "wrong_item",
        "quality_issue",
      ],
      integration_type: [
        "business_central",
        "woocommerce",
        "shopify",
        "dhl",
        "post_ch",
        "custom",
      ],
      kpi_type: ["delivery_time_sla", "processing_time", "dock_to_stock"],
      kpi_unit: ["percent", "hours", "days"],
      membership_status: ["pending", "approved", "rejected"],
      order_status: [
        "received",
        "putaway",
        "picking",
        "packing",
        "ready_to_ship",
        "shipped",
        "delivered",
      ],
      po_status: [
        "draft",
        "submitted",
        "confirmed",
        "in_transit",
        "arrived",
        "receiving",
        "received",
        "completed",
        "cancelled",
      ],
      quality_error_type: [
        "wrong_item",
        "missing_item",
        "damaged",
        "wrong_quantity",
        "packaging_error",
        "labeling_error",
        "shipping_error",
        "other",
      ],
      return_status: [
        "initiated",
        "in_transit",
        "received",
        "processing",
        "completed",
      ],
      webhook_event: [
        "order_created",
        "order_updated",
        "order_shipped",
        "return_created",
        "return_updated",
        "inventory_low",
        "inventory_updated",
      ],
    },
  },
} as const
