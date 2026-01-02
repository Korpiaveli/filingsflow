-- FilingsFlow Enrichment Cache
-- Adds news caching and performance indexes for metrics calculations

-- News cache for RSS fetched items
CREATE TABLE IF NOT EXISTS public.news_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('yahoo', 'google', 'sec_8k')),
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  snippet TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_news_cache_ticker_published
  ON public.news_cache(ticker, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_cache_expires
  ON public.news_cache(expires_at);

-- Performance indexes for metrics calculations
CREATE INDEX IF NOT EXISTS idx_insider_txn_insider_cik_date
  ON public.insider_transactions(insider_cik, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_txn_ticker_date_type
  ON public.insider_transactions(ticker, transaction_date DESC, transaction_type);
CREATE INDEX IF NOT EXISTS idx_insider_txn_type_date_value
  ON public.insider_transactions(transaction_type, transaction_date DESC, total_value DESC);

-- Index for 13F quarter-over-quarter comparisons
CREATE INDEX IF NOT EXISTS idx_holdings_13f_ticker_report
  ON public.holdings_13f(ticker, report_date DESC);

-- RLS policies for news cache
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read news cache"
  ON public.news_cache FOR SELECT USING (true);

CREATE POLICY "Service role can insert news cache"
  ON public.news_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can delete news cache"
  ON public.news_cache FOR DELETE USING (true);

-- Function to cleanup expired news cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_news_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.news_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
