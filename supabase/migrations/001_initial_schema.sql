-- FilingsFlow Initial Schema
-- Based on PRD requirements

-- Enable required extensions (use extensions schema for Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlists (tickers user wants to track)
CREATE TABLE public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT,
  alert_on_insider BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_13f BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_8k BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Tracked Funds (institutional investors user follows)
CREATE TABLE public.tracked_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cik TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, cik)
);

-- SEC Filings (denormalized for performance)
CREATE TABLE public.filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cik TEXT NOT NULL,
  accession_number TEXT UNIQUE NOT NULL,
  form_type TEXT NOT NULL,
  filed_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  ticker TEXT,
  company_name TEXT,
  filer_name TEXT,
  file_url TEXT,
  raw_content TEXT,
  ai_summary TEXT,
  ai_summary_generated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  parse_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insider Transactions (parsed from Form 3/4/5)
CREATE TABLE public.insider_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_cik TEXT NOT NULL,
  company_name TEXT,
  insider_cik TEXT NOT NULL,
  insider_name TEXT NOT NULL,
  insider_title TEXT,
  is_director BOOLEAN DEFAULT FALSE,
  is_officer BOOLEAN DEFAULT FALSE,
  is_ten_percent_owner BOOLEAN DEFAULT FALSE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('P', 'S', 'A', 'D', 'F', 'I', 'M', 'C', 'E', 'H', 'O', 'X', 'G', 'L', 'W', 'Z', 'J', 'K', 'U')),
  transaction_code_description TEXT,
  transaction_date DATE,
  shares DECIMAL(20, 4),
  price_per_share DECIMAL(20, 4),
  total_value DECIMAL(20, 2),
  shares_owned_after DECIMAL(20, 4),
  direct_or_indirect TEXT CHECK (direct_or_indirect IN ('D', 'I')),
  is_derivative BOOLEAN DEFAULT FALSE,
  is_10b51_plan BOOLEAN DEFAULT FALSE,
  footnotes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13F Holdings (institutional fund positions)
CREATE TABLE public.holdings_13f (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  fund_cik TEXT NOT NULL,
  fund_name TEXT,
  report_date DATE NOT NULL,
  ticker TEXT,
  cusip TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  title_of_class TEXT,
  shares BIGINT NOT NULL,
  value_usd BIGINT NOT NULL,
  put_call TEXT CHECK (put_call IN ('PUT', 'CALL', NULL)),
  investment_discretion TEXT CHECK (investment_discretion IN ('SOLE', 'SHARED', 'NONE')),
  voting_authority_sole BIGINT,
  voting_authority_shared BIGINT,
  voting_authority_none BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discord Servers (for bot licensing)
CREATE TABLE public.discord_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT UNIQUE NOT NULL,
  guild_name TEXT,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  alert_channel_id TEXT,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro')),
  member_count INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Server Watchlists (for Discord bot)
CREATE TABLE public.server_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  added_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(server_id, ticker)
);

-- User Notification Preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_frequency TEXT NOT NULL DEFAULT 'realtime' CHECK (email_frequency IN ('realtime', 'daily', 'weekly', 'never')),
  discord_dm_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  min_transaction_value INTEGER DEFAULT 100000,
  insider_types TEXT[] DEFAULT ARRAY['P', 'S'],
  c_suite_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification History
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filing_id UUID REFERENCES public.filings(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('filing', 'insider_cluster', 'fund_update', 'digest')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'discord_dm', 'discord_server', 'web')),
  title TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB
);

-- Indexes for common queries
CREATE INDEX idx_filings_ticker ON public.filings(ticker);
CREATE INDEX idx_filings_form_type ON public.filings(form_type);
CREATE INDEX idx_filings_filed_at ON public.filings(filed_at DESC);
CREATE INDEX idx_filings_cik ON public.filings(cik);
CREATE INDEX idx_filings_accession ON public.filings(accession_number);

CREATE INDEX idx_insider_transactions_ticker ON public.insider_transactions(ticker);
CREATE INDEX idx_insider_transactions_date ON public.insider_transactions(transaction_date DESC);
CREATE INDEX idx_insider_transactions_type ON public.insider_transactions(transaction_type);
CREATE INDEX idx_insider_transactions_insider ON public.insider_transactions(insider_cik);

CREATE INDEX idx_holdings_13f_fund ON public.holdings_13f(fund_cik);
CREATE INDEX idx_holdings_13f_cusip ON public.holdings_13f(cusip);
CREATE INDEX idx_holdings_13f_report_date ON public.holdings_13f(report_date DESC);
CREATE INDEX idx_holdings_13f_ticker ON public.holdings_13f(ticker);

CREATE INDEX idx_watchlists_user ON public.watchlists(user_id);
CREATE INDEX idx_watchlists_ticker ON public.watchlists(ticker);

CREATE INDEX idx_tracked_funds_user ON public.tracked_funds(user_id);
CREATE INDEX idx_tracked_funds_cik ON public.tracked_funds(cik);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_sent ON public.notifications(sent_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings_13f ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile, update own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Watchlists: users can CRUD their own
CREATE POLICY "Users can manage own watchlists" ON public.watchlists
  FOR ALL USING (auth.uid() = user_id);

-- Tracked Funds: users can CRUD their own
CREATE POLICY "Users can manage own tracked funds" ON public.tracked_funds
  FOR ALL USING (auth.uid() = user_id);

-- Filings: anyone can read (public data)
CREATE POLICY "Anyone can read filings" ON public.filings
  FOR SELECT USING (true);

-- Insider Transactions: anyone can read (public data)
CREATE POLICY "Anyone can read insider transactions" ON public.insider_transactions
  FOR SELECT USING (true);

-- Holdings 13F: anyone can read (public data)
CREATE POLICY "Anyone can read 13F holdings" ON public.holdings_13f
  FOR SELECT USING (true);

-- Discord Servers: owners can manage
CREATE POLICY "Server owners can manage servers" ON public.discord_servers
  FOR ALL USING (auth.uid() = owner_user_id);

-- Server Watchlists: server owners can manage
CREATE POLICY "Server owners can manage watchlists" ON public.server_watchlists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = server_id AND ds.owner_user_id = auth.uid()
    )
  );

-- Notification Preferences: users can CRUD their own
CREATE POLICY "Users can manage own notification prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Notifications: users can read their own
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_discord_servers_updated_at
  BEFORE UPDATE ON public.discord_servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get watchlist ticker count for a user
CREATE OR REPLACE FUNCTION public.get_watchlist_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.watchlists WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can add more watchlist items
CREATE OR REPLACE FUNCTION public.can_add_to_watchlist(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier FROM public.users WHERE id = p_user_id;
  SELECT COUNT(*) INTO v_count FROM public.watchlists WHERE user_id = p_user_id;

  v_limit := CASE v_tier
    WHEN 'free' THEN 5
    WHEN 'pro' THEN 50
    WHEN 'premium' THEN 999999
    ELSE 5
  END;

  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
