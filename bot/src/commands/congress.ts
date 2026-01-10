import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../lib/supabase'
import { createErrorEmbed } from '../lib/embeds'

const DISCLAIMER = 'Not investment advice • /invite to add FilingsFlow • filingsflow.com'

const PARTY_COLORS: Record<string, number> = {
  D: 0x3B82F6,
  R: 0xEF4444,
  I: 0x8B5CF6,
}

const PARTY_LABELS: Record<string, string> = {
  D: 'Democrat',
  R: 'Republican',
  I: 'Independent',
}

export const data = new SlashCommandBuilder()
  .setName('congress')
  .setDescription('See congressional stock trades')
  .addSubcommand(sub =>
    sub
      .setName('ticker')
      .setDescription('See congressional trades for a specific stock')
      .addStringOption(opt =>
        opt.setName('symbol').setDescription('Stock ticker (e.g., NVDA)').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('member')
      .setDescription('See trades by a specific member of Congress')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Member name (e.g., Pelosi)').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('recent')
      .setDescription('See recent notable congressional trades')
      .addStringOption(opt =>
        opt
          .setName('chamber')
          .setDescription('Filter by chamber')
          .addChoices(
            { name: 'Both', value: 'both' },
            { name: 'House', value: 'house' },
            { name: 'Senate', value: 'senate' }
          )
      )
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case 'ticker':
        await handleTickerSearch(interaction)
        break
      case 'member':
        await handleMemberSearch(interaction)
        break
      case 'recent':
        await handleRecentTrades(interaction)
        break
    }
  } catch (error) {
    console.error('Congress command error:', error)
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch congressional trading data.')],
    })
  }
}

async function handleTickerSearch(interaction: ChatInputCommandInteraction) {
  const ticker = interaction.options.getString('symbol', true).toUpperCase()

  const { data, error } = await supabase.rpc('get_congressional_trades', {
    p_ticker: ticker,
    p_days: 365,
  })

  if (error || !data || data.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed(`No congressional trades found for **${ticker}** in the last year.`)],
    })
    return
  }

  const buys = data.filter((t: { transaction_type: string }) => t.transaction_type.toLowerCase().includes('purchase'))
  const sells = data.filter((t: { transaction_type: string }) => t.transaction_type.toLowerCase().includes('sale'))

  const embed = new EmbedBuilder()
    .setColor(buys.length > sells.length ? Colors.Green : sells.length > buys.length ? Colors.Red : Colors.Yellow)
    .setTitle(`${ticker} Congressional Trading`)
    .setDescription(`**${data.length}** trades in the last year (${buys.length} buys, ${sells.length} sells)`)
    .setURL(`https://filingsflow.com/congress?ticker=${ticker}`)

  const recentTrades = data.slice(0, 8) as Array<{
    member_name: string
    party: string | null
    chamber: string
    transaction_type: string
    amount_range: string
    disclosure_date: string
  }>

  const tradeLines = recentTrades.map(t => {
    const partyLabel = t.party ? `(${t.party})` : ''
    const typeEmoji = t.transaction_type.toLowerCase().includes('purchase') ? '🟢' : '🔴'
    return `${typeEmoji} **${t.member_name}** ${partyLabel} - ${t.transaction_type} ${t.amount_range || ''}`
  })

  embed.addFields({
    name: 'Recent Trades',
    value: tradeLines.join('\n') || 'No recent trades',
    inline: false,
  })

  embed.setFooter({ text: DISCLAIMER })
  embed.setTimestamp()

  await interaction.editReply({ embeds: [embed] })
}

async function handleMemberSearch(interaction: ChatInputCommandInteraction) {
  const searchName = interaction.options.getString('name', true)

  const { data, error } = await supabase
    .from('congressional_transactions')
    .select('*')
    .ilike('member_name', `%${searchName}%`)
    .order('disclosure_date', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed(`No trades found for member matching "**${searchName}**".`)],
    })
    return
  }

  const member = data[0]
  const partyColor = member.party ? PARTY_COLORS[member.party] || Colors.Grey : Colors.Grey
  const partyLabel = member.party ? PARTY_LABELS[member.party] || member.party : 'Unknown'
  const chamberLabel = member.chamber === 'senate' ? 'Senator' : 'Representative'

  const embed = new EmbedBuilder()
    .setColor(partyColor)
    .setTitle(`${member.member_name}`)
    .setDescription(`${chamberLabel} • ${partyLabel}${member.state ? ` • ${member.state}` : ''}`)

  const tradeLines = data.slice(0, 10).map(t => {
    const typeEmoji = t.transaction_type?.toLowerCase().includes('purchase') ? '🟢' : '🔴'
    const ticker = t.ticker || t.asset_description?.slice(0, 20) || 'Unknown'
    return `${typeEmoji} **${ticker}** - ${t.transaction_type} ${t.amount_range || ''} (${formatDate(t.disclosure_date)})`
  })

  embed.addFields({
    name: 'Recent Trades',
    value: tradeLines.join('\n') || 'No trades found',
    inline: false,
  })

  embed.setFooter({ text: DISCLAIMER })
  embed.setTimestamp()

  await interaction.editReply({ embeds: [embed] })
}

async function handleRecentTrades(interaction: ChatInputCommandInteraction) {
  const chamber = interaction.options.getString('chamber') || 'both'

  const { data, error } = await supabase.rpc('get_notable_congressional_trades', {
    p_days: 30,
    p_min_amount: 15000,
  })

  if (error || !data || data.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No notable congressional trades found in the last 30 days.')],
    })
    return
  }

  const filtered = chamber === 'both'
    ? data
    : data.filter((t: { chamber: string }) => t.chamber === chamber)

  const embed = new EmbedBuilder()
    .setColor(Colors.Purple)
    .setTitle('Notable Congressional Trades')
    .setDescription(`High-value trades disclosed in the last 30 days`)
    .setURL('https://filingsflow.com/congress')

  const tradeLines = (filtered as Array<{
    member_name: string
    party: string | null
    ticker: string
    transaction_type: string
    amount_range: string
    disclosure_date: string
  }>).slice(0, 10).map(t => {
    const partyLabel = t.party ? `(${t.party})` : ''
    const typeEmoji = t.transaction_type.toLowerCase().includes('purchase') ? '🟢' : '🔴'
    return `${typeEmoji} **${t.ticker}** - ${t.member_name} ${partyLabel} - ${t.amount_range || ''}`
  })

  embed.addFields({
    name: chamber === 'both' ? 'All Chambers' : chamber.charAt(0).toUpperCase() + chamber.slice(1),
    value: tradeLines.join('\n') || 'No notable trades',
    inline: false,
  })

  embed.setFooter({ text: DISCLAIMER })
  embed.setTimestamp()

  await interaction.editReply({ embeds: [embed] })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
