import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../lib/supabase'
import { getNewsContext, getInstitutionalContext } from '../lib/metrics'
import { createErrorEmbed } from '../lib/embeds'

const DISCLAIMER = 'Not investment advice • /invite to add FilingsFlow • filingsflow.com'

interface InsiderSummary {
  totalBuys: number
  totalSells: number
  buyValue: number
  sellValue: number
  uniqueInsiders: number
  latestTxn: {
    insiderName: string
    type: string
    value: number
    date: string
  } | null
}

interface FilingSummary {
  latestFiling: {
    formType: string
    filedAt: string
    aiSummary: string | null
    filerName: string | null
  } | null
  recentCount: number
}

export const data = new SlashCommandBuilder()
  .setName('insight')
  .setDescription('Get a quick snapshot of insider activity and news for a ticker')
  .addStringOption((option) =>
    option
      .setName('ticker')
      .setDescription('Stock ticker symbol (e.g., AAPL)')
      .setRequired(true)
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const ticker = interaction.options.getString('ticker', true).toUpperCase()

  const [insiderData, filingData, newsCtx, instCtx] = await Promise.all([
    getInsiderSummary(ticker),
    getFilingSummary(ticker),
    getNewsContext(ticker),
    getInstitutionalContext(ticker),
  ])

  if (!insiderData.latestTxn && !filingData.latestFiling && newsCtx.recentNews.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed(`No data found for **${ticker}**. Check ticker spelling or try a different symbol.`)],
    })
    return
  }

  const embed = createInsightEmbed(ticker, insiderData, filingData, newsCtx, instCtx)
  await interaction.editReply({ embeds: [embed] })
}

async function getInsiderSummary(ticker: string): Promise<InsiderSummary> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data } = await supabase
    .from('insider_transactions')
    .select('insider_name, insider_cik, transaction_type, total_value, transaction_date')
    .eq('ticker', ticker)
    .gte('transaction_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  if (!data || data.length === 0) {
    return {
      totalBuys: 0,
      totalSells: 0,
      buyValue: 0,
      sellValue: 0,
      uniqueInsiders: 0,
      latestTxn: null,
    }
  }

  const buys = data.filter(t => ['P', 'A', 'M'].includes(t.transaction_type))
  const sells = data.filter(t => ['S', 'D', 'F'].includes(t.transaction_type))

  const uniqueCiks = new Set(data.map(t => t.insider_cik).filter(Boolean))

  const latest = data[0]

  return {
    totalBuys: buys.length,
    totalSells: sells.length,
    buyValue: buys.reduce((sum, t) => sum + Math.abs(t.total_value || 0), 0),
    sellValue: sells.reduce((sum, t) => sum + Math.abs(t.total_value || 0), 0),
    uniqueInsiders: uniqueCiks.size,
    latestTxn: latest ? {
      insiderName: latest.insider_name || 'Unknown',
      type: latest.transaction_type,
      value: Math.abs(latest.total_value || 0),
      date: latest.transaction_date || '',
    } : null,
  }
}

async function getFilingSummary(ticker: string): Promise<FilingSummary> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, count } = await supabase
    .from('filings')
    .select('form_type, filed_at, ai_summary, filer_name', { count: 'exact' })
    .eq('ticker', ticker)
    .gte('filed_at', thirtyDaysAgo.toISOString())
    .order('filed_at', { ascending: false })
    .limit(1)

  const latest = data?.[0]

  return {
    latestFiling: latest ? {
      formType: latest.form_type,
      filedAt: latest.filed_at,
      aiSummary: latest.ai_summary,
      filerName: latest.filer_name,
    } : null,
    recentCount: count || 0,
  }
}

