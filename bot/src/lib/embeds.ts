import { EmbedBuilder, Colors } from 'discord.js'
import type {
  FilingResult,
  TransactionResult,
  HoldingResult,
  WhaleResult,
  TransactionMetrics,
  NewsContext,
  ClusterInfo,
  QuarterlyActivity,
  EnhancedTransactionResult,
} from './types'

const DISCLAIMER = 'Not investment advice. Data from SEC EDGAR.'

export function createFilingEmbed(filing: FilingResult): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle(`${filing.ticker || 'N/A'} - Form ${filing.formType}`)
    .setDescription(filing.aiSummary || filing.filerName || 'No summary available')
    .addFields(
      { name: 'Company', value: filing.companyName || 'Unknown', inline: true },
      { name: 'Filed', value: formatDate(filing.filedAt), inline: true },
      { name: 'Form Type', value: filing.formType, inline: true }
    )
    .setFooter({ text: DISCLAIMER })
    .setTimestamp(new Date(filing.filedAt))

  if (filing.fileUrl) {
    embed.setURL(filing.fileUrl)
  }

  return embed
}

export function createTransactionEmbed(txn: TransactionResult): EmbedBuilder {
  const isBuy = txn.transactionType === 'P' || txn.transactionType === 'A'
  const color = isBuy ? Colors.Green : Colors.Red
  const action = getTransactionAction(txn.transactionType)

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${txn.ticker} - Insider ${action}`)
    .addFields(
      { name: 'Insider', value: txn.insiderName, inline: true },
      { name: 'Title', value: txn.insiderTitle || 'N/A', inline: true },
      { name: 'Action', value: action, inline: true },
      {
        name: 'Shares',
        value: txn.shares ? formatNumber(txn.shares) : 'N/A',
        inline: true,
      },
      {
        name: 'Price',
        value: txn.pricePerShare ? formatCurrency(txn.pricePerShare) : 'N/A',
        inline: true,
      },
      {
        name: 'Value',
        value: txn.totalValue ? formatCurrency(txn.totalValue) : 'N/A',
        inline: true,
      }
    )
    .setFooter({ text: DISCLAIMER })

  if (txn.transactionDate) {
    embed.setTimestamp(new Date(txn.transactionDate))
  }

  return embed
}

export function createEnhancedTransactionEmbed(
  txn: EnhancedTransactionResult,
  metrics: TransactionMetrics | null,
  newsContext: NewsContext | null
): EmbedBuilder {
  const isBuy = ['P', 'A', 'M'].includes(txn.transactionType)
  const color = isBuy ? Colors.Green : Colors.Red
  const action = getTransactionAction(txn.transactionType)

  const roleLabel = txn.insiderTitle || (metrics?.isOfficer ? 'Officer' : metrics?.isDirector ? 'Director' : 'Insider')
  const recencyText = metrics?.daysSinceLastTrade != null
    ? ` | ${formatRecency(metrics.daysSinceLastTrade)}`
    : ''

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${txn.ticker} - Insider ${action}`)
    .setDescription(`**${txn.insiderName}** (${roleLabel})${recencyText}`)

  const txnDetails: string[] = []
  if (txn.shares) txnDetails.push(`Shares: ${formatNumber(txn.shares)}`)
  if (txn.totalValue) txnDetails.push(`Value: ${formatCurrency(txn.totalValue)}`)
  if (metrics?.ownershipChangePercent != null && Math.abs(metrics.ownershipChangePercent) >= 5) {
    const sign = metrics.ownershipChangePercent > 0 ? '+' : ''
    txnDetails.push(`${sign}${metrics.ownershipChangePercent.toFixed(0)}% position`)
  }

  if (txnDetails.length > 0) {
    embed.addFields({
      name: 'Transaction',
      value: txnDetails.join(' | '),
      inline: false,
    })
  }

  const insights = buildInsights(metrics)
  if (insights.length > 0) {
    embed.addFields({
      name: 'Context',
      value: insights.map(i => `• ${i}`).join('\n'),
      inline: false,
    })
  }

  if (newsContext && newsContext.recentNews.length > 0) {
    const newsItems = newsContext.recentNews.slice(0, 2).map(n =>
      `• "${truncate(n.title, 45)}" (${formatTimeAgo(n.publishedAt)})`
    )
    embed.addFields({
      name: 'Recent News',
      value: newsItems.join('\n'),
      inline: false,
    })
  }

  embed.setFooter({ text: DISCLAIMER })

  if (txn.transactionDate) {
    embed.setTimestamp(new Date(txn.transactionDate))
  }

  return embed
}

