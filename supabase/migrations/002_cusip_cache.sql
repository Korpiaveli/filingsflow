-- CUSIP to Ticker cache table for OpenFIGI API results
CREATE TABLE IF NOT EXISTS public.cusip_cache (
  cusip TEXT PRIMARY KEY,
  ticker TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX idx_cusip_cache_cached_at ON public.cusip_cache(cached_at);

-- No RLS needed - this is internal cache data accessed only by service role
ALTER TABLE public.cusip_cache ENABLE ROW LEVEL SECURITY;

-- Service role can access all cache entries
CREATE POLICY "Service role can manage cache" ON public.cusip_cache
  FOR ALL USING (true);
