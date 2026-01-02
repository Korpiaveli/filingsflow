# FilingsFlow Deployment Guide

## Prerequisites

- Supabase project with schema applied
- Stripe account with products configured
- Discord application with bot token
- Anthropic API key
- Resend account for emails
- Inngest account

## 1. Supabase Setup

### Run Migrations

Execute migrations in order in Supabase SQL Editor:

```bash
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_cusip_cache.sql
supabase/migrations/003_rate_limits.sql
supabase/migrations/004_server_watchlists.sql
```

### Enable Discord OAuth

1. Go to Authentication > Providers > Discord
2. Add Discord Client ID and Secret
3. Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

## 2. Stripe Configuration

### Create Products

1. **Pro Plan** - $29/month
   - Copy price ID to `STRIPE_PRO_PRICE_ID`

2. **Premium Plan** - $79/month
   - Copy price ID to `STRIPE_PREMIUM_PRICE_ID`

### Configure Webhooks

Endpoint: `https://your-domain.com/api/stripe/webhook`

Events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## 3. Vercel Deployment (Web App)

### Deploy via CLI

```bash
cd filingsflow
npm i -g vercel
vercel login
vercel
```

### Environment Variables

Set in Vercel Dashboard > Settings > Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | https://filingsflow.com |
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJ... |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJ... |
| `SEC_USER_AGENT` | FilingsFlow/1.0 (contact@filingsflow.com) |
| `INNGEST_EVENT_KEY` | evt_... |
| `INNGEST_SIGNING_KEY` | signkey_... |
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `STRIPE_SECRET_KEY` | sk_live_... |
| `STRIPE_WEBHOOK_SECRET` | whsec_... |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pk_live_... |
| `STRIPE_PRO_PRICE_ID` | price_... |
| `STRIPE_PREMIUM_PRICE_ID` | price_... |
| `RESEND_API_KEY` | re_... |

### Connect Inngest

1. Go to [app.inngest.com](https://app.inngest.com)
2. Create app, connect to Vercel
3. The SEC polling job runs every minute during market hours

## 4. Railway Deployment (Discord Bot)

### Create New Project

```bash
cd filingsflow/bot
npm run build
```

### Railway Setup

1. Create new project at [railway.app](https://railway.app)
2. Connect GitHub repo or deploy from local
3. Set root directory to `/filingsflow/bot`

### Environment Variables

| Variable | Value |
|----------|-------|
| `DISCORD_BOT_TOKEN` | your-bot-token |
| `DISCORD_CLIENT_ID` | your-client-id |
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | eyJ... |

### Deploy Commands

After deployment, register slash commands:

```bash
npm run deploy-commands
```

### Bot Invite URL

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878032960&scope=bot%20applications.commands
```

Permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

## 5. Post-Deployment Verification

### Web App
- [ ] Landing page loads
- [ ] Discord OAuth login works
- [ ] Filings page shows data (after SEC poll)
- [ ] Watchlist CRUD works
- [ ] Stripe checkout completes

### Discord Bot
- [ ] Bot comes online
- [ ] `/filing AAPL` returns results
- [ ] `/watchlist add TSLA` works
- [ ] `/whales NVDA` shows fund holdings

### Background Jobs
- [ ] Inngest dashboard shows `pollSECFilings` running
- [ ] New filings appear in database
- [ ] AI summaries generate

## 6. Monitoring

### Recommended Services

- **Vercel Analytics** - Web performance
- **Inngest Dashboard** - Job monitoring
- **Supabase Dashboard** - Database metrics
- **Railway Logs** - Bot health
- **Betterstack** - Uptime monitoring

## Troubleshooting

### SEC Polling Not Working
1. Check `SEC_USER_AGENT` is set with valid email
2. Verify Inngest connection in dashboard
3. Check Vercel function logs

### Bot Not Responding
1. Verify `DISCORD_BOT_TOKEN` is correct
2. Check Railway logs for errors
3. Re-run `deploy-commands` if commands missing

### Stripe Webhooks Failing
1. Verify `STRIPE_WEBHOOK_SECRET` matches
2. Check webhook endpoint URL is correct
3. Review Stripe Dashboard > Webhooks for errors
