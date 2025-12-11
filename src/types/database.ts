export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          discord_id: string | null
          discord_username: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'pro' | 'premium'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          discord_id?: string | null
          discord_username?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro' | 'premium'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing' | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          discord_id?: string | null
          discord_username?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro' | 'premium'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing' | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          ticker: string
          company_name: string | null
          alert_on_insider: boolean
          alert_on_13f: boolean
          alert_on_8k: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          company_name?: string | null
          alert_on_insider?: boolean
          alert_on_13f?: boolean
          alert_on_8k?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          company_name?: string | null
          alert_on_insider?: boolean
          alert_on_13f?: boolean
          alert_on_8k?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tracked_funds: {
        Row: {
          id: string
          user_id: string
          cik: string
          fund_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cik: string
          fund_name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cik?: string
          fund_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_funds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      filings: {
        Row: {
          id: string
          cik: string
          accession_number: string
          form_type: string
          filed_at: string
          accepted_at: string | null
          ticker: string | null
          company_name: string | null
          filer_name: string | null
          file_url: string | null
          raw_content: string | null
          ai_summary: string | null
          ai_summary_generated_at: string | null
          processed_at: string | null
          parse_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cik: string
          accession_number: string
          form_type: string
          filed_at: string
          accepted_at?: string | null
          ticker?: string | null
          company_name?: string | null
          filer_name?: string | null
          file_url?: string | null
          raw_content?: string | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          processed_at?: string | null
          parse_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cik?: string
          accession_number?: string
          form_type?: string
          filed_at?: string
          accepted_at?: string | null
          ticker?: string | null
          company_name?: string | null
          filer_name?: string | null
          file_url?: string | null
          raw_content?: string | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          processed_at?: string | null
          parse_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      insider_transactions: {
        Row: {
          id: string
          filing_id: string
          ticker: string
          company_cik: string
          company_name: string | null
          insider_cik: string
          insider_name: string
          insider_title: string | null
          is_director: boolean
          is_officer: boolean
          is_ten_percent_owner: boolean
          transaction_type: string
          transaction_code_description: string | null
          transaction_date: string | null
          shares: number | null
          price_per_share: number | null
          total_value: number | null
          shares_owned_after: number | null
          direct_or_indirect: 'D' | 'I' | null
          is_derivative: boolean
          is_10b51_plan: boolean
          footnotes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          filing_id: string
          ticker: string
          company_cik: string
          company_name?: string | null
          insider_cik: string
          insider_name: string
          insider_title?: string | null
          is_director?: boolean
          is_officer?: boolean
          is_ten_percent_owner?: boolean
          transaction_type: string
          transaction_code_description?: string | null
          transaction_date?: string | null
          shares?: number | null
          price_per_share?: number | null
          total_value?: number | null
          shares_owned_after?: number | null
          direct_or_indirect?: 'D' | 'I' | null
          is_derivative?: boolean
          is_10b51_plan?: boolean
          footnotes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          filing_id?: string
          ticker?: string
          company_cik?: string
          company_name?: string | null
          insider_cik?: string
          insider_name?: string
          insider_title?: string | null
          is_director?: boolean
          is_officer?: boolean
          is_ten_percent_owner?: boolean
          transaction_type?: string
          transaction_code_description?: string | null
          transaction_date?: string | null
          shares?: number | null
          price_per_share?: number | null
          total_value?: number | null
          shares_owned_after?: number | null
          direct_or_indirect?: 'D' | 'I' | null
          is_derivative?: boolean
          is_10b51_plan?: boolean
          footnotes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insider_transactions_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          }
        ]
      }
      holdings_13f: {
        Row: {
          id: string
          filing_id: string
          fund_cik: string
          fund_name: string | null
          report_date: string
          ticker: string | null
          cusip: string
          issuer_name: string
          title_of_class: string | null
          shares: number
          value_usd: number
          put_call: 'PUT' | 'CALL' | null
          investment_discretion: 'SOLE' | 'SHARED' | 'NONE' | null
          voting_authority_sole: number | null
          voting_authority_shared: number | null
          voting_authority_none: number | null
          created_at: string
        }
        Insert: {
          id?: string
          filing_id: string
          fund_cik: string
          fund_name?: string | null
          report_date: string
          ticker?: string | null
          cusip: string
          issuer_name: string
          title_of_class?: string | null
          shares: number
          value_usd: number
          put_call?: 'PUT' | 'CALL' | null
          investment_discretion?: 'SOLE' | 'SHARED' | 'NONE' | null
          voting_authority_sole?: number | null
          voting_authority_shared?: number | null
          voting_authority_none?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          filing_id?: string
          fund_cik?: string
          fund_name?: string | null
          report_date?: string
          ticker?: string | null
          cusip?: string
          issuer_name?: string
          title_of_class?: string | null
          shares?: number
          value_usd?: number
          put_call?: 'PUT' | 'CALL' | null
          investment_discretion?: 'SOLE' | 'SHARED' | 'NONE' | null
          voting_authority_sole?: number | null
          voting_authority_shared?: number | null
          voting_authority_none?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_13f_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          email_frequency: 'realtime' | 'daily' | 'weekly' | 'never'
          discord_dm_enabled: boolean
          min_transaction_value: number | null
          insider_types: string[]
          c_suite_only: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          email_frequency?: 'realtime' | 'daily' | 'weekly' | 'never'
          discord_dm_enabled?: boolean
          min_transaction_value?: number | null
          insider_types?: string[]
          c_suite_only?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: boolean
          email_frequency?: 'realtime' | 'daily' | 'weekly' | 'never'
          discord_dm_enabled?: boolean
          min_transaction_value?: number | null
          insider_types?: string[]
          c_suite_only?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      cusip_cache: {
        Row: {
          cusip: string
          ticker: string | null
          cached_at: string
        }
        Insert: {
          cusip: string
          ticker?: string | null
          cached_at?: string
        }
        Update: {
          cusip?: string
          ticker?: string | null
          cached_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          client_id: string
          bucket: string
          count: number
          reset_at: string
          blocked_until: string | null
        }
        Insert: {
          client_id: string
          bucket: string
          count?: number
          reset_at: string
          blocked_until?: string | null
        }
        Update: {
          client_id?: string
          bucket?: string
          count?: number
          reset_at?: string
          blocked_until?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_watchlist_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      can_add_to_watchlist: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
