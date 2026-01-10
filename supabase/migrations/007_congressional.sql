-- Congressional Stock Trading Schema
-- Data from housestockwatcher.com and senatestockwatcher.com (free APIs)

CREATE TABLE public.congressional_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  member_name TEXT NOT NULL,
  state TEXT,
  district TEXT,
  party TEXT CHECK (party IN ('D', 'R', 'I', NULL)),

  ticker TEXT,
  asset_description TEXT,
  asset_type TEXT,
  transaction_type TEXT NOT NULL,
  transaction_date DATE,
  disclosure_date DATE NOT NULL,
  amount_range TEXT,
  amount_low INTEGER,
  amount_high INTEGER,
  owner TEXT,

  ptr_link TEXT,
  comment TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chamber, member_name, disclosure_date, ticker, transaction_date, transaction_type, amount_range)
);

CREATE TABLE public.congressional_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  name TEXT NOT NULL,
  state TEXT,
  district TEXT,
  party TEXT CHECK (party IN ('D', 'R', 'I', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chamber, name)
);

CREATE TABLE public.congressional_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  records_fetched INTEGER,
  records_inserted INTEGER,
  error_message TEXT
);

-- Indexes for common queries
CREATE INDEX idx_congressional_ticker ON public.congressional_transactions(ticker) WHERE ticker IS NOT NULL;
CREATE INDEX idx_congressional_member ON public.congressional_transactions(member_name);
CREATE INDEX idx_congressional_chamber ON public.congressional_transactions(chamber);
CREATE INDEX idx_congressional_disclosure_date ON public.congressional_transactions(disclosure_date);
CREATE INDEX idx_congressional_transaction_date ON public.congressional_transactions(transaction_date);
CREATE INDEX idx_congressional_type ON public.congressional_transactions(transaction_type);
CREATE INDEX idx_congressional_party ON public.congressional_transactions(party) WHERE party IS NOT NULL;
CREATE INDEX idx_congressional_amount ON public.congressional_transactions(amount_high) WHERE amount_high IS NOT NULL;
CREATE INDEX idx_congressional_members_name ON public.congressional_members(name);

-- RLS (public read access, service role write)
ALTER TABLE public.congressional_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congressional_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congressional_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.congressional_transactions
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage" ON public.congressional_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Public read access" ON public.congressional_members
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage" ON public.congressional_members
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage sync log" ON public.congressional_sync_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get congressional activity for a ticker
CREATE OR REPLACE FUNCTION public.get_congressional_trades(
  p_ticker TEXT,
  p_days INTEGER DEFAULT 365
)
RETURNS TABLE (
  member_name TEXT,
  party TEXT,
  chamber TEXT,
  transaction_type TEXT,
  amount_range TEXT,
  transaction_date DATE,
  disclosure_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.member_name,
    ct.party,
    ct.chamber,
    ct.transaction_type,
    ct.amount_range,
    ct.transaction_date,
    ct.disclosure_date
  FROM public.congressional_transactions ct
  WHERE ct.ticker = UPPER(p_ticker)
    AND ct.disclosure_date >= CURRENT_DATE - p_days
  ORDER BY ct.disclosure_date DESC, ct.transaction_date DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent high-value trades
CREATE OR REPLACE FUNCTION public.get_notable_congressional_trades(
  p_days INTEGER DEFAULT 30,
  p_min_amount INTEGER DEFAULT 50000
)
RETURNS TABLE (
  member_name TEXT,
  party TEXT,
  chamber TEXT,
  ticker TEXT,
  transaction_type TEXT,
  amount_range TEXT,
  amount_high INTEGER,
  transaction_date DATE,
  disclosure_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.member_name,
    ct.party,
    ct.chamber,
    ct.ticker,
    ct.transaction_type,
    ct.amount_range,
    ct.amount_high,
    ct.transaction_date,
    ct.disclosure_date
  FROM public.congressional_transactions ct
  WHERE ct.disclosure_date >= CURRENT_DATE - p_days
    AND ct.amount_high >= p_min_amount
    AND ct.ticker IS NOT NULL
  ORDER BY ct.amount_high DESC, ct.disclosure_date DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
