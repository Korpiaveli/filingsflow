import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../lib/supabase'
import { createFilingEmbed, createErrorEmbed } from '../lib/embeds'
import type { FilingResult } from '../lib/types'

export const data = new SlashCommandBuilder()
  .setName('filing')
  .setDescription('Get latest SEC filings for a ticker')
  .addStringOption((option) =>
    option
      .setName('ticker')
      .setDescription('Stock ticker symbol (e.g., AAPL)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('form')
      .setDescription('Form type filter')
      .addChoices(
        { name: 'All Forms', value: 'all' },
        { name: 'Form 4 (Insider)', value: '4' },
        { name: 'Form 3 (Initial)', value: '3' },
        { name: 'Form 5 (Annual)', value: '5' },
        { name: '13F (Holdings)', value: '13F-HR' }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName('count')
      .setDescription('Number of filings to show (1-10)')
      .setMinValue(1)
      .setMaxValue(10)
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const ticker = interaction.options.getString('ticker', true).toUpperCase()
  const formType = interaction.options.getString('form') || 'all'
  const count = interaction.options.getInteger('count') || 5

  let query = supabase
    .from('filings')
    .select('id, ticker, company_name, form_type, filed_at, filer_name, ai_summary, file_url')
    .eq('ticker', ticker)
    .order('filed_at', { ascending: false })
    .limit(count)

  if (formType !== 'all') {
    query = query.eq('form_type', formType)
  }

  const { data, error } = await query

  if (error) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch filings. Please try again.')],
    })
    return
  }

  if (!data || data.length === 0) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          `No filings found for **${ticker}**${formType !== 'all' ? ` (Form ${formType})` : ''}.`
        ),
      ],
    })
    return
  }

  const filings: FilingResult[] = data.map((f) => ({
    id: f.id,
    ticker: f.ticker,
    companyName: f.company_name,
    formType: f.form_type,
    filedAt: f.filed_at,
    filerName: f.filer_name,
    aiSummary: f.ai_summary,
    fileUrl: f.file_url,
  }))

  const embeds = filings.map(createFilingEmbed)

  await interaction.editReply({
    content: `**${ticker}** - Latest ${filings.length} filing${filings.length === 1 ? '' : 's'}`,
    embeds: embeds.slice(0, 10),
  })
}
