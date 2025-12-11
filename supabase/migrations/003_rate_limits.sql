-- Rate limit storage for distributed deployments
CREATE TABLE IF NOT EXISTS public.rate_limits (
  client_id TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  blocked_until TIMESTAMPTZ,
  PRIMARY KEY (client_id, bucket)
);

-- Index for cleanup
CREATE INDEX idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Auto cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < NOW() - INTERVAL '1 hour'
    AND (blocked_until IS NULL OR blocked_until < NOW());
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role manages rate limits" ON public.rate_limits
  FOR ALL USING (true);
