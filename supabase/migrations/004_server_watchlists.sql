-- Server watchlists for Discord bot
-- NOTE: server_watchlists already created in 001_initial_schema with different columns
-- This migration adds the simplified guild-based version for the Discord bot

-- Add guild_id column if it doesn't exist (for bot-based lookups)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_watchlists' AND column_name = 'guild_id') THEN
    ALTER TABLE server_watchlists ADD COLUMN guild_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_server_watchlists_guild ON server_watchlists(guild_id);
CREATE INDEX IF NOT EXISTS idx_server_watchlists_ticker ON server_watchlists(ticker);

-- Discord server settings
CREATE TABLE IF NOT EXISTS server_settings (
    guild_id TEXT PRIMARY KEY,
    alert_channel_id TEXT,
    min_transaction_value INTEGER DEFAULT 100000,
    alert_on_insider BOOLEAN DEFAULT true,
    alert_on_13f BOOLEAN DEFAULT true,
    premium_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
