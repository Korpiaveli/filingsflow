-- Correlated Cluster Tracking Tables
-- Premium feature for tracking recurring trading patterns

-- Cluster type enum
DO $$ BEGIN
  CREATE TYPE cluster_type AS ENUM (
    'company_insider',
    'cross_company_exec',
    'congressional',
    'institutional',
    'mixed_influential'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Store identified recurring clusters
CREATE TABLE public.cluster_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  type cluster_type NOT NULL,
  member_fingerprint TEXT UNIQUE NOT NULL,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_score NUMERIC(5,4) DEFAULT 0,
  total_occurrences INT DEFAULT 1,
  avg_return_30d NUMERIC(10,4),
  avg_return_90d NUMERIC(10,4),
  win_rate NUMERIC(5,4),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track cluster members
CREATE TABLE public.cluster_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.cluster_definitions(id) ON DELETE CASCADE,
  participant_cik TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('officer', 'director', 'congress', 'institution', '10%_owner', 'unknown')),
  affiliation TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_count INT DEFAULT 0,
  total_value NUMERIC(20,2) DEFAULT 0,
  UNIQUE(cluster_id, participant_cik)
);

-- Track cluster actions (when cluster trades together)
CREATE TABLE public.cluster_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.cluster_definitions(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell', 'mixed')),
  action_date DATE NOT NULL,
  participant_count INT NOT NULL,
  total_value NUMERIC(20,2) NOT NULL,
  avg_entry_price NUMERIC(20,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track performance over time for each cluster action
CREATE TABLE public.cluster_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_action_id UUID NOT NULL REFERENCES public.cluster_actions(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_price NUMERIC(20,4),
  price_change_pct NUMERIC(10,4),
  days_since_action INT NOT NULL,
  UNIQUE(cluster_action_id, days_since_action)
);

-- Individual transactions within cluster actions
CREATE TABLE public.cluster_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_action_id UUID NOT NULL REFERENCES public.cluster_actions(id) ON DELETE CASCADE,
  insider_transaction_id UUID REFERENCES public.insider_transactions(id) ON DELETE SET NULL,
  congressional_transaction_id UUID REFERENCES public.congressional_transactions(id) ON DELETE SET NULL,
  participant_cik TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  value NUMERIC(20,2) NOT NULL,
  shares NUMERIC(20,4),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cluster_definitions_fingerprint ON public.cluster_definitions(member_fingerprint);
CREATE INDEX idx_cluster_definitions_type ON public.cluster_definitions(type);
CREATE INDEX idx_cluster_definitions_active ON public.cluster_definitions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_cluster_definitions_score ON public.cluster_definitions(correlation_score DESC);

CREATE INDEX idx_cluster_members_cluster ON public.cluster_members(cluster_id);
CREATE INDEX idx_cluster_members_cik ON public.cluster_members(participant_cik);

CREATE INDEX idx_cluster_actions_cluster ON public.cluster_actions(cluster_id);
CREATE INDEX idx_cluster_actions_ticker ON public.cluster_actions(ticker);
CREATE INDEX idx_cluster_actions_date ON public.cluster_actions(action_date DESC);

CREATE INDEX idx_cluster_performance_action ON public.cluster_performance(cluster_action_id);

CREATE INDEX idx_cluster_transactions_action ON public.cluster_transactions(cluster_action_id);

-- RLS policies
ALTER TABLE public.cluster_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_transactions ENABLE ROW LEVEL SECURITY;

-- Pro/Premium users can view clusters
CREATE POLICY "Pro users can view clusters"
  ON public.cluster_definitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.subscription_tier IN ('pro', 'premium')
    )
  );

CREATE POLICY "Pro users can view cluster members"
  ON public.cluster_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.subscription_tier IN ('pro', 'premium')
    )
  );

CREATE POLICY "Pro users can view cluster actions"
  ON public.cluster_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.subscription_tier IN ('pro', 'premium')
    )
  );

CREATE POLICY "Pro users can view cluster performance"
  ON public.cluster_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.subscription_tier IN ('pro', 'premium')
    )
  );

CREATE POLICY "Pro users can view cluster transactions"
  ON public.cluster_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.subscription_tier IN ('pro', 'premium')
    )
  );

-- Service role can manage all cluster data
CREATE POLICY "Service role manages clusters"
  ON public.cluster_definitions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages cluster members"
  ON public.cluster_members FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages cluster actions"
  ON public.cluster_actions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages cluster performance"
  ON public.cluster_performance FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages cluster transactions"
  ON public.cluster_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update cluster stats
CREATE OR REPLACE FUNCTION update_cluster_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cluster_definitions
  SET
    last_activity_at = NOW(),
    total_occurrences = total_occurrences + 1,
    updated_at = NOW()
  WHERE id = NEW.cluster_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cluster_stats
  AFTER INSERT ON public.cluster_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_cluster_stats();
