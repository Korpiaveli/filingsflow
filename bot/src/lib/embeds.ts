import { EmbedBuilder, Colors } from 'discord.js'
import type { FilingResult, TransactionResult, HoldingResult, WhaleResult } from './types'

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
