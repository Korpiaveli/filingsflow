# FilingsFlow - Complete Product Analysis

**Document Purpose:** Comprehensive analysis of features, capabilities, and revenue model for business analysts to develop revenue generation strategies.

**Last Updated:** January 2025

---

## Executive Summary

FilingsFlow is a B2C/B2B SaaS platform providing real-time SEC filing intelligence via web dashboard and Discord bot. The platform monitors insider transactions (Form 3/4/5) and institutional holdings (13F), enriches data with AI summaries, and delivers personalized alerts to investors.

**Core Value Proposition:** Transform raw SEC EDGAR data into actionable, real-time insights delivered where users already are (Discord, email, web).

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Feature Inventory](#2-feature-inventory)
3. [Data Sources & Processing](#3-data-sources--processing)
4. [Notification System](#4-notification-system)
5. [User Management](#5-user-management)
6. [Revenue Model](#6-revenue-model)
7. [Technical Architecture](#7-technical-architecture)
8. [Competitive Advantages](#8-competitive-advantages)
9. [Growth Opportunities](#9-growth-opportunities)

---

## 1. Product Overview

### What FilingsFlow Does

| Capability | Description |
|------------|-------------|
| **SEC Monitoring** | Real-time polling of Form 3, 4, 5 (insider trades) and 13F (institutional holdings) |
| **AI Enrichment** | Google Gemini-powered summaries explaining transaction significance |
| **Multi-Channel Delivery** | Web dashboard, Discord bot, email alerts, Discord DMs |
| **Cluster Detection** | Identifies coordinated insider activity patterns |
| **Whale Tracking** | Shows which institutions own specific stocks |

### Target Users

- **Retail Investors** - Track insider activity on stocks they own
- **Day Traders** - Real-time alerts for momentum signals
- **Discord Communities** - Finance servers, stock clubs, trading groups
- **Investment Clubs** - Shared watchlists and collaborative tracking
- **Financial Analysts** - Research and due diligence

---

## 2. Feature Inventory

### 2.1 Web Application

| Page | Features | Tier Required |
|------|----------|---------------|
| **/filings** | Browse all SEC filings, filter by form type/ticker, AI summaries | Free |
| **/insiders** | Global insider transaction feed, filter by type/value | Free |
| **/funds** | Search 13F holdings, track specific funds | Free (view), Pro (track) |
| **/clusters** | Detect coordinated insider activity patterns | Pro+ |
| **/watchlist** | Personal ticker tracking with alert preferences | Free (5), Pro (25), Premium (100) |
| **/settings** | Account, subscription, notification preferences | Free |

### 2.2 Discord Bot Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `/filing [ticker]` | Fetch latest SEC filings for a stock | `/filing AAPL` |
| `/insider [ticker]` | Recent insider transactions with metrics | `/insider NVDA type:purchases` |
| `/13f [fund]` | Search 13F holdings by fund name/CIK | `/13f "Berkshire Hathaway"` |
| `/whales [ticker]` | Show institutional owners of a stock | `/whales TSLA` |
| `/watchlist` | Manage server-specific watchlist | `/watchlist add MSFT` |
| `/referral` | View referral dashboard and shareable link | `/referral` |
| `/invite` | Get bot invite link for other servers | `/invite` |

### 2.3 Background Jobs (Automated)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `pollSECFilings` | Every minute (market hours) | Fetch new Form 3/4/5 filings |
| `poll13FFilings` | Weekly (Mondays 8AM) | Fetch quarterly 13F reports |
| `generateAISummaries` | Every 5 min (market hours) | Create AI summaries for new filings |
| `sendWatchlistNotifications` | Event-driven | Real-time alerts to users |
| `sendDailyDigest` | Daily 6PM ET | Aggregate daily email digest |
| `fetchTickerNews` | Every 15 min (market hours) | Cache news for context enrichment |
| `confirmReferrals` | Hourly | Validate and confirm pending referrals |

### 2.4 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/watchlist` | GET/POST | User watchlist CRUD |
| `/api/tracked-funds` | GET/POST | 13F fund tracking |
| `/api/clusters` | GET | Cluster detection (Pro+) |
| `/api/referrals/*` | Various | Referral system |
| `/api/stripe/*` | Various | Payment processing |
| `/api/settings/notifications` | POST | Update preferences |

---

## 3. Data Sources & Processing

### 3.1 SEC EDGAR Integration

**Supported Form Types:**

| Form | Description | Polling Frequency |
|------|-------------|-------------------|
| Form 3 | Initial beneficial ownership | Every minute |
| Form 4 | Changes in beneficial ownership | Every minute |
| Form 5 | Annual ownership statement | Every minute |
| 13F-HR | Quarterly institutional holdings | Weekly |
| 13F-HR/A | Amended holdings report | Weekly |

**Data Extracted from Form 4:**
- Insider identity (name, CIK, title)
- Company info (ticker, name, CIK)
- Transaction details (type, date, shares, price, value)
- Ownership type (direct vs. indirect/trust)
- 10b5-1 plan indicator
- Shares owned after transaction
- Derivative vs. non-derivative

**Data Extracted from 13F:**
- Fund identity (name, CIK)
- Report period date
- Holdings (CUSIP, issuer, shares, value)
- Investment discretion
- Voting authority breakdown

### 3.2 AI Summarization

**Provider:** Google Gemini 2.0 Flash Lite

**Summary Content:**
- Transaction action and value
- Insider role significance
- Pattern detection (buying vs selling)
- Contextual relevance

**Example Output:**
> "CEO Tim Cook purchased 50,000 shares ($6.25M) - his first open market purchase in 8 months. This discretionary buy represents a 15% increase in his direct holdings."

### 3.3 News Aggregation

**Sources:**
- Yahoo Finance RSS
- Google News RSS
- SEC 8-K filings

**Use Cases:**
- Enrich transaction context in Discord embeds
- Provide market news alongside filings
- Detect corporate events

---

## 4. Notification System

### 4.1 Delivery Channels

| Channel | Trigger | Content |
|---------|---------|---------|
| **Email (Real-time)** | New filing matches watchlist | Full transaction details, AI summary, SEC link |
| **Email (Daily Digest)** | 6PM ET daily | Top 20 transactions across all watched tickers |
| **Discord DM** | New filing matches watchlist | Formatted message with transaction details |
| **Discord Webhook** | Configurable | Rich embed with color-coded transaction type |

### 4.2 User Preferences

| Setting | Options | Default |
|---------|---------|---------|
| Email enabled | Yes/No | Yes |
| Email frequency | Realtime, Daily, Weekly, Never | Daily |
| Discord DM enabled | Yes/No | No |
| Min transaction value | $0 - $10M+ | $0 |
| C-suite only | Yes/No | No |

### 4.3 Alert Types

**Insider Transaction Alert:**
```
AAPL - Insider Purchase
━━━━━━━━━━━━━━━━━━━━━━━━
Tim Cook (CEO) | First trade in 8 months

Transaction: 50,000 shares | $6.25M | Direct

Context:
• 4.2x larger than historical average
• Top 0.5% by value this month
• Discretionary trade (not pre-planned)

📰 Recent News:
• "Apple announces Q4 earnings beat" (2h ago)
```

**Cluster Alert:**
```
NVDA - Insider Cluster Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 insiders bought within 5 days

Total: $8.5M across 42,000 shares

Participants:
1. Jensen Huang (CEO) - $5.2M
2. Colette Kress (CFO) - $2.1M
3. Ajay Puri (EVP) - $1.2M

Pattern: 3/3 discretionary (non-10b5-1) trades
```

---

## 5. User Management

### 5.1 Authentication

- **Provider:** Supabase Auth + Discord OAuth
- **Flow:** Discord login → callback → user creation → dashboard
- **Referral Support:** `?ref=CODE` query parameter tracked at signup

### 5.2 User Profile Data

| Field | Purpose |
|-------|---------|
| email | Account identifier, email delivery |
| discord_id | Discord DM delivery, bot linking |
| discord_username | Display name |
| subscription_tier | Feature gating |
| stripe_customer_id | Payment processing |
| subscription_status | Active/canceled/past_due/trialing |

### 5.3 Watchlist System

**Personal Watchlists:**
- User-specific ticker tracking
- Tier-based limits (5/25/100)
- Per-ticker alert toggles (insider, 13F, 8K)

**Server Watchlists (Discord):**
- Guild-specific shared tracking
- Requires Manage Guild permission
- Visible to all server members
- Separate from personal watchlists

### 5.4 Referral Program

**Code Generation:**
- 8-character alphanumeric (no ambiguous chars: I, O, 0, 1)
- One code per user
- Shareable link: `filingsflow.com/signup?ref=CODE`

**Reward Milestones:**

| Referrals | Credit | Cumulative |
|-----------|--------|------------|
| 5 | $5 | $5 |
| 15 | $20 | $25 |
| 30 | $50 | $75 |
| 50+ | $100 | $175 |

**Fraud Prevention:**
- 24-hour confirmation delay
- IP velocity limits (max 3/IP/24h)
- Self-referral blocking
- Audit logging

---

## 6. Revenue Model

### 6.1 Subscription Tiers

| Tier | Price | Target User |
|------|-------|-------------|
| **Free** | $0/mo | Casual investors, trial users |
| **Pro** | $29/mo | Active traders, serious investors |
| **Premium** | $79/mo | Power users, investment clubs |

### 6.2 Feature Gating

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Watchlist tickers | 5 | 25 | 100 |
| Tracked funds (13F) | 3 | 15 | 50 |
| Real-time alerts | ❌ | ✅ | ✅ |
| AI summaries | ✅ | ✅ | ✅ |
| Cluster detection | ❌ | ✅ | ✅ |
| Email alerts | ❌ | ✅ | ✅ |
| Discord DM alerts | ❌ | ✅ | ✅ |
| API access | ❌ | 1K/day | 10K/day |
| Priority support | ❌ | ❌ | ✅ |

### 6.3 Payment Processing

**Provider:** Stripe

**Flow:**
1. User clicks "Upgrade" on settings page
2. POST to `/api/stripe/checkout` with tier selection
3. Stripe customer created (if new)
4. Redirect to Stripe-hosted checkout
5. Payment success → webhook → database update
6. User tier activated immediately

**Webhook Events Handled:**
- `checkout.session.completed` → Activate subscription
- `customer.subscription.updated` → Sync tier changes
- `customer.subscription.deleted` → Downgrade to free
- `invoice.payment_failed` → Mark as past_due

### 6.4 Revenue Levers

| Lever | Mechanism | Impact |
|-------|-----------|--------|
| **Tier limits** | Watchlist caps force upgrades | Direct conversion |
| **Feature gates** | Cluster detection Pro-only | Upgrade incentive |
| **Referral credits** | Stripe Customer Balance | Reduced churn, lower CAC |
| **Discord distribution** | Bot invite viral loop | Organic acquisition |
| **Daily digests** | Email engagement | Retention |

### 6.5 Unit Economics (Assumptions)

| Metric | Estimate | Notes |
|--------|----------|-------|
| Free→Pro conversion | 3-5% | Industry SaaS average |
| Pro→Premium upsell | 10-15% | Power user segment |
| Monthly churn | 5-8% | Subscription SaaS |
| CAC (organic) | $5-15 | Discord viral, referrals |
| CAC (paid) | $50-100 | If running ads |
| LTV (Pro) | $290-580 | 10-20 month retention |
| LTV (Premium) | $790-1580 | 10-20 month retention |

---

## 7. Technical Architecture

### 7.1 Stack Overview

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Discord OAuth |
| Payments | Stripe |
| Email | Resend |
| AI | Google Gemini 2.0 Flash Lite |
| Jobs | Inngest |
| Bot | Discord.js |
| Hosting | Vercel (web), Railway (bot) |

### 7.2 Database Schema

**Core Tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, discord_id, subscription_tier |
| `filings` | SEC filings | accession_number, form_type, ticker, ai_summary |
| `insider_transactions` | Form 4 data | ticker, insider_name, shares, total_value |
| `holdings_13f` | 13F data | fund_cik, ticker, shares, value_usd |
| `watchlists` | User watchlists | user_id, ticker, alert_on_insider |
| `tracked_funds` | 13F tracking | user_id, cik, fund_name |
| `notification_preferences` | Alert settings | email_enabled, discord_dm_enabled |
| `referral_codes` | Referral codes | user_id, code |
| `referrals` | Referral tracking | referrer_id, referred_id, status |
| `referral_credits` | Credit awards | user_id, milestone, amount_cents |
| `server_watchlists` | Discord server lists | guild_id, ticker |
| `news_cache` | News articles | ticker, title, url, published_at |

### 7.3 External Integrations

| Service | Purpose | Cost Model |
|---------|---------|------------|
| SEC EDGAR | Data source | Free (rate-limited) |
| Google Gemini | AI summaries | Pay-per-token |
| Stripe | Payments | 2.9% + $0.30/txn |
| Resend | Email | $0.001/email |
| Supabase | Database | Free tier, then usage |
| Inngest | Background jobs | Free tier, then events |
| Discord API | Bot | Free |

---

## 8. Competitive Advantages

### 8.1 Differentiation

| Advantage | Description |
|-----------|-------------|
| **Discord-Native** | Only SEC filing bot with this depth of integration |
| **Real-Time** | Minute-level polling vs. daily updates from competitors |
| **AI Summaries** | Plain-English explanations vs. raw data |
| **Cluster Detection** | Unique coordinated activity pattern detection |
| **Referral Program** | Built-in viral growth mechanism |
| **Freemium Model** | Low barrier to entry, high conversion potential |

### 8.2 Moat Building

| Asset | Defensibility |
|-------|---------------|
| Discord community penetration | Network effects |
| AI summary quality | Prompt engineering, model tuning |
| Real-time infrastructure | Engineering investment |
| User watchlist data | Switching costs |

---

## 9. Growth Opportunities

### 9.1 Product Expansion

| Opportunity | Description | Revenue Impact |
|-------------|-------------|----------------|
| **API Access** | Usage-based pricing for developers | New revenue stream |
| **White-Label Bot** | Custom Discord bots for communities | B2B contracts |
| **Options Flow** | Track unusual options activity | Premium upsell |
| **Earnings Calendar** | Integrate earnings dates | Engagement |
| **Price Alerts** | Stock price notifications | Stickiness |
| **Mobile App** | iOS/Android push notifications | Reach expansion |

### 9.2 Monetization Expansion

| Opportunity | Description | Effort |
|-------------|-------------|--------|
| **Annual Plans** | 20% discount for yearly | Low |
| **Team Plans** | Multi-seat pricing for investment clubs | Medium |
| **Data Licensing** | Sell aggregated data to institutions | High |
| **Sponsored Alerts** | Broker/platform partnerships | Medium |
| **Premium API** | Higher rate limits, webhooks | Medium |

### 9.3 Distribution Expansion

| Channel | Strategy |
|---------|----------|
| **Discord Servers** | Bot invite virality, server partnerships |
| **Reddit** | r/wallstreetbets, r/investing, r/stocks |
| **Twitter/X** | Automated filing tweets (future) |
| **YouTube** | Creator sponsorships |
| **Podcasts** | Finance podcast ads |

---

## Appendix A: Environment Variables

```
# App
NEXT_PUBLIC_APP_URL=https://filingsflow.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# SEC
SEC_USER_AGENT=FilingsFlow/1.0 (email@example.com)

# AI
GOOGLE_AI_API_KEY=AIzaSy...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Email
RESEND_API_KEY=re_...

# Discord
DISCORD_BOT_TOKEN=MzA0...
DISCORD_CLIENT_ID=123456...

# Jobs
INNGEST_EVENT_KEY=evt_...
INNGEST_SIGNING_KEY=signkey_...
```

---

## Appendix B: Key File Locations

| Category | Path |
|----------|------|
| API Routes | `/src/app/api/` |
| Dashboard Pages | `/src/app/(dashboard)/` |
| Discord Commands | `/bot/src/commands/` |
| Background Jobs | `/src/lib/inngest/functions.ts` |
| SEC Client | `/src/lib/sec/client.ts` |
| AI Summarization | `/src/lib/ai/summarize.ts` |
| Notifications | `/src/lib/notifications/` |
| Referrals | `/src/lib/referrals/` |
| Stripe | `/src/lib/stripe/` |
| Database Types | `/src/types/database.ts` |
| Migrations | `/supabase/migrations/` |

---

*Document prepared for business analysis. For technical implementation details, see codebase directly.*