function createInsightEmbed(
  ticker: string,
  insider: InsiderSummary,
  filing: FilingSummary,
  news: Awaited<ReturnType<typeof getNewsContext>>,
  inst: Awaited<ReturnType<typeof getInstitutionalContext>>
): EmbedBuilder {
  const netSentiment = insider.buyValue - insider.sellValue
  const sentimentEmoji = netSentiment > 0 ? '🟢' : netSentiment < 0 ? '🔴' : '🟡'
  const activityLevel = getActivityLevel(insider, filing.recentCount)
  const netLabel = netSentiment !== 0
    ? ` (Net: ${netSentiment > 0 ? '+' : ''}${formatCurrency(netSentiment)})`
    : ''

  const embed = new EmbedBuilder()
    .setColor(netSentiment > 0 ? Colors.Green : netSentiment < 0 ? Colors.Red : Colors.Yellow)
    .setTitle(`${ticker} Quick Insight`)
    .setDescription(`${sentimentEmoji} ${activityLevel}${netLabel}`)
    .setURL(`https://filingsflow.com/filings?ticker=${ticker}`)

  if (insider.totalBuys > 0 || insider.totalSells > 0) {
    const lines: string[] = []

    if (insider.totalBuys > 0) {
      lines.push(`**${insider.totalBuys}** buys (${formatCurrency(insider.buyValue)})`)
    }
    if (insider.totalSells > 0) {
      lines.push(`**${insider.totalSells}** sells (${formatCurrency(insider.sellValue)})`)
    }
    lines.push(`**${insider.uniqueInsiders}** unique insider${insider.uniqueInsiders !== 1 ? 's' : ''}`)

    embed.addFields({
      name: '7-Day Insider Activity',
      value: lines.join(' | '),
      inline: false,
    })

    if (insider.latestTxn) {
      const action = getTransactionAction(insider.latestTxn.type)
      embed.addFields({
        name: 'Latest Transaction',
        value: `${insider.latestTxn.insiderName} - ${action} (${formatCurrency(insider.latestTxn.value)})`,
        inline: false,
      })
    }
  } else {
    embed.addFields({
      name: '7-Day Insider Activity',
      value: 'No insider transactions in the last 7 days',
      inline: false,
    })
  }

  if (inst) {
    const instLines: string[] = []
    if (inst.increased > 0) instLines.push(`${inst.increased} increased`)
    if (inst.decreased > 0) instLines.push(`${inst.decreased} decreased`)
    if (inst.newPositions > 0) instLines.push(`${inst.newPositions} new`)
    if (inst.exited > 0) instLines.push(`${inst.exited} exited`)

    if (instLines.length > 0) {
      embed.addFields({
        name: 'Institutional Activity (Q)',
        value: instLines.join(' | '),
        inline: false,
      })
    }
  }

  if (filing.latestFiling) {
    const filingText = filing.latestFiling.aiSummary
      ? `Form ${filing.latestFiling.formType}: ${truncate(filing.latestFiling.aiSummary, 120)}`
      : `Form ${filing.latestFiling.formType} filed ${formatDate(filing.latestFiling.filedAt)}`

    embed.addFields({
      name: `Recent Filings (${filing.recentCount} in 30d)`,
      value: filingText,
      inline: false,
    })
  }

  if (news.recentNews.length > 0) {
    const newsItems = news.recentNews.slice(0, 2).map(n =>
      `• [${truncate(n.title, 50)}](${n.url})`
    )
    embed.addFields({
      name: news.has8K ? '8-K Filed + Recent News' : 'Recent News',
      value: newsItems.join('\n'),
      inline: false,
    })
  } else if (news.has8K) {
    embed.addFields({
      name: 'Recent 8-K',
      value: 'Material event filed in the last 7 days',
      inline: false,
    })
  }

  embed.setFooter({ text: DISCLAIMER })
  embed.setTimestamp()

  return embed
}

function getActivityLevel(insider: InsiderSummary, filingCount: number): string {
  const totalTxns = insider.totalBuys + insider.totalSells
  const totalValue = insider.buyValue + insider.sellValue

  if (totalTxns >= 5 || totalValue >= 10_000_000 || filingCount >= 10) {
    return 'High activity detected'
  }
  if (totalTxns >= 2 || totalValue >= 1_000_000 || filingCount >= 3) {
    return 'Moderate activity'
  }
  if (totalTxns >= 1 || filingCount >= 1) {
    return 'Light activity'
  }
  return 'Minimal recent activity'
}

function getTransactionAction(code: string): string {
  const actions: Record<string, string> = {
    P: 'Purchase',
    S: 'Sale',
    A: 'Grant',
    D: 'Disposition',
    M: 'Exercise',
    F: 'Tax Payment',
    G: 'Gift',
  }
  return actions[code] || code
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
