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
      abc_classifications: {
        Row: {
          calculated_at: string | null
          classification: string
          company_id: string | null
          created_at: string
          id: string
          order_count: number | null
          revenue: number | null
          sku: string
        }
        Insert: {
          calculated_at?: string | null
          classification?: string
          company_id?: string | null
          created_at?: string
          id?: string
          order_count?: number | null
          revenue?: number | null
          sku: string
        }
        Update: {
          calculated_at?: string | null
          classification?: string
          company_id?: string | null
          created_at?: string
          id?: string
          order_count?: number | null
          revenue?: number | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "abc_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string | null
          last_used_at: string | null
          name: string
          permissions: string[] | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix?: string | null
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string | null
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
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
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clarification_cases: {
        Row: {
          assigned_to: string | null
          case_type: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_type: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_type?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarification_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string | null
          created_at: string
          default_language: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          default_language?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          default_language?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_kpis: {
        Row: {
          company_id: string | null
          created_at: string
          current_value: number | null
          id: string
          is_active: boolean | null
          kpi_type: string
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_active?: boolean | null
          kpi_type: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_active?: boolean | null
          kpi_type?: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string
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
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
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
      email_report_settings: {
        Row: {
          company_id: string | null
          created_at: string
          frequency: string | null
          id: string
          is_enabled: boolean | null
          recipients: string[] | null
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          recipients?: string[] | null
          report_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          recipients?: string[] | null
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_report_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_toggles: {
        Row: {
          company_id: string | null
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
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
      integration_configs: {
        Row: {
          company_id: string | null
          config: Json | null
          created_at: string
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_company_id_fkey"
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
          category: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          low_stock_threshold: number | null
          name: string | null
          on_hand: number | null
          reserved: number | null
          sku: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          available?: number | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          name?: string | null
          on_hand?: number | null
          reserved?: number | null
          sku: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          available?: number | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          name?: string | null
          on_hand?: number | null
          reserved?: number | null
          sku?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          user_id?: string | null
        }
        Relationships: [
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
          created_at: string
          id: string
          name: string | null
          order_id: string
          quantity: number | null
          sku: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          order_id: string
          quantity?: number | null
          sku?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          order_id?: string
          quantity?: number | null
          sku?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
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
          is_internal: boolean | null
          order_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          order_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          order_id?: string
          user_id?: string | null
        }
        Relationships: [
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
          carrier: string | null
          company_id: string | null
          created_at: string
          currency: string | null
          customer_name: string | null
          external_id: string | null
          id: string
          notes: string | null
          order_amount: number | null
          order_date: string | null
          posted_shipment_date: string | null
          priority: string | null
          requested_delivery_date: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_name: string | null
          ship_to_post_code: string | null
          source: string | null
          source_no: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_date: string | null
          tags: string[] | null
          tracking_no: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          order_amount?: number | null
          order_date?: string | null
          posted_shipment_date?: string | null
          priority?: string | null
          requested_delivery_date?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_post_code?: string | null
          source?: string | null
          source_no?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_date?: string | null
          tags?: string[] | null
          tracking_no?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          order_amount?: number | null
          order_date?: string | null
          posted_shipment_date?: string | null
          priority?: string | null
          requested_delivery_date?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_post_code?: string | null
          source?: string | null
          source_no?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_date?: string | null
          tags?: string[] | null
          tracking_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      po_lines: {
        Row: {
          created_at: string
          id: string
          name: string | null
          purchase_order_id: string
          quantity_ordered: number | null
          quantity_received: number | null
          sku: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          purchase_order_id: string
          quantity_ordered?: number | null
          quantity_received?: number | null
          sku?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          purchase_order_id?: string
          quantity_ordered?: number | null
          quantity_received?: number | null
          sku?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "po_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          deleted_at: string | null
          deletion_reason: string | null
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          is_deleted: boolean | null
          requested_company_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          is_deleted?: boolean | null
          requested_company_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          is_deleted?: boolean | null
          requested_company_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_name?: string | null
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
          company_id: string | null
          created_at: string
          description: string | null
          error_type: string
          id: string
          order_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string | null
          shift: string | null
          sku: string | null
          zone: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          error_type: string
          id?: string
          order_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
          shift?: string | null
          sku?: string | null
          zone?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          error_type?: string
          id?: string
          order_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
          shift?: string | null
          sku?: string | null
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      return_lines: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          name: string | null
          quantity: number | null
          reason: string | null
          return_id: string
          sku: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          name?: string | null
          quantity?: number | null
          reason?: string | null
          return_id: string
          sku?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          name?: string | null
          quantity?: number | null
          reason?: string | null
          return_id?: string
          sku?: string | null
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
          company_id: string | null
          created_at: string
          customer_name: string | null
          id: string
          notes: string | null
          order_id: string | null
          reason: string | null
          return_date: string | null
          source_no: string | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          return_date?: string | null
          source_no?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          return_date?: string | null
          source_no?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
      sla_results: {
        Row: {
          company_id: string | null
          compliance_rate: number | null
          compliant_count: number | null
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          rule_id: string | null
          total_count: number | null
        }
        Insert: {
          company_id?: string | null
          compliance_rate?: number | null
          compliant_count?: number | null
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          rule_id?: string | null
          total_count?: number | null
        }
        Update: {
          company_id?: string | null
          compliance_rate?: number | null
          compliant_count?: number | null
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          rule_id?: string | null
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "sla_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_rules: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          metric: string
          name: string
          threshold_unit: string | null
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric: string
          name: string
          threshold_unit?: string | null
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric?: string
          name?: string
          threshold_unit?: string | null
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_configs: {
        Row: {
          company_id: string | null
          created_at: string
          events: string[] | null
          id: string
          is_active: boolean | null
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          events?: string[] | null
          id?: string
          is_active?: boolean | null
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          events?: string[] | null
          id?: string
          is_active?: boolean | null
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_orders_in_period: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      create_audit_log: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
        }
        Returns: string
      }
      get_user_company_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      search_companies_fuzzy: {
        Args: { search_term: string }
        Returns: {
          accent_color: string | null
          created_at: string
          default_language: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      soft_delete_user_account: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "viewer"
        | "editor"
        | "admin"
        | "msd_ops"
        | "system_admin"
        | "csm"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "export"
        | "import"
        | "role_change"
        | "settings_change"
        | "bulk_action"
      order_status:
        | "received"
        | "putaway"
        | "picking"
        | "packing"
        | "ready_to_ship"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "exception"
        | "on_hold"
        | "returned"
      po_status:
        | "draft"
        | "submitted"
        | "confirmed"
        | "in_transit"
        | "partially_received"
        | "received"
        | "cancelled"
      return_status:
        | "announced"
        | "received"
        | "inspected"
        | "approved"
        | "rejected"
        | "restocked"
        | "disposed"
        | "completed"
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
      app_role: ["viewer", "editor", "admin", "msd_ops", "system_admin", "csm"],
      audit_action: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "export",
        "import",
        "role_change",
        "settings_change",
        "bulk_action",
      ],
      order_status: [
        "received",
        "putaway",
        "picking",
        "packing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
        "exception",
        "on_hold",
        "returned",
      ],
      po_status: [
        "draft",
        "submitted",
        "confirmed",
        "in_transit",
        "partially_received",
        "received",
        "cancelled",
      ],
      return_status: [
        "announced",
        "received",
        "inspected",
        "approved",
        "rejected",
        "restocked",
        "disposed",
        "completed",
      ],
    },
  },
} as const
