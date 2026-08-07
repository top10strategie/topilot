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
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action_enum"]
          collaborator_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action_enum"]
          collaborator_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action_enum"]
          collaborator_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborator"
            referencedColumns: ["id"]
          },
        ]
      }
      category: {
        Row: {
          created_at: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      category_business: {
        Row: {
          created_at: string
          id: string
          is_private: boolean
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_private?: boolean
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_private?: boolean
          label?: string
        }
        Relationships: []
      }
      client: {
        Row: {
          address_city: string | null
          address_country: string
          address_street: string | null
          address_zip: string | null
          client_name: string
          created_at: string
          drive_link: string | null
          id: string
          is_active: boolean
          logo_id: string | null
          main_collaborator_id: string
          notes: string | null
          notes_updated_at: string | null
          search_vector: unknown
          updated_at: string | null
          website: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string
          address_street?: string | null
          address_zip?: string | null
          client_name: string
          created_at?: string
          drive_link?: string | null
          id?: string
          is_active?: boolean
          logo_id?: string | null
          main_collaborator_id: string
          notes?: string | null
          notes_updated_at?: string | null
          search_vector?: unknown
          updated_at?: string | null
          website: string
        }
        Update: {
          address_city?: string | null
          address_country?: string
          address_street?: string | null
          address_zip?: string | null
          client_name?: string
          created_at?: string
          drive_link?: string | null
          id?: string
          is_active?: boolean
          logo_id?: string | null
          main_collaborator_id?: string
          notes?: string | null
          notes_updated_at?: string | null
          search_vector?: unknown
          updated_at?: string | null
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_logo_id_fkey"
            columns: ["logo_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_logo_id_fkey"
            columns: ["logo_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_main_collaborator_id_fkey"
            columns: ["main_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborator"
            referencedColumns: ["id"]
          },
        ]
      }
      client_category: {
        Row: {
          category_id: string
          client_id: string
          created_at: string
        }
        Insert: {
          category_id: string
          client_id: string
          created_at?: string
        }
        Update: {
          category_id?: string
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_category_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      client_document: {
        Row: {
          client_id: string
          created_at: string
          document_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_document_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tool: {
        Row: {
          client_id: string
          created_at: string
          tool_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          tool_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tool_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tool_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      client_wiki: {
        Row: {
          client_id: string
          created_at: string
          wiki_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          wiki_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          wiki_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_wiki_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wiki_wiki_id_fkey"
            columns: ["wiki_id"]
            isOneToOne: false
            referencedRelation: "wiki"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          job_title: string
          last_name: string
          profile_picture_id: string | null
          role: Database["public"]["Enums"]["collaborator_role_enum"]
          search_vector: unknown
          status: Database["public"]["Enums"]["collaborator_status_enum"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          job_title: string
          last_name: string
          profile_picture_id?: string | null
          role: Database["public"]["Enums"]["collaborator_role_enum"]
          search_vector?: unknown
          status?: Database["public"]["Enums"]["collaborator_status_enum"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string
          last_name?: string
          profile_picture_id?: string | null
          role?: Database["public"]["Enums"]["collaborator_role_enum"]
          search_vector?: unknown
          status?: Database["public"]["Enums"]["collaborator_status_enum"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_profile_picture_id_fkey"
            columns: ["profile_picture_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_profile_picture_id_fkey"
            columns: ["profile_picture_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_client: {
        Row: {
          client_id: string
          created_at: string
          email_address: string | null
          first_name: string
          id: string
          is_main: boolean
          job_title: string | null
          last_name: string
          notes: string | null
          notes_updated_at: string | null
          phone_number: string | null
          profile_picture_id: string | null
          search_vector: unknown
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email_address?: string | null
          first_name: string
          id?: string
          is_main?: boolean
          job_title?: string | null
          last_name: string
          notes?: string | null
          notes_updated_at?: string | null
          phone_number?: string | null
          profile_picture_id?: string | null
          search_vector?: unknown
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email_address?: string | null
          first_name?: string
          id?: string
          is_main?: boolean
          job_title?: string | null
          last_name?: string
          notes?: string | null
          notes_updated_at?: string | null
          phone_number?: string | null
          profile_picture_id?: string | null
          search_vector?: unknown
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_client_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_client_profile_picture_id_fkey"
            columns: ["profile_picture_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_client_profile_picture_id_fkey"
            columns: ["profile_picture_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          created_at: string
          document_name: string
          document_type_id: string
          file_path: string | null
          id: string
          is_visual: boolean
          parent_document_id: string | null
          search_vector: unknown
          storage_type: Database["public"]["Enums"]["document_storage_type_enum"]
          updated_at: string | null
          url: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type_id: string
          file_path?: string | null
          id?: string
          is_visual?: boolean
          parent_document_id?: string | null
          search_vector?: unknown
          storage_type: Database["public"]["Enums"]["document_storage_type_enum"]
          updated_at?: string | null
          url?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type_id?: string
          file_path?: string | null
          id?: string
          is_visual?: boolean
          parent_document_id?: string | null
          search_vector?: unknown
          storage_type?: Database["public"]["Enums"]["document_storage_type_enum"]
          updated_at?: string | null
          url?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      document_type: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      exchange_rate: {
        Row: {
          currency: string
          date: string
          id: string
          rate: number
        }
        Insert: {
          currency: string
          date: string
          id?: string
          rate: number
        }
        Update: {
          currency?: string
          date?: string
          id?: string
          rate?: number
        }
        Relationships: []
      }
      mission: {
        Row: {
          archived_at: string | null
          client_id: string | null
          collaborator_id: string
          completed_at: string | null
          created_at: string
          end_at: string
          estimated_charge: number | null
          id: string
          kanban_order: number | null
          kanban_status: Database["public"]["Enums"]["mission_kanban_status_enum"]
          mission_name: string
          mission_scope: Database["public"]["Enums"]["mission_scope_enum"]
          notes: string | null
          notes_updated_at: string | null
          opportunity_id: string | null
          search_vector: unknown
          series_id: string | null
          start_at: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          client_id?: string | null
          collaborator_id: string
          completed_at?: string | null
          created_at?: string
          end_at: string
          estimated_charge?: number | null
          id?: string
          kanban_order?: number | null
          kanban_status?: Database["public"]["Enums"]["mission_kanban_status_enum"]
          mission_name: string
          mission_scope: Database["public"]["Enums"]["mission_scope_enum"]
          notes?: string | null
          notes_updated_at?: string | null
          opportunity_id?: string | null
          search_vector?: unknown
          series_id?: string | null
          start_at?: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string | null
          collaborator_id?: string
          completed_at?: string | null
          created_at?: string
          end_at?: string
          estimated_charge?: number | null
          id?: string
          kanban_order?: number | null
          kanban_status?: Database["public"]["Enums"]["mission_kanban_status_enum"]
          mission_name?: string
          mission_scope?: Database["public"]["Enums"]["mission_scope_enum"]
          notes?: string | null
          notes_updated_at?: string | null
          opportunity_id?: string | null
          search_vector?: unknown
          series_id?: string | null
          start_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "mission_series"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_category: {
        Row: {
          category_id: string
          created_at: string
          mission_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          mission_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_category_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_document: {
        Row: {
          created_at: string
          document_id: string
          mission_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          mission_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_document_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_series: {
        Row: {
          created_at: string
          ends_on: string | null
          frequency: Database["public"]["Enums"]["mission_recurrence_frequency"]
          id: string
          starts_on: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          frequency: Database["public"]["Enums"]["mission_recurrence_frequency"]
          id?: string
          starts_on: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          frequency?: Database["public"]["Enums"]["mission_recurrence_frequency"]
          id?: string
          starts_on?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mission_tool: {
        Row: {
          created_at: string
          mission_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          mission_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          mission_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_tool_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_tool_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_wiki: {
        Row: {
          created_at: string
          mission_id: string
          wiki_id: string
        }
        Insert: {
          created_at?: string
          mission_id: string
          wiki_id: string
        }
        Update: {
          created_at?: string
          mission_id?: string
          wiki_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_wiki_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_wiki_wiki_id_fkey"
            columns: ["wiki_id"]
            isOneToOne: false
            referencedRelation: "wiki"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity: {
        Row: {
          action: string | null
          average_price: number | null
          client_id: string
          closed_at: string | null
          collaborator_id: string
          contact_client_id: string | null
          created_at: string
          due_date_at: string | null
          end_at: string | null
          entry_average_price: number | null
          id: string
          is_active: boolean
          kanban_order: number | null
          kanban_status: Database["public"]["Enums"]["opportunity_kanban_status_enum"]
          last_meeting_at: string | null
          notes: string | null
          notes_updated_at: string | null
          opportunity_name: string
          price: number | null
          priority: Database["public"]["Enums"]["opportunity_priority_enum"]
          probability_confirmation: number
          search_vector: unknown
          source: string | null
          updated_at: string | null
        }
        Insert: {
          action?: string | null
          average_price?: number | null
          client_id: string
          closed_at?: string | null
          collaborator_id: string
          contact_client_id?: string | null
          created_at?: string
          due_date_at?: string | null
          end_at?: string | null
          entry_average_price?: number | null
          id?: string
          is_active?: boolean
          kanban_order?: number | null
          kanban_status: Database["public"]["Enums"]["opportunity_kanban_status_enum"]
          last_meeting_at?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          opportunity_name: string
          price?: number | null
          priority?: Database["public"]["Enums"]["opportunity_priority_enum"]
          probability_confirmation?: number
          search_vector?: unknown
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string | null
          average_price?: number | null
          client_id?: string
          closed_at?: string | null
          collaborator_id?: string
          contact_client_id?: string | null
          created_at?: string
          due_date_at?: string | null
          end_at?: string | null
          entry_average_price?: number | null
          id?: string
          is_active?: boolean
          kanban_order?: number | null
          kanban_status?: Database["public"]["Enums"]["opportunity_kanban_status_enum"]
          last_meeting_at?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          opportunity_name?: string
          price?: number | null
          priority?: Database["public"]["Enums"]["opportunity_priority_enum"]
          probability_confirmation?: number
          search_vector?: unknown
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contact_client_id_fkey"
            columns: ["contact_client_id"]
            isOneToOne: false
            referencedRelation: "contact_client"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_category: {
        Row: {
          category_id: string
          created_at: string
          opportunity_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          opportunity_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_category_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunity"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_document: {
        Row: {
          created_at: string
          document_id: string
          opportunity_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          opportunity_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_document_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_document_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunity"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_tool: {
        Row: {
          created_at: string
          opportunity_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_tool_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_tool_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      setting: {
        Row: {
          collaborator_id: string
          created_at: string
          home_widgets: string[]
          id: string
          must_change_password: boolean
          preferred_mission_category_ids: string[]
          theme: Database["public"]["Enums"]["theme_enum"]
          updated_at: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          home_widgets?: string[]
          id?: string
          must_change_password?: boolean
          preferred_mission_category_ids?: string[]
          theme?: Database["public"]["Enums"]["theme_enum"]
          updated_at?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          home_widgets?: string[]
          id?: string
          must_change_password?: boolean
          preferred_mission_category_ids?: string[]
          theme?: Database["public"]["Enums"]["theme_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setting_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: true
            referencedRelation: "collaborator"
            referencedColumns: ["id"]
          },
        ]
      }
      team: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          notes_updated_at: string | null
          search_vector: unknown
          team_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          notes_updated_at?: string | null
          search_vector?: unknown
          team_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          notes_updated_at?: string | null
          search_vector?: unknown
          team_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      team_category: {
        Row: {
          category_id: string
          created_at: string
          team_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          team_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_category_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      tool: {
        Row: {
          created_at: string
          description: string | null
          id: string
          search_vector: unknown
          tool_name: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          search_vector?: unknown
          tool_name: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          search_vector?: unknown
          tool_name?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      tool_access: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          identifier: string
          is_private: boolean
          label: string
          search_vector: unknown
          tool_id: string
          updated_at: string | null
          vault_secret_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          identifier: string
          is_private?: boolean
          label: string
          search_vector?: unknown
          tool_id: string
          updated_at?: string | null
          vault_secret_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          identifier?: string
          is_private?: boolean
          label?: string
          search_vector?: unknown
          tool_id?: string
          updated_at?: string | null
          vault_secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_access_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_category: {
        Row: {
          category_id: string
          created_at: string
          tool_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          tool_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_category_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_subscription: {
        Row: {
          created_at: string
          id: string
          subscription_plan: Database["public"]["Enums"]["tool_subscription_plan_enum"]
          title: string
          tool_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_plan?: Database["public"]["Enums"]["tool_subscription_plan_enum"]
          title: string
          tool_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          subscription_plan?: Database["public"]["Enums"]["tool_subscription_plan_enum"]
          title?: string
          tool_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_subscription_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_subscription_price: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          tool_subscription_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          tool_subscription_id: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          tool_subscription_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_subscription_price_tool_subscription_id_fkey"
            columns: ["tool_subscription_id"]
            isOneToOne: false
            referencedRelation: "tool_subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki: {
        Row: {
          content_html: string
          content_text: string
          created_at: string
          id: string
          search_vector: unknown
          tags: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          content_html: string
          content_text: string
          created_at?: string
          id?: string
          search_vector?: unknown
          tags?: string[]
          title: string
          updated_at?: string | null
        }
        Update: {
          content_html?: string
          content_text?: string
          created_at?: string
          id?: string
          search_vector?: unknown
          tags?: string[]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wiki_category: {
        Row: {
          category_id: string
          created_at: string
          wiki_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          wiki_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          wiki_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_category_wiki_id_fkey"
            columns: ["wiki_id"]
            isOneToOne: false
            referencedRelation: "wiki"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      document_latest: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_type_id: string | null
          file_path: string | null
          id: string | null
          is_visual: boolean | null
          parent_document_id: string | null
          storage_type:
            | Database["public"]["Enums"]["document_storage_type_enum"]
            | null
          updated_at: string | null
          url: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document_latest"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anonymize_collaborator: { Args: { p_id: string }; Returns: undefined }
      anonymize_contact_client: { Args: { p_id: string }; Returns: undefined }
      can_access_client: { Args: { p_client_id: string }; Returns: boolean }
      can_access_document: { Args: { p_document_id: string }; Returns: boolean }
      can_access_mission: { Args: { p_mission_id: string }; Returns: boolean }
      can_access_opportunity: {
        Args: { p_opportunity_id: string }
        Returns: boolean
      }
      can_access_team: { Args: { p_team_id: string }; Returns: boolean }
      current_collaborator_role: {
        Args: never
        Returns: Database["public"]["Enums"]["collaborator_role_enum"]
      }
      delete_document_lineage: {
        Args: { p_document_id: string }
        Returns: {
          file_path: string
        }[]
      }
      delete_document_version: {
        Args: { p_document_id: string }
        Returns: {
          file_path: string
        }[]
      }
      delete_secret: { Args: { secret_name: string }; Returns: undefined }
      fts_french: { Args: { p_text: string }; Returns: unknown }
      fts_french_tags: { Args: { p_tags: string[] }; Returns: unknown }
      get_auth_gate_state: {
        Args: never
        Returns: {
          collaborator_id: string
          must_change_password: boolean
          status: Database["public"]["Enums"]["collaborator_status_enum"]
        }[]
      }
      has_private_business_category: {
        Args: { p_id: string; p_kind: string }
        Returns: boolean
      }
      insert_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: string
      }
      is_active_collaborator: { Args: never; Returns: boolean }
      is_manager_or_direction: { Args: never; Returns: boolean }
      read_secret: { Args: { secret_name: string }; Returns: string }
      search_global: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          entity_id: string
          entity_type: string
          rank: number
          subtitle: string
          title: string
        }[]
      }
      team_name_for_display: { Args: { p_team_id: string }; Returns: string }
      update_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: undefined
      }
    }
    Enums: {
      audit_action_enum: "INSERT" | "UPDATE" | "DELETE"
      collaborator_role_enum: "direction" | "manager" | "collaborator"
      collaborator_status_enum: "actif" | "inactif" | "sorti"
      document_storage_type_enum: "supabase" | "url"
      mission_kanban_status_enum:
        | "a_faire"
        | "en_cours"
        | "terminee"
        | "archivee"
      mission_recurrence_frequency: "mensuelle" | "trimestrielle" | "annuelle"
      mission_scope_enum: "client" | "interne"
      opportunity_kanban_status_enum:
        | "suspect"
        | "prospect"
        | "besoin_specifie"
        | "proposition_envoyee"
        | "gagne"
        | "perdue"
      opportunity_priority_enum: "faible" | "normal" | "urgente" | "prioritaire"
      theme_enum: "clair" | "sombre" | "systeme"
      tool_subscription_plan_enum: "annuel" | "mensuel"
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
      audit_action_enum: ["INSERT", "UPDATE", "DELETE"],
      collaborator_role_enum: ["direction", "manager", "collaborator"],
      collaborator_status_enum: ["actif", "inactif", "sorti"],
      document_storage_type_enum: ["supabase", "url"],
      mission_kanban_status_enum: [
        "a_faire",
        "en_cours",
        "terminee",
        "archivee",
      ],
      mission_recurrence_frequency: ["mensuelle", "trimestrielle", "annuelle"],
      mission_scope_enum: ["client", "interne"],
      opportunity_kanban_status_enum: [
        "suspect",
        "prospect",
        "besoin_specifie",
        "proposition_envoyee",
        "gagne",
        "perdue",
      ],
      opportunity_priority_enum: ["faible", "normal", "urgente", "prioritaire"],
      theme_enum: ["clair", "sombre", "systeme"],
      tool_subscription_plan_enum: ["annuel", "mensuel"],
    },
  },
} as const
