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
      congressional_transactions: {
        Row: {
          id: string
          member_name: string
          chamber: 'house' | 'senate'
          party: string | null
          state: string | null
          district: string | null
          ticker: string | null
          asset_description: string | null
          asset_type: string | null
          transaction_type: string
          transaction_date: string | null
          disclosure_date: string
          amount_range: string
          amount_low: number | null
          amount_high: number | null
          owner: string | null
          ptr_link: string | null
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_name: string
          chamber: 'house' | 'senate'
          party?: string | null
          state?: string | null
          district?: string | null
          ticker?: string | null
          asset_description?: string | null
          asset_type?: string | null
          transaction_type: string
          transaction_date?: string | null
          disclosure_date: string
          amount_range: string
          amount_low?: number | null
          amount_high?: number | null
          owner?: string | null
          ptr_link?: string | null
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          member_name?: string
          chamber?: 'house' | 'senate'
          party?: string | null
          state?: string | null
          district?: string | null
          ticker?: string | null
          asset_description?: string | null
          asset_type?: string | null
          transaction_type?: string
          transaction_date?: string | null
          disclosure_date?: string
          amount_range?: string
          amount_low?: number | null
          amount_high?: number | null
          owner?: string | null
          ptr_link?: string | null
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      congressional_sync_log: {
        Row: {
          id: string
          chamber: 'house' | 'senate'
          status: 'running' | 'completed' | 'failed'
          started_at: string
          completed_at: string | null
          records_fetched: number | null
          records_inserted: number | null
          error_message: string | null
        }
        Insert: {
          id?: string
          chamber: 'house' | 'senate'
          status: 'running' | 'completed' | 'failed'
          started_at?: string
          completed_at?: string | null
          records_fetched?: number | null
          records_inserted?: number | null
          error_message?: string | null
        }
        Update: {
          id?: string
          chamber?: 'house' | 'senate'
          status?: 'running' | 'completed' | 'failed'
          started_at?: string
          completed_at?: string | null
          records_fetched?: number | null
          records_inserted?: number | null
          error_message?: string | null
        }
        Relationships: []
      }
      news_cache: {
        Row: {
          id: string
          ticker: string
          source: 'yahoo' | 'google' | 'sec_8k'
          title: string
          url: string
          published_at: string
          snippet: string | null
          fetched_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          ticker: string
          source: 'yahoo' | 'google' | 'sec_8k'
          title: string
          url: string
          published_at: string
          snippet?: string | null
          fetched_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          ticker?: string
          source?: 'yahoo' | 'google' | 'sec_8k'
          title?: string
          url?: string
          published_at?: string
          snippet?: string | null
          fetched_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          code_used: string
          status: 'pending' | 'confirmed' | 'rejected'
          rejection_reason: string | null
          signup_ip: string | null
          created_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          code_used: string
          status?: 'pending' | 'confirmed' | 'rejected'
          rejection_reason?: string | null
          signup_ip?: string | null
          created_at?: string
          confirmed_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          code_used?: string
          status?: 'pending' | 'confirmed' | 'rejected'
          rejection_reason?: string | null
          signup_ip?: string | null
          created_at?: string
          confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_credits: {
        Row: {
          id: string
          user_id: string
          milestone: number
          amount_cents: number
          stripe_txn_id: string | null
          awarded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          milestone: number
          amount_cents: number
          stripe_txn_id?: string | null
          awarded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          milestone?: number
          amount_cents?: number
          stripe_txn_id?: string | null
          awarded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_audit_log: {
        Row: {
          id: string
          event_type: string
          user_id: string | null
          details: unknown | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          user_id?: string | null
          details?: unknown | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          user_id?: string | null
          details?: unknown | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      cluster_definitions: {
        Row: {
          id: string
          member_fingerprint: string
          name: string | null
          description: string | null
          type: 'company_insider' | 'cross_company_exec' | 'congressional' | 'institutional' | 'mixed_influential'
          correlation_score: number
          total_occurrences: number
          avg_return_30d: number | null
          avg_return_90d: number | null
          win_rate: number | null
          first_detected_at: string
          last_activity_at: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_fingerprint: string
          name?: string | null
          description?: string | null
          type: 'company_insider' | 'cross_company_exec' | 'congressional' | 'institutional' | 'mixed_influential'
          correlation_score?: number
          total_occurrences?: number
          avg_return_30d?: number | null
          avg_return_90d?: number | null
          win_rate?: number | null
          first_detected_at?: string
          last_activity_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_fingerprint?: string
          name?: string | null
          description?: string | null
          type?: 'company_insider' | 'cross_company_exec' | 'congressional' | 'institutional' | 'mixed_influential'
          correlation_score?: number
          total_occurrences?: number
          avg_return_30d?: number | null
          avg_return_90d?: number | null
          win_rate?: number | null
          first_detected_at?: string
          last_activity_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cluster_members: {
        Row: {
          id: string
          cluster_id: string
          participant_cik: string
          participant_name: string
          participant_type: 'officer' | 'director' | 'congress' | 'institution' | '10%_owner' | 'unknown'
          affiliation: string | null
          transaction_count: number
          total_value: number
          joined_at: string
          last_active_at: string
        }
        Insert: {
          id?: string
          cluster_id: string
          participant_cik: string
          participant_name: string
          participant_type: 'officer' | 'director' | 'congress' | 'institution' | '10%_owner' | 'unknown'
          affiliation?: string | null
          transaction_count?: number
          total_value?: number
          joined_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          cluster_id?: string
          participant_cik?: string
          participant_name?: string
          participant_type?: 'officer' | 'director' | 'congress' | 'institution' | '10%_owner' | 'unknown'
          affiliation?: string | null
          transaction_count?: number
          total_value?: number
          joined_at?: string
          last_active_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_members_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_definitions"
            referencedColumns: ["id"]
          }
        ]
      }
      cluster_actions: {
        Row: {
          id: string
          cluster_id: string
          ticker: string
          company_name: string | null
          direction: 'buy' | 'sell' | 'mixed'
          action_date: string
          participant_count: number
          total_value: number
          avg_entry_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          cluster_id: string
          ticker: string
          company_name?: string | null
          direction: 'buy' | 'sell' | 'mixed'
          action_date: string
          participant_count: number
          total_value: number
          avg_entry_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          cluster_id?: string
          ticker?: string
          company_name?: string | null
          direction?: 'buy' | 'sell' | 'mixed'
          action_date?: string
          participant_count?: number
          total_value?: number
          avg_entry_price?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_actions_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_definitions"
            referencedColumns: ["id"]
          }
        ]
      }
      cluster_performance: {
        Row: {
          id: string
          cluster_action_id: string
          days_since_action: number
          current_price: number | null
          price_change_pct: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          cluster_action_id: string
          days_since_action: number
          current_price?: number | null
          price_change_pct?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          cluster_action_id?: string
          days_since_action?: number
          current_price?: number | null
          price_change_pct?: number | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_performance_cluster_action_id_fkey"
            columns: ["cluster_action_id"]
            isOneToOne: false
            referencedRelation: "cluster_actions"
            referencedColumns: ["id"]
          }
        ]
      }
      cluster_transactions: {
        Row: {
          id: string
          cluster_action_id: string
          insider_transaction_id: string | null
          congressional_transaction_id: string | null
          participant_cik: string
          participant_name: string
          transaction_type: 'buy' | 'sell'
          value: number
          shares: number | null
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          cluster_action_id: string
          insider_transaction_id?: string | null
          congressional_transaction_id?: string | null
          participant_cik: string
          participant_name: string
          transaction_type: 'buy' | 'sell'
          value: number
          shares?: number | null
          transaction_date: string
          created_at?: string
        }
        Update: {
          id?: string
          cluster_action_id?: string
          insider_transaction_id?: string | null
          congressional_transaction_id?: string | null
          participant_cik?: string
          participant_name?: string
          transaction_type?: 'buy' | 'sell'
          value?: number
          shares?: number | null
          transaction_date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_transactions_cluster_action_id_fkey"
            columns: ["cluster_action_id"]
            isOneToOne: false
            referencedRelation: "cluster_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_transactions_insider_transaction_id_fkey"
            columns: ["insider_transaction_id"]
            isOneToOne: false
            referencedRelation: "insider_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_transactions_congressional_transaction_id_fkey"
            columns: ["congressional_transaction_id"]
            isOneToOne: false
            referencedRelation: "congressional_transactions"
            referencedColumns: ["id"]
          }
        ]
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
      get_top_signal: {
        Args: { p_user_id?: string }
        Returns: {
          ticker: string
          company_name: string
          signal_type: string
          headline: string
          context: string
          value: number
          direction: string
          insider_name: string
          insider_title: string
          transaction_date: string
          filing_id: string
          significance_score: number
          is_cluster: boolean
          cluster_count: number
          is_first_in_months: boolean
          months_since_last: number
        }[]
      }
      get_watchlist_pulse: {
        Args: { p_user_id: string }
        Returns: {
          ticker: string
          company_name: string
          insider_buys_30d: number
          insider_sells_30d: number
          net_flow_30d: number
          last_insider_date: string | null
          last_insider_name: string | null
          last_insider_action: string | null
          has_cluster: boolean
          has_congress_trade: boolean
          has_13f_activity: boolean
          activity_level: string
        }[]
      }
      get_trending_tickers: {
        Args: { p_limit?: number }
        Returns: {
          ticker: string
          company_name: string
          transaction_count: number
          unique_insiders: number
          total_buy_value: number
          total_sell_value: number
          net_flow: number
          has_cluster: boolean
          top_insider_name: string | null
          top_insider_title: string | null
        }[]
      }
      get_unified_activity: {
        Args: {
          p_user_id?: string
          p_source?: string
          p_direction?: string
          p_min_value?: number
          p_watchlist_only?: boolean
          p_ticker?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          source: string
          ticker: string
          company_name: string
          headline: string
          subtext: string
          value: number
          direction: string
          event_date: string
          signals: unknown
        }[]
      }
      cleanup_expired_news_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          total_referrals: number
          confirmed_referrals: number
          pending_referrals: number
          credits_earned_cents: number
        }[]
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
