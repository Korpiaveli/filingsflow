# FilingsFlow

SEC Filing Intelligence Platform - Real-time tracking of insider transactions and institutional holdings with AI-powered summaries.

## Features

- **Real-time SEC Polling** - Form 3/4/5 filings every minute during market hours
- **Insider Transactions** - Track buys, sells, grants with filtering
- **13F Holdings** - Institutional fund positions (quarterly)
- **AI Summaries** - Claude-powered plain English summaries
- **Watchlists** - Track tickers with customizable alerts
- **Subscription Tiers** - Free (5 tickers), Pro (25), Premium (100)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth)
- Inngest (Background Jobs)
- Stripe (Payments)
- Claude API (AI Summaries)
- Tailwind CSS

## Prerequisites

- Node.js 18+
- npm
- Supabase account
- Stripe account (test mode for development)
- Anthropic API key
- Discord application (for OAuth)

## Setup

### 1. Install Dependencies

```bash
cd filingsflow
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SEC API (required - include your email for compliance)
SEC_USER_AGENT=FilingsFlow/1.0 (your@email.com)

# Inngest (background jobs)
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# AI Summaries
ANTHROPIC_API_KEY=sk-ant-...

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Email Notifications (optional)
RESEND_API_KEY=re_...
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database migrations (SQL):

```sql
-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  discord_id text,
  discord_username text,
  avatar_url text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'premium')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'active' check (subscription_status in ('active', 'canceled', 'past_due', 'trialing')),
  trial_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SEC Filings
create table public.filings (
  id uuid primary key default gen_random_uuid(),
  cik text not null,
  accession_number text unique not null,
  form_type text not null,
  filed_at timestamptz,
  accepted_at timestamptz,
  ticker text,
  company_name text,
  filer_name text,
  file_url text,
  raw_content text,
  ai_summary text,
  ai_summary_generated_at timestamptz,
  processed_at timestamptz,
  parse_error text,
  created_at timestamptz default now()
);

-- Insider Transactions (from Form 3/4/5)
create table public.insider_transactions (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid references filings(id) on delete cascade,
  ticker text,
  company_cik text,
  company_name text,
  insider_cik text,
  insider_name text,
  insider_title text,
  is_director boolean default false,
  is_officer boolean default false,
  is_ten_percent_owner boolean default false,
  transaction_type text,
  transaction_code_description text,
  transaction_date date,
  shares numeric,
  price_per_share numeric,
  total_value numeric,
  shares_owned_after numeric,
  direct_or_indirect text check (direct_or_indirect in ('D', 'I')),
  is_derivative boolean default false,
  is_10b51_plan boolean default false,
  footnotes text,
  created_at timestamptz default now()
);

-- 13F Holdings (institutional)
create table public.holdings_13f (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid references filings(id) on delete cascade,
  fund_cik text,
  fund_name text,
  report_date date,
  ticker text,
  cusip text,
  issuer_name text,
  title_of_class text,
  shares numeric,
  value_usd numeric,
  put_call text check (put_call in ('PUT', 'CALL')),
  investment_discretion text check (investment_discretion in ('SOLE', 'SHARED', 'NONE')),
  voting_authority_sole numeric,
  voting_authority_shared numeric,
  voting_authority_none numeric,
  created_at timestamptz default now()
);

-- User Watchlists
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  ticker text not null,
  company_name text,
  alert_on_insider boolean default true,
  alert_on_13f boolean default true,
  alert_on_8k boolean default false,
  created_at timestamptz default now(),
  unique(user_id, ticker)
);

-- Tracked Funds (for 13F alerts)
create table public.tracked_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cik text not null,
  fund_name text,
  created_at timestamptz default now(),
  unique(user_id, cik)
);

-- Notification Preferences
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete cascade,
  email_enabled boolean default true,
  email_frequency text default 'daily' check (email_frequency in ('realtime', 'daily', 'weekly', 'never')),
  discord_dm_enabled boolean default false,
  min_transaction_value numeric default 0,
  insider_types text[] default array['officer', 'director', 'ten_percent_owner'],
  c_suite_only boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index idx_filings_ticker on filings(ticker);
create index idx_filings_form_type on filings(form_type);
create index idx_filings_filed_at on filings(filed_at desc);
create index idx_insider_transactions_ticker on insider_transactions(ticker);
create index idx_insider_transactions_date on insider_transactions(transaction_date desc);
create index idx_holdings_13f_ticker on holdings_13f(ticker);
create index idx_watchlists_user on watchlists(user_id);

-- Helper functions
create or replace function get_watchlist_count(p_user_id uuid)
returns integer as $$
  select count(*)::integer from watchlists where user_id = p_user_id;
$$ language sql security definer;

create or replace function can_add_to_watchlist(p_user_id uuid)
returns boolean as $$
declare
  v_tier text;
  v_count integer;
  v_limit integer;
begin
  select subscription_tier into v_tier from users where id = p_user_id;
  select get_watchlist_count(p_user_id) into v_count;

  v_limit := case v_tier
    when 'premium' then 100
    when 'pro' then 25
    else 5
  end;

  return v_count < v_limit;
end;
$$ language plpgsql security definer;
```

3. Enable Discord OAuth in Supabase Dashboard:
   - Go to Authentication → Providers → Discord
   - Add your Discord application credentials
   - Set redirect URL to `https://your-project.supabase.co/auth/v1/callback`

4. Enable Row Level Security (RLS) policies as needed

### 4. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)

2. Create two subscription products:
   - **Pro** - $29/month
   - **Premium** - $79/month

3. Copy the price IDs to your `.env.local`

4. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Inngest Setup (Background Jobs)

For local development:

```bash
npx inngest-cli@latest dev
```

This starts the Inngest dev server at `http://localhost:8288`.

The app registers these background jobs:
- `pollSECFilings` - Runs every minute (6AM-8PM ET, Mon-Fri)
- `generateAISummaries` - Runs every 5 minutes during market hours
- `manualPollFilings` - Triggered on demand

## Running the App

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, callback)
│   ├── (dashboard)/       # Protected pages
│   │   ├── filings/       # SEC filings browser
│   │   ├── insiders/      # Insider transactions
│   │   ├── funds/         # 13F holdings
│   │   ├── watchlist/     # User watchlist
│   │   └── settings/      # Account settings
│   └── api/               # API routes
│       ├── inngest/       # Background job endpoint
│       ├── stripe/        # Payment webhooks
│       ├── watchlist/     # Watchlist CRUD
│       └── settings/      # User settings
├── components/            # React components
├── lib/
│   ├── ai/               # Claude integration
│   ├── inngest/          # Background job definitions
│   ├── sec/              # SEC EDGAR API client & parsers
│   ├── stripe/           # Stripe client
│   ├── supabase/         # Database client
│   └── utils/            # Utilities
└── types/                # TypeScript types
```

## Subscription Tiers

| Feature | Free | Pro ($29/mo) | Premium ($79/mo) |
|---------|------|--------------|------------------|
| Watchlist tickers | 5 | 25 | 100 |
| Insider alerts | Basic | + Cluster detection | + All features |
| 13F tracking | View only | + Fund alerts | + Overlap analysis |
| AI Summaries | Yes | Yes | Yes |
| API Access | No | 1,000 req/day | 10,000 req/day |

## SEC API Compliance

This app follows SEC EDGAR fair access guidelines:
- Rate limiting (max 10 requests/second)
- User-Agent header with contact email
- No excessive automated downloads

Set your `SEC_USER_AGENT` with a valid email address.

## License

UNLICENSED - Private project
