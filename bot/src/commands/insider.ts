import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../lib/supabase'
import { createEnhancedTransactionEmbed, createTransactionEmbed, createErrorEmbed } from '../lib/embeds'
import { calculateTransactionMetrics } from '../lib/metrics'
import type { EnhancedTransactionResult } from '../lib/types'

export const data = new SlashCommandBuilder()
  .setName('insider')
  .setDescription('Get recent insider transactions')
  .addStringOption((option) =>
    option
      .setName('ticker')
      .setDescription('Stock ticker symbol (e.g., AAPL)')
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Transaction type filter')
      .addChoices(
        { name: 'All', value: 'all' },
        { name: 'Purchases', value: 'P' },
        { name: 'Sales', value: 'S' },
        { name: 'Grants', value: 'A' }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName('count')
      .setDescription('Number of transactions to show (1-10)')
      .setMinValue(1)
      .setMaxValue(10)
  )
  .addIntegerOption((option) =>
    option
      .setName('min_value')
      .setDescription('Minimum transaction value in USD')
      .setMinValue(0)
  )
  .addBooleanOption((option) =>
    option
      .setName('enhanced')
      .setDescription('Show enhanced insights (slower)')
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const ticker = interaction.options.getString('ticker')?.toUpperCase()
  const txnType = interaction.options.getString('type') || 'all'
  const count = interaction.options.getInteger('count') || 5
  const minValue = interaction.options.getInteger('min_value') || 0
  const enhanced = interaction.options.getBoolean('enhanced') ?? true

  let query = supabase
    .from('insider_transactions')
    .select(
      'id, ticker, company_name, insider_name, insider_title, insider_cik, transaction_type, transaction_date, shares, price_per_share, total_value, is_officer, is_director, is_10b51_plan, shares_owned_after'
    )
    .order('transaction_date', { ascending: false })
    .limit(count)

  if (ticker) {
    query = query.eq('ticker', ticker)
  }

  if (txnType !== 'all') {
    query = query.eq('transaction_type', txnType)
  }

  if (minValue > 0) {
    query = query.gte('total_value', minValue)
  }

  const { data, error } = await query

  if (error) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch transactions. Please try again.')],
    })
    return
  }

  if (!data || data.length === 0) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          `No insider transactions found${ticker ? ` for **${ticker}**` : ''}.`
        ),
      ],
    })
    return
  }

  const transactions: EnhancedTransactionResult[] = data.map((t) => ({
    id: t.id,
    ticker: t.ticker,
    companyName: t.company_name,
    insiderName: t.insider_name,
    insiderTitle: t.insider_title,
    insiderCik: t.insider_cik,
    transactionType: t.transaction_type,
    transactionDate: t.transaction_date,
    shares: t.shares,
    pricePerShare: t.price_per_share,
    totalValue: t.total_value,
    isOfficer: t.is_officer,
    isDirector: t.is_director,
    is10b51Plan: t.is_10b51_plan,
    sharesOwnedAfter: t.shares_owned_after,
  }))

  let embeds

  if (enhanced && transactions.length <= 3) {
    embeds = await Promise.all(
      transactions.map(async (txn) => {
        try {
          const metrics = await calculateTransactionMetrics(txn)
          return createEnhancedTransactionEmbed(txn, metrics, null)
        } catch {
          return createTransactionEmbed(txn)
        }
      })
    )
  } else {
    embeds = transactions.map(createTransactionEmbed)
  }

  const title = ticker
    ? `**${ticker}** - Latest ${transactions.length} insider transaction${transactions.length === 1 ? '' : 's'}`
    : `Latest ${transactions.length} insider transaction${transactions.length === 1 ? '' : 's'}`

  await interaction.editReply({
    content: title,
    embeds: embeds.slice(0, 10),
  })
}
