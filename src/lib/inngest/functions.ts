import { inngest } from './client'
import { secClient, SUPPORTED_FORM_TYPES } from '@/lib/sec/client'
import { parseForm4Xml, calculateTransactionValue } from '@/lib/sec/parsers/form4'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables } from '@/types/database'

type FilingRow = Tables<'filings'>

interface SerializedFiling {
  cik: string
  accessionNumber: string
  formType: string
  filedAt: string
  ticker: string | null
  companyName: string | null
  fileUrl: string
}

export const pollSECFilings = inngest.createFunction(
  {
    id: 'poll-sec-filings',
    name: 'Poll SEC EDGAR Filings',
    retries: 3,
  },
  { cron: '* 6-20 * * 1-5' },
  async ({ step }) => {
    const entries = await step.run('fetch-atom-feed', async () => {
      const allEntries = []

      const form4Entries = await secClient.fetchAtomFeed('4', 40)
      allEntries.push(...form4Entries)

      const form3Entries = await secClient.fetchAtomFeed('3', 20)
      const form5Entries = await secClient.fetchAtomFeed('5', 10)
      allEntries.push(...form3Entries, ...form5Entries)

      return allEntries
    })

    if (entries.length === 0) {
      return { processed: 0, new: 0 }
    }

    const filings = await step.run('parse-entries', async (): Promise<SerializedFiling[]> => {
      const parsed: SerializedFiling[] = []

      for (const entry of entries) {
        const filing = secClient.parseFilingFromAtomEntry(entry)
        if (filing && SUPPORTED_FORM_TYPES.includes(filing.formType)) {
          parsed.push({
            cik: filing.cik,
            accessionNumber: filing.accessionNumber,
            formType: filing.formType,
            filedAt: filing.filedAt.toISOString(),
            ticker: filing.ticker ?? null,
            companyName: filing.companyName ?? null,
            fileUrl: filing.fileUrl,
          })
        }
      }

      return parsed
    })

    const typedFilings = filings as SerializedFiling[]

    const newFilings = await step.run('filter-new-filings', async (): Promise<SerializedFiling[]> => {
      const supabase = createAdminClient()

      const accessionNumbers = typedFilings.map((f) => f.accessionNumber)

      const { data: existing } = await supabase
        .from('filings')
        .select('accession_number')
        .in('accession_number', accessionNumbers)

      const existingSet = new Set(existing?.map((e) => e.accession_number) || [])

      return typedFilings.filter((f) => !existingSet.has(f.accessionNumber))
    })

    const typedNewFilings = newFilings as SerializedFiling[]

    if (typedNewFilings.length === 0) {
      return { processed: typedFilings.length, new: 0 }
    }

    const insertedFilings = await step.run('insert-filings', async (): Promise<FilingRow[]> => {
      const supabase = createAdminClient()

      const filingsToInsert = typedNewFilings.map((f) => ({
        cik: f.cik,
        accession_number: f.accessionNumber,
        form_type: f.formType,
        filed_at: f.filedAt,
        ticker: f.ticker,
        company_name: f.companyName,
        file_url: f.fileUrl,
      }))

      const { data, error } = await supabase
        .from('filings')
        .insert(filingsToInsert)
        .select()

      if (error) {
        console.error('Error inserting filings:', error)
        throw error
      }

      return (data || []) as FilingRow[]
    })

    const typedInsertedFilings = insertedFilings as FilingRow[]

    const processedTransactions = await step.run('process-form4s', async () => {
      const supabase = createAdminClient()
      let totalTransactions = 0

      const form4Filings = typedInsertedFilings.filter(
        (f) => f.form_type === '4' || f.form_type === '3' || f.form_type === '5'
      )

      for (const filing of form4Filings) {
        try {
          const xml = await secClient.fetchForm4Xml(filing.cik, filing.accession_number)
          const parsed = parseForm4Xml(xml, filing.accession_number)

          if (!parsed) {
            await supabase
              .from('filings')
              .update({ parse_error: 'Failed to parse Form 4 XML' })
              .eq('id', filing.id)
            continue
          }

          await supabase
            .from('filings')
            .update({
              ticker: parsed.issuer.ticker || filing.ticker,
              company_name: parsed.issuer.name,
              filer_name: parsed.reportingOwner.name,
              processed_at: new Date().toISOString(),
            })
            .eq('id', filing.id)

          const transactionsToInsert = parsed.transactions.map((txn) => ({
            filing_id: filing.id,
            ticker: parsed.issuer.ticker,
            company_cik: parsed.issuer.cik,
            company_name: parsed.issuer.name,
            insider_cik: parsed.reportingOwner.cik,
            insider_name: parsed.reportingOwner.name,
            insider_title: parsed.reportingOwner.title,
            is_director: parsed.reportingOwner.isDirector,
            is_officer: parsed.reportingOwner.isOfficer,
            is_ten_percent_owner: parsed.reportingOwner.isTenPercentOwner,
            transaction_type: txn.transactionCode,
            transaction_date: txn.transactionDate,
            shares: txn.shares,
            price_per_share: txn.pricePerShare,
            total_value: calculateTransactionValue(txn),
            shares_owned_after: txn.sharesOwnedAfter,
            direct_or_indirect: txn.directOrIndirect as 'D' | 'I' | null,
            is_derivative: txn.isDerivative,
            is_10b51_plan: parsed.is10b51Plan,
            footnotes: parsed.footnotes.length > 0 ? parsed.footnotes.join('\n') : null,
          }))

          if (transactionsToInsert.length > 0) {
            const { error: txnError } = await supabase
              .from('insider_transactions')
              .insert(transactionsToInsert)

            if (txnError) {
              console.error('Error inserting transactions:', txnError)
            } else {
              totalTransactions += transactionsToInsert.length
            }
          }
        } catch (error) {
          console.error(`Error processing filing ${filing.accession_number}:`, error)
          await supabase
            .from('filings')
            .update({
              parse_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', filing.id)
        }
      }

      return totalTransactions
    })

    // Emit notification events for processed filings
    await step.run('emit-notification-events', async () => {
      const filingsWithTickers = typedInsertedFilings.filter(f => f.ticker)

      for (const filing of filingsWithTickers) {
        await inngest.send({
          name: 'filings/new.processed',
          data: {
            filingId: filing.id,
            ticker: filing.ticker,
          }
        })
      }

      return filingsWithTickers.length
    })

    return {
      processed: typedFilings.length,
      new: typedNewFilings.length,
      transactions: processedTransactions,
    }
  }
)

export const manualPollFilings = inngest.createFunction(
  {
    id: 'manual-poll-filings',
    name: 'Manual Poll SEC Filings',
  },
  { event: 'sec/poll.requested' },
  async ({ step }) => {
    const entries = await step.run('fetch-atom-feed', async () => {
      return secClient.fetchAtomFeed('4', 20)
    })

    return { entries: entries.length }
  }
)

export const generateAISummaries = inngest.createFunction(
  {
    id: 'generate-ai-summaries',
    name: 'Generate AI Summaries',
    retries: 2,
  },
  { cron: '*/5 6-20 * * 1-5' },
  async ({ step }) => {
    const { generateFilingSummary } = await import('@/lib/ai/summarize')

    const filingsToSummarize = await step.run('fetch-unsummarized', async () => {
      const supabase = createAdminClient()

      const { data } = await supabase
        .from('filings')
        .select(`
          *,
          insider_transactions (*)
        `)
        .is('ai_summary', null)
        .not('processed_at', 'is', null)
        .order('filed_at', { ascending: false })
        .limit(10)

      return data || []
    })

    if (filingsToSummarize.length === 0) {
      return { summarized: 0 }
    }

    let summarized = 0

    for (const filing of filingsToSummarize) {
      await step.run(`summarize-${filing.id}`, async () => {
        const supabase = createAdminClient()

        const summary = await generateFilingSummary(filing as FilingRow & { insider_transactions: Tables<'insider_transactions'>[] })

        if (summary) {
          await supabase
            .from('filings')
            .update({
              ai_summary: summary,
              ai_summary_generated_at: new Date().toISOString(),
            })
            .eq('id', filing.id)

          summarized++
        }
      })
    }

    return { summarized }
  }
)

export const sendWatchlistNotifications = inngest.createFunction(
  {
    id: 'send-watchlist-notifications',
    name: 'Send Watchlist Notifications',
    retries: 2,
  },
  { event: 'filings/new.processed' },
  async ({ event, step }) => {
    const { sendInsiderAlert } = await import('@/lib/notifications/email')
    const { sendDiscordInsiderAlert, sendDiscordDM } = await import('@/lib/notifications/discord')

    const filingId = event.data.filingId as string
    const ticker = event.data.ticker as string

    if (!ticker) {
      return { notified: 0, reason: 'no ticker' }
    }

    const watchlistUsers = await step.run('get-watchlist-users', async () => {
      const supabase = createAdminClient()

      const { data } = await supabase
        .from('watchlists')
        .select(`
          user_id,
          alert_on_insider,
          users!inner (
            id,
            email,
            discord_id,
            notification_preferences (
              email_enabled,
              email_frequency,
              discord_dm_enabled,
              min_transaction_value
            )
          )
        `)
        .eq('ticker', ticker.toUpperCase())
        .eq('alert_on_insider', true)

      return data || []
    })

    if (watchlistUsers.length === 0) {
      return { notified: 0, reason: 'no users watching' }
    }

    const filing = await step.run('get-filing-data', async () => {
      const supabase = createAdminClient()

      const { data } = await supabase
        .from('filings')
        .select(`
          *,
          insider_transactions (*)
        `)
        .eq('id', filingId)
        .single()

      return data
    })

    if (!filing || !filing.insider_transactions?.length) {
      return { notified: 0, reason: 'no transactions' }
    }

    const txn = filing.insider_transactions[0]!
    const transactionType = (txn.shares ?? 0) > 0 ? 'buy' : 'sell'
    const totalValue = Math.abs(txn.total_value ?? 0)

    let notified = 0

    for (const watchItem of watchlistUsers) {
      const user = watchItem.users as {
        id: string
        email: string | null
        discord_id: string | null
        notification_preferences: Array<{
          email_enabled: boolean
          email_frequency: string
          discord_dm_enabled: boolean
          min_transaction_value: number
        }> | null
      }
      const prefs = user?.notification_preferences?.[0]

      if (!prefs) continue

      if (prefs.min_transaction_value && totalValue < prefs.min_transaction_value) {
        continue
      }

      const alertData = {
        ticker: ticker,
        companyName: filing.company_name || ticker,
        insiderName: txn.insider_name || 'Unknown',
        insiderTitle: txn.insider_title || '',
        transactionType: transactionType as 'buy' | 'sell' | 'grant',
        shares: Math.abs(txn.shares || 0),
        totalValue,
        transactionDate: txn.transaction_date || '',
        filingUrl: filing.file_url || `https://sec.gov`,
        aiSummary: filing.ai_summary || undefined,
      }

      await step.run(`notify-${user.id}`, async () => {
        if (prefs.email_enabled && prefs.email_frequency === 'realtime' && user.email) {
          await sendInsiderAlert(user.email, alertData)
          notified++
        }

        if (prefs.discord_dm_enabled && user.discord_id) {
          const botToken = process.env.DISCORD_BOT_TOKEN
          if (botToken) {
            const formattedValue = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(alertData.totalValue)

            const message = `**${alertData.ticker}** - Insider ${alertData.transactionType.toUpperCase()}\n` +
              `${alertData.insiderName} (${alertData.insiderTitle})\n` +
              `Shares: ${Math.abs(alertData.shares).toLocaleString()} | Value: ${formattedValue}\n` +
              `${alertData.aiSummary ? `\n_${alertData.aiSummary}_` : ''}\n` +
              `[View Filing](${alertData.filingUrl})`

            await sendDiscordDM(user.discord_id, botToken, message)
          } else if (process.env.DISCORD_WEBHOOK_URL) {
            await sendDiscordInsiderAlert(process.env.DISCORD_WEBHOOK_URL, alertData)
          }
        }
      })
    }

    return { notified, ticker, filingId }
  }
)

export const sendDailyDigest = inngest.createFunction(
  {
    id: 'send-daily-digest',
    name: 'Send Daily Digest Emails',
    retries: 2,
  },
  { cron: '0 18 * * 1-5' },
  async ({ step }) => {
    const { sendDailyDigest: sendDigestEmail } = await import('@/lib/notifications/email')

    const usersToNotify = await step.run('get-daily-digest-users', async () => {
      const supabase = createAdminClient()

      const { data } = await supabase
        .from('users')
        .select(`
          id,
          email,
          notification_preferences!inner (
            email_enabled,
            email_frequency,
            min_transaction_value
          ),
          watchlists (
            ticker
          )
        `)
        .eq('notification_preferences.email_frequency', 'daily')
        .eq('notification_preferences.email_enabled', true)

      return data || []
    })

    if (usersToNotify.length === 0) {
      return { sent: 0 }
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let sent = 0

    for (const user of usersToNotify) {
      if (!user.email || !user.watchlists?.length) continue

      const tickers = user.watchlists.map((w: { ticker: string }) => w.ticker)
      const prefs = user.notification_preferences as unknown as { min_transaction_value: number | null }
      const minValue = prefs?.min_transaction_value ?? 0

      await step.run(`digest-${user.id}`, async () => {
        const supabase = createAdminClient()

        const { data: transactions } = await supabase
          .from('insider_transactions')
          .select(`
            *,
            filings!inner (
              file_url,
              ai_summary
            )
          `)
          .in('ticker', tickers)
          .gte('created_at', yesterday.toISOString())
          .gte('total_value', minValue)
          .order('total_value', { ascending: false })
          .limit(20)

        if (!transactions?.length) return

        const insiderAlerts = transactions.map(txn => ({
          ticker: txn.ticker || '',
          companyName: txn.company_name || '',
          insiderName: txn.insider_name || '',
          insiderTitle: txn.insider_title || '',
          transactionType: ((txn.shares ?? 0) > 0 ? 'buy' : 'sell') as 'buy' | 'sell' | 'grant',
          shares: Math.abs(txn.shares ?? 0),
          totalValue: Math.abs(txn.total_value ?? 0),
          transactionDate: txn.transaction_date || '',
          filingUrl: (txn.filings as { file_url?: string })?.file_url || '',
          aiSummary: (txn.filings as { ai_summary?: string })?.ai_summary,
        }))

        const dateStr = today.toISOString().split('T')[0]
        if (dateStr) {
          await sendDigestEmail(user.email!, {
            insiderAlerts,
            holdings13F: [],
            date: dateStr,
          })
        }

        sent++
      })
    }

    return { sent }
  }
)

export const poll13FFilings = inngest.createFunction(
  {
    id: 'poll-13f-filings',
    name: 'Poll 13F Holdings Filings',
    retries: 3,
  },
  { cron: '0 8 * * 1' },
  async ({ step }) => {
    const { parse13FXml, cusipToTicker } = await import('@/lib/sec/parsers/form13f')

    const entries = await step.run('fetch-13f-feed', async () => {
      return secClient.fetchAtomFeed('13F-HR', 50)
    })

    if (entries.length === 0) {
      return { processed: 0, new: 0 }
    }

    const filings = await step.run('parse-13f-entries', async () => {
      const parsed: SerializedFiling[] = []

      for (const entry of entries) {
        const filing = secClient.parseFilingFromAtomEntry(entry)
        if (filing && (filing.formType === '13F-HR' || filing.formType === '13F-HR/A')) {
          parsed.push({
            cik: filing.cik,
            accessionNumber: filing.accessionNumber,
            formType: filing.formType,
            filedAt: filing.filedAt.toISOString(),
            ticker: null,
            companyName: filing.companyName ?? null,
            fileUrl: filing.fileUrl,
          })
        }
      }

      return parsed
    })

    const newFilings = await step.run('filter-new-13f', async () => {
      const supabase = createAdminClient()

      const accessionNumbers = filings.map((f) => f.accessionNumber)

      const { data: existing } = await supabase
        .from('filings')
        .select('accession_number')
        .in('accession_number', accessionNumbers)

      const existingSet = new Set(existing?.map((e) => e.accession_number) || [])

      return filings.filter((f) => !existingSet.has(f.accessionNumber))
    })

    if (newFilings.length === 0) {
      return { processed: filings.length, new: 0 }
    }

    const insertedFilings = await step.run('insert-13f-filings', async () => {
      const supabase = createAdminClient()

      const filingsToInsert = newFilings.map((f) => ({
        cik: f.cik,
        accession_number: f.accessionNumber,
        form_type: f.formType,
        filed_at: f.filedAt,
        ticker: null,
        company_name: f.companyName,
        file_url: f.fileUrl,
      }))

      const { data, error } = await supabase
        .from('filings')
        .insert(filingsToInsert)
        .select()

      if (error) {
        console.error('Error inserting 13F filings:', error)
        throw error
      }

      return (data || []) as FilingRow[]
    })

    let totalHoldings = 0

    for (const filing of insertedFilings) {
      await step.run(`process-13f-${filing.id}`, async () => {
        const supabase = createAdminClient()

        try {
          const xml = await secClient.fetch13FXml(filing.cik, filing.accession_number)
          const parsed = parse13FXml(xml, filing.accession_number)

          if (!parsed) {
            await supabase
              .from('filings')
              .update({ parse_error: 'Failed to parse 13F XML' })
              .eq('id', filing.id)
            return
          }

          await supabase
            .from('filings')
            .update({
              filer_name: parsed.filerName,
              processed_at: new Date().toISOString(),
            })
            .eq('id', filing.id)

          const holdingsToInsert = parsed.holdings.map((h) => ({
            filing_id: filing.id,
            fund_cik: parsed.filerCik,
            fund_name: parsed.filerName,
            report_date: parsed.reportDate,
            ticker: cusipToTicker(h.cusip),
            cusip: h.cusip,
            issuer_name: h.nameOfIssuer,
            title_of_class: h.titleOfClass,
            shares: h.shares,
            value_usd: h.value,
            put_call: h.putCall || null,
            investment_discretion: h.investmentDiscretion,
            voting_authority_sole: h.votingAuthoritySole,
            voting_authority_shared: h.votingAuthorityShared,
            voting_authority_none: h.votingAuthorityNone,
          }))

          if (holdingsToInsert.length > 0) {
            const { error: holdError } = await supabase
              .from('holdings_13f')
              .insert(holdingsToInsert)

            if (holdError) {
              console.error('Error inserting 13F holdings:', holdError)
            } else {
              totalHoldings += holdingsToInsert.length
            }
          }
        } catch (error) {
          console.error(`Error processing 13F ${filing.accession_number}:`, error)
          await supabase
            .from('filings')
            .update({
              parse_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', filing.id)
        }
      })
    }

    return {
      processed: filings.length,
      new: newFilings.length,
      holdings: totalHoldings,
    }
  }
)

export const fetchTickerNews = inngest.createFunction(
  {
    id: 'fetch-ticker-news',
    name: 'Fetch News for Active Tickers',
    retries: 2,
  },
  { cron: '*/15 6-20 * * 1-5' },
  async ({ step }) => {
    const { fetchNewsForTickers } = await import('@/lib/news')

    const activeTickers = await step.run('get-active-tickers', async () => {
      const supabase = createAdminClient()

      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const { data: recentTransactions } = await supabase
        .from('insider_transactions')
        .select('ticker')
        .gte('created_at', oneDayAgo.toISOString())
        .not('ticker', 'is', null)

      const { data: watchlistTickers } = await supabase
        .from('watchlists')
        .select('ticker')
        .limit(50)

      const tickers = new Set<string>()

      recentTransactions?.forEach(t => {
        if (t.ticker) tickers.add(t.ticker.toUpperCase())
      })

      watchlistTickers?.forEach(w => {
        if (w.ticker) tickers.add(w.ticker.toUpperCase())
      })

      return Array.from(tickers).slice(0, 30)
    })

    if (activeTickers.length === 0) {
      return { fetched: 0 }
    }

    await step.run('fetch-news-batch', async () => {
      await fetchNewsForTickers(activeTickers)
    })

    return { fetched: activeTickers.length }
  }
)

export const cleanupEnrichmentCache = inngest.createFunction(
  {
    id: 'cleanup-enrichment-cache',
    name: 'Cleanup Enrichment Cache',
  },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const { cleanupExpiredCache } = await import('@/lib/news')

    const deleted = await step.run('cleanup-news-cache', async () => {
      return cleanupExpiredCache()
    })

    return { deleted }
  }
)

export const confirmReferrals = inngest.createFunction(
  {
    id: 'confirm-referrals',
    name: 'Confirm Pending Referrals',
    retries: 2,
  },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const {
      getPendingReferralsOver24h,
      isValidReferral,
      confirmReferral,
      rejectReferral,
      checkAndAwardMilestones,
    } = await import('@/lib/referrals')

    const pendingReferrals = await step.run('get-pending-referrals', async () => {
      const supabase = createAdminClient()
      return getPendingReferralsOver24h(supabase)
    })

    if (pendingReferrals.length === 0) {
      return { confirmed: 0, rejected: 0 }
    }

    let confirmed = 0
    let rejected = 0

    for (const referral of pendingReferrals) {
      await step.run(`process-referral-${referral.id}`, async () => {
        const supabase = createAdminClient()

        const validation = await isValidReferral(supabase, referral)

        if (validation.valid) {
          await confirmReferral(supabase, referral.id)
          await checkAndAwardMilestones(supabase, referral.referrer_id)
          confirmed++
        } else {
          await rejectReferral(supabase, referral.id, validation.reason || 'unknown')
          rejected++
        }
      })
    }

    return { confirmed, rejected }
  }
)

interface CongressionalTransaction {
  disclosure_date: string
  disclosure_year: number
  transaction_date: string
  owner: string
  ticker: string | null
  asset_description: string
  asset_type: string
  type: string
  amount: string
  comment?: string
  representative?: string
  district?: string
  ptr_link?: string
  senator?: string
  first_name?: string
  last_name?: string
  office?: string
}

function parseAmountRange(amount: string): { low: number; high: number } {
  const ranges: Record<string, { low: number; high: number }> = {
    '$1,001 - $15,000': { low: 1001, high: 15000 },
    '$15,001 - $50,000': { low: 15001, high: 50000 },
    '$50,001 - $100,000': { low: 50001, high: 100000 },
    '$100,001 - $250,000': { low: 100001, high: 250000 },
    '$250,001 - $500,000': { low: 250001, high: 500000 },
    '$500,001 - $1,000,000': { low: 500001, high: 1000000 },
    '$1,000,001 - $5,000,000': { low: 1000001, high: 5000000 },
    '$5,000,001 - $25,000,000': { low: 5000001, high: 25000000 },
    '$25,000,001 - $50,000,000': { low: 25000001, high: 50000000 },
    'Over $50,000,000': { low: 50000001, high: 100000000 },
  }
  return ranges[amount] || { low: 0, high: 0 }
}

export const pollCongressionalTrades = inngest.createFunction(
  {
    id: 'poll-congressional-trades',
    name: 'Poll Congressional Stock Trades',
    retries: 3,
  },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const supabase = createAdminClient()

    const logEntry = await step.run('create-sync-log', async () => {
      const { data } = await supabase
        .from('congressional_sync_log')
        .insert({ chamber: 'house', status: 'running' })
        .select()
        .single()
      return data
    })

    const houseData = await step.run('fetch-house-data', async () => {
      try {
        const response = await fetch(
          'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json',
          { headers: { 'User-Agent': 'FilingsFlow/1.0' } }
        )
        if (!response.ok) return []
        return (await response.json()) as CongressionalTransaction[]
      } catch (error) {
        console.error('Failed to fetch House data:', error)
        return []
      }
    })

    const senateData = await step.run('fetch-senate-data', async () => {
      try {
        const response = await fetch(
          'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json',
          { headers: { 'User-Agent': 'FilingsFlow/1.0' } }
        )
        if (!response.ok) return []
        return (await response.json()) as CongressionalTransaction[]
      } catch (error) {
        console.error('Failed to fetch Senate data:', error)
        return []
      }
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentHouse = houseData.filter(t => {
      const date = new Date(t.disclosure_date)
      return date >= thirtyDaysAgo
    })

    const recentSenate = senateData.filter(t => {
      const date = new Date(t.disclosure_date)
      return date >= thirtyDaysAgo
    })

    const insertedHouse = await step.run('upsert-house-trades', async () => {
      if (recentHouse.length === 0) return 0

      const records = recentHouse.map(t => {
        const { low, high } = parseAmountRange(t.amount)
        return {
          chamber: 'house' as const,
          member_name: t.representative || 'Unknown',
          state: t.district?.split('-')[0] || null,
          district: t.district || null,
          party: null,
          ticker: t.ticker === '--' ? null : t.ticker,
          asset_description: t.asset_description,
          asset_type: t.asset_type,
          transaction_type: t.type,
          transaction_date: t.transaction_date ? new Date(t.transaction_date).toISOString().split('T')[0] : null,
          disclosure_date: new Date(t.disclosure_date).toISOString().split('T')[0] as string,
          amount_range: t.amount,
          amount_low: low,
          amount_high: high,
          owner: t.owner,
          ptr_link: t.ptr_link || null,
          comment: t.comment || null,
        }
      })

      const { error } = await supabase
        .from('congressional_transactions')
        .upsert(records, { onConflict: 'chamber,member_name,disclosure_date,ticker,transaction_date,transaction_type,amount_range' })

      if (error) console.error('House upsert error:', error)
      return records.length
    })

    const insertedSenate = await step.run('upsert-senate-trades', async () => {
      if (recentSenate.length === 0) return 0

      const records = recentSenate.map(t => {
        const { low, high } = parseAmountRange(t.amount)
        const memberName = t.senator || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown'
        return {
          chamber: 'senate' as const,
          member_name: memberName,
          state: t.office || null,
          district: null,
          party: null,
          ticker: t.ticker === '--' ? null : t.ticker,
          asset_description: t.asset_description,
          asset_type: t.asset_type,
          transaction_type: t.type,
          transaction_date: t.transaction_date ? new Date(t.transaction_date).toISOString().split('T')[0] : null,
          disclosure_date: new Date(t.disclosure_date).toISOString().split('T')[0] as string,
          amount_range: t.amount,
          amount_low: low,
          amount_high: high,
          owner: t.owner,
          ptr_link: t.ptr_link || null,
          comment: t.comment || null,
        }
      })

      const { error } = await supabase
        .from('congressional_transactions')
        .upsert(records, { onConflict: 'chamber,member_name,disclosure_date,ticker,transaction_date,transaction_type,amount_range' })

      if (error) console.error('Senate upsert error:', error)
      return records.length
    })

    await step.run('update-sync-log', async () => {
      if (!logEntry?.id) return
      await supabase
        .from('congressional_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_fetched: houseData.length + senateData.length,
          records_inserted: insertedHouse + insertedSenate,
        })
        .eq('id', logEntry.id)
    })

    return {
      house: { fetched: houseData.length, recent: recentHouse.length, inserted: insertedHouse },
      senate: { fetched: senateData.length, recent: recentSenate.length, inserted: insertedSenate },
    }
  }
)

export const functions = [
  pollSECFilings,
  manualPollFilings,
  generateAISummaries,
  sendWatchlistNotifications,
  sendDailyDigest,
  poll13FFilings,
  fetchTickerNews,
  cleanupEnrichmentCache,
  confirmReferrals,
  pollCongressionalTrades,
]
