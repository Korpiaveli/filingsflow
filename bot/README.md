# FilingsFlow Discord Bot

SEC filing intelligence bot for Discord servers.

## Commands

| Command | Description |
|---------|-------------|
| `/filing <ticker>` | Get latest SEC filings for a ticker |
| `/insider [ticker]` | View recent insider transactions |
| `/13f <fund>` | Get 13F holdings for an institutional investor |
| `/whales <ticker>` | See which funds own a stock |
| `/watchlist show` | Show server watchlist |
| `/watchlist add <ticker>` | Add ticker to watchlist |
| `/watchlist remove <ticker>` | Remove ticker from watchlist |
| `/watchlist clear` | Clear all tickers |

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Enable "Message Content Intent" if needed
6. Go to OAuth2 > URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
7. Use the generated URL to invite the bot to your server

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Deploy Slash Commands

Run once to register commands with Discord:

```bash
npm run deploy-commands
```

### 5. Run the Bot

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Deploy to Railway

1. Push bot folder to a Git repository
2. Create new project on [Railway](https://railway.app)
3. Connect the repository
4. Set environment variables in Railway dashboard
5. Deploy

The `railway.toml` configures automatic restarts and Dockerfile deployment.

## Database Migration

Run the migration in `supabase/migrations/004_server_watchlists.sql` to create:
- `server_watchlists` - Per-server ticker watchlists
- `server_settings` - Bot configuration per server
