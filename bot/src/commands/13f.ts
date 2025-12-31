import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../lib/supabase'
import { createHoldingsEmbed, createErrorEmbed } from '../lib/embeds'
import type { HoldingResult } from '../lib/types'

export const data = new SlashCommandBuilder()
  .setName('13f')
  .setDescription('Get 13F holdings for an institutional investor')
  .addStringOption((option) =>
    option
      .setName('fund')
      .setDescription('Fund name or CIK number')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('limit')
      .setDescription('Max holdings to show (default 20)')
      .setMinValue(5)
      .setMaxValue(50)
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const fundQuery = interaction.options.getString('fund', true)
  const limit = interaction.options.getInteger('limit') || 20

  const isCik = /^\d+$/.test(fundQuery)

  let fundCik: string | null = null
  let fundName: string | null = null

  if (isCik) {
    fundCik = fundQuery.padStart(10, '0')

    const { data: sample } = await supabase
      .from('holdings_13f')
      .select('fund_name')
      .eq('fund_cik', fundCik)
      .limit(1)
      .single()

    fundName = sample?.fund_name || fundCik
  } else {
    const { data: fundMatch } = await supabase
      .from('holdings_13f')
      .select('fund_cik, fund_name')
      .ilike('fund_name', `%${fundQuery}%`)
      .limit(1)
      .single()

    if (!fundMatch) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            `No fund found matching "**${fundQuery}**". Try using the CIK number.`
          ),
        ],
      })
      return
    }

    fundCik = fundMatch.fund_cik
    fundName = fundMatch.fund_name || fundCik
  }

  const { data: latestReport } = await supabase
    .from('holdings_13f')
    .select('report_date')
    .eq('fund_cik', fundCik)
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  if (!latestReport) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(`No 13F holdings found for **${fundName}**.`),
      ],
    })
    return
  }

  const { data, error } = await supabase
    .from('holdings_13f')
    .select('id, fund_name, fund_cik, ticker, issuer_name, shares, value_usd, report_date')
    .eq('fund_cik', fundCik)
    .eq('report_date', latestReport.report_date)
    .order('value_usd', { ascending: false })
    .limit(limit)

  if (error || !data) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch holdings. Please try again.')],
    })
    return
  }

  const holdings: HoldingResult[] = data.map((h) => ({
    id: h.id,
    fundName: h.fund_name,
    fundCik: h.fund_cik,
    ticker: h.ticker,
    issuerName: h.issuer_name,
    shares: h.shares,
    valueUsd: h.value_usd,
    reportDate: h.report_date,
  }))

  const embed = createHoldingsEmbed(holdings, fundName || fundCik!, fundCik!)
  embed.addFields({
    name: 'Report Date',
    value: new Date(latestReport.report_date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  })

  await interaction.editReply({ embeds: [embed] })
}
