import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../lib/supabase'
import { createWhalesEmbed, createErrorEmbed } from '../lib/embeds'
import type { WhaleResult } from '../lib/types'

export const data = new SlashCommandBuilder()
  .setName('whales')
  .setDescription('See which institutional investors own a stock')
  .addStringOption((option) =>
    option
      .setName('ticker')
      .setDescription('Stock ticker symbol (e.g., AAPL)')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('limit')
      .setDescription('Max funds to show (default 15)')
      .setMinValue(5)
      .setMaxValue(25)
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const ticker = interaction.options.getString('ticker', true).toUpperCase()
  const limit = interaction.options.getInteger('limit') || 15

  const { data: latestDate } = await supabase
    .from('holdings_13f')
    .select('report_date')
    .eq('ticker', ticker)
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  if (!latestDate) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          `No 13F holdings found for **${ticker}**. This could mean:\n• The ticker is not held by any 13F filers\n• The ticker symbol may be incorrect\n• 13F data hasn't been loaded yet`
        ),
      ],
    })
    return
  }

  const { data, error } = await supabase
    .from('holdings_13f')
    .select('fund_name, fund_cik, shares, value_usd, report_date')
    .eq('ticker', ticker)
    .eq('report_date', latestDate.report_date)
    .order('value_usd', { ascending: false })
    .limit(limit)

  if (error) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch holdings. Please try again.')],
    })
    return
  }

  const whales: WhaleResult[] = (data || []).map((h) => ({
    fundName: h.fund_name,
    fundCik: h.fund_cik,
    shares: h.shares,
    valueUsd: h.value_usd,
    reportDate: h.report_date,
  }))

  const embed = createWhalesEmbed(ticker, whales)

  if (whales.length > 0) {
    embed.addFields({
      name: 'Data As Of',
      value: new Date(latestDate.report_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    })
  }

  await interaction.editReply({ embeds: [embed] })
}