export function createClusterEmbed(
  ticker: string,
  cluster: ClusterInfo,
  transactionType: 'buy' | 'sell'
): EmbedBuilder {
  const isBuy = transactionType === 'buy'
  const color = isBuy ? Colors.Green : Colors.Red
  const action = isBuy ? 'bought' : 'sold'

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${ticker} - Insider Cluster Detected`)
    .setDescription(`**${cluster.insiderCount} insiders ${action}** within ${cluster.timeframeDays} days`)

  embed.addFields({
    name: 'Total Activity',
    value: `${formatCurrency(cluster.totalValue)} across multiple transactions`,
    inline: false,
  })

  if (cluster.participants.length > 0) {
    const participantList = cluster.participants
      .slice(0, 5)
      .map((p, i) => `**${i + 1}.** ${p.name}${p.title ? ` (${p.title})` : ''} - ${formatCurrency(p.value)}`)
      .join('\n')

    embed.addFields({
      name: 'Participants',
      value: participantList,
      inline: false,
    })
  }

  embed.setFooter({ text: DISCLAIMER })
  embed.setTimestamp()

  return embed
}

export function createEnhancedWhalesEmbed(
  ticker: string,
  whales: Array<WhaleResult & { changePercent?: number | null; isNew?: boolean }>,
  activity: QuarterlyActivity | null
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle(`${ticker} - Institutional Owners`)

  if (whales.length === 0) {
    embed.setDescription('No 13F holdings found for this ticker.')
    embed.setFooter({ text: DISCLAIMER })
    return embed
  }

  const reportDate = whales[0]?.reportDate
  const quarter = reportDate ? formatQuarter(reportDate) : 'Latest'
  embed.setDescription(`${quarter} | ${activity?.totalFunds || whales.length} funds tracked`)

  const whaleList = whales.slice(0, 10).map((w, i) => {
    const change = formatChange(w.changePercent, w.isNew)
    return `**${i + 1}.** ${w.fundName || w.fundCik} - ${formatCurrency(w.valueUsd)} ${change}`
  }).join('\n')

  embed.addFields({ name: 'Top Holders', value: whaleList, inline: false })

  if (activity) {
    const activityLines: string[] = []
    if (activity.increased > 0 || activity.decreased > 0) {
      activityLines.push(`${activity.increased} increased | ${activity.decreased} decreased`)
    }
    if (activity.newPositions > 0 || activity.exited > 0) {
      activityLines.push(`${activity.newPositions} new positions | ${activity.exited} exits`)
    }

    if (activityLines.length > 0) {
      embed.addFields({
        name: 'Quarterly Activity',
        value: activityLines.map(l => `• ${l}`).join('\n'),
        inline: false,
      })
    }
  }

  const totalValue = whales.reduce((sum, w) => sum + w.valueUsd, 0)
  const totalShares = whales.reduce((sum, w) => sum + w.shares, 0)

  embed.addFields({
    name: 'Summary',
    value: `**${whales.length}** funds | **${formatNumber(totalShares)}** shares | **${formatCurrency(totalValue)}**`,
    inline: false,
  })

  embed.setFooter({ text: DISCLAIMER })

  return embed
}

export function createHoldingsEmbed(
  holdings: HoldingResult[],
  fundName: string,
  fundCik: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Purple)
    .setTitle(`${fundName} - 13F Holdings`)
    .setDescription(`CIK: ${fundCik}`)
    .setFooter({ text: DISCLAIMER })

  const topHoldings = holdings.slice(0, 10)

  if (topHoldings.length > 0) {
    const holdingsList = topHoldings
      .map(
        (h, i) =>
          `**${i + 1}.** ${h.ticker || h.issuerName} - ${formatCurrency(h.valueUsd)} (${formatNumber(h.shares)} shares)`
      )
      .join('\n')

    embed.addFields({ name: 'Top Holdings', value: holdingsList })

    if (holdings.length > 10) {
      embed.addFields({
        name: '\u200b',
        value: `*...and ${holdings.length - 10} more positions*`,
      })
    }
  }

  return embed
}

export function createWhalesEmbed(
  ticker: string,
  whales: WhaleResult[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle(`${ticker} - Institutional Owners`)
    .setDescription(`Top funds holding ${ticker}`)
    .setFooter({ text: DISCLAIMER })

  if (whales.length === 0) {
    embed.addFields({
      name: 'No Data',
      value: 'No 13F holdings found for this ticker.',
    })
    return embed
  }

  const whaleList = whales
    .slice(0, 15)
    .map(
      (w, i) =>
        `**${i + 1}.** ${w.fundName || w.fundCik} - ${formatCurrency(w.valueUsd)} (${formatNumber(w.shares)} shares)`
    )
    .join('\n')

  embed.addFields({ name: 'Top Holders', value: whaleList })

  const totalValue = whales.reduce((sum, w) => sum + w.valueUsd, 0)
  const totalShares = whales.reduce((sum, w) => sum + w.shares, 0)

  embed.addFields({
    name: 'Totals',
    value: `**${whales.length}** funds | **${formatNumber(totalShares)}** shares | **${formatCurrency(totalValue)}** value`,
  })

  return embed
}

export function createWatchlistEmbed(
  tickers: string[],
  guildName: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Aqua)
    .setTitle(`${guildName} Watchlist`)
    .setFooter({ text: DISCLAIMER })

  if (tickers.length === 0) {
    embed.setDescription('No tickers in watchlist. Use `/watchlist add` to add tickers.')
  } else {
    embed.setDescription(tickers.map((t) => `• **${t}**`).join('\n'))
    embed.addFields({
      name: 'Count',
      value: `${tickers.length} ticker${tickers.length === 1 ? '' : 's'}`,
    })
  }

  return embed
}

export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle('Error')
    .setDescription(message)
}

function buildInsights(metrics: TransactionMetrics | null): string[] {
  if (!metrics) return []

  const insights: string[] = []

  if (metrics.sizeMultiplier !== null && metrics.sizeMultiplier >= 2) {
    insights.push(`${metrics.sizeMultiplier.toFixed(1)}x larger than their historical average`)
  } else if (metrics.sizeMultiplier !== null && metrics.sizeMultiplier <= 0.3) {
    insights.push(`${(1 / metrics.sizeMultiplier).toFixed(1)}x smaller than their historical average`)
  }

  if (metrics.percentileRank !== null && metrics.percentileRank <= 0.05) {
    insights.push(`Top ${(metrics.percentileRank * 100).toFixed(1)}% by value this month`)
  }

  if (metrics.clusterInfo && metrics.clusterInfo.insiderCount >= 2) {
    insights.push(`${metrics.clusterInfo.insiderCount} insiders traded this week (${formatCurrency(metrics.clusterInfo.totalValue)} total)`)
  }

  if (!metrics.is10b51Plan) {
    insights.push('Not a 10b5-1 pre-planned trade')
  }

  return insights.slice(0, 4)
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
    C: 'Conversion',
  }
  return actions[code] || code
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatQuarter(dateStr: string): string {
  const date = new Date(dateStr)
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`
  }
  return `$${num.toFixed(2)}`
}

function formatRecency(days: number | null): string {
  if (days === null) return ''
  if (days === 0) return 'Traded today'
  if (days === 1) return 'Traded yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `First trade in ${months} month${months > 1 ? 's' : ''}`
  }
  const years = Math.floor(days / 365)
  return `First trade in ${years} year${years > 1 ? 's' : ''}`
}

function formatTimeAgo(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatChange(changePercent: number | null | undefined, isNew: boolean | undefined): string {
  if (isNew) return '🆕'
  if (changePercent === null || changePercent === undefined) return ''
  if (changePercent > 0) return `⬆️ +${changePercent.toFixed(0)}%`
  if (changePercent < 0) return `⬇️ ${changePercent.toFixed(0)}%`
  return ''
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
