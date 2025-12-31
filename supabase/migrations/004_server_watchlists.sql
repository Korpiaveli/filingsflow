-- Server watchlists for Discord bot
CREATE TABLE IF NOT EXISTS server_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    ticker TEXT NOT NULL,
    added_by TEXT,
    alert_channel_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(guild_id, ticker)
);

CREATE INDEX idx_server_watchlists_guild ON server_watchlists(guild_id);
CREATE INDEX idx_server_watchlists_ticker ON server_watchlists(ticker);

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
