import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'
import { supabase } from '../lib/supabase'
import { createWatchlistEmbed, createErrorEmbed } from '../lib/embeds'
import { EmbedBuilder, Colors } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('watchlist')
  .setDescription('Manage server watchlist for filing alerts')
  .addSubcommand((sub) =>
    sub.setName('show').setDescription('Show the current server watchlist')
  )
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a ticker to the watchlist')
      .addStringOption((option) =>
        option
          .setName('ticker')
          .setDescription('Stock ticker symbol (e.g., AAPL)')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a ticker from the watchlist')
      .addStringOption((option) =>
        option
          .setName('ticker')
          .setDescription('Stock ticker symbol to remove')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('clear').setDescription('Clear all tickers from the watchlist')
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({
      embeds: [createErrorEmbed('This command can only be used in a server.')],
      ephemeral: true,
    })
    return
  }

  const subcommand = interaction.options.getSubcommand()

  switch (subcommand) {
    case 'show':
      await handleShow(interaction)
      break
    case 'add':
      await handleAdd(interaction)
      break
    case 'remove':
      await handleRemove(interaction)
      break
    case 'clear':
      await handleClear(interaction)
      break
  }
}

async function handleShow(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const { data, error } = await supabase
    .from('server_watchlists')
    .select('ticker')
    .eq('guild_id', interaction.guildId!)
    .order('created_at', { ascending: true })

  if (error) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch watchlist.')],
    })
    return
  }

  const tickers = (data || []).map((d) => d.ticker)
  const embed = createWatchlistEmbed(tickers, interaction.guild?.name || 'Server')

  await interaction.editReply({ embeds: [embed] })
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const ticker = interaction.options.getString('ticker', true).toUpperCase()

  const member = interaction.member
  const hasPermission =
    member &&
    typeof member.permissions !== 'string' &&
    member.permissions.has(PermissionFlagsBits.ManageGuild)

  if (!hasPermission) {
    await interaction.reply({
      embeds: [createErrorEmbed('You need **Manage Server** permission to modify the watchlist.')],
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  const { data: existing } = await supabase
    .from('server_watchlists')
    .select('id')
    .eq('guild_id', interaction.guildId!)
    .eq('ticker', ticker)
    .single()

  if (existing) {
    await interaction.editReply({
      embeds: [createErrorEmbed(`**${ticker}** is already in the watchlist.`)],
    })
    return
  }

  const { error } = await supabase.from('server_watchlists').insert({
    guild_id: interaction.guildId!,
    ticker,
    added_by: interaction.user.id,
  })

  if (error) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to add ticker. Please try again.')],
    })
    return
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle('Ticker Added')
    .setDescription(`**${ticker}** has been added to the watchlist.`)

  await interaction.editReply({ embeds: [embed] })
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const ticker = interaction.options.getString('ticker', true).toUpperCase()

  const member = interaction.member
  const hasPermission =
    member &&
    typeof member.permissions !== 'string' &&
    member.permissions.has(PermissionFlagsBits.ManageGuild)

  if (!hasPermission) {
    await interaction.reply({
      embeds: [createErrorEmbed('You need **Manage Server** permission to modify the watchlist.')],
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  const { error, count } = await supabase
    .from('server_watchlists')
    .delete()
    .eq('guild_id', interaction.guildId!)
    .eq('ticker', ticker)

  if (error || count === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed(`**${ticker}** was not found in the watchlist.`)],
    })
    return
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle('Ticker Removed')
    .setDescription(`**${ticker}** has been removed from the watchlist.`)

  await interaction.editReply({ embeds: [embed] })
}

async function handleClear(interaction: ChatInputCommandInteraction) {
  const member = interaction.member
  const hasPermission =
    member &&
    typeof member.permissions !== 'string' &&
    member.permissions.has(PermissionFlagsBits.ManageGuild)

  if (!hasPermission) {
    await interaction.reply({
      embeds: [createErrorEmbed('You need **Manage Server** permission to clear the watchlist.')],
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  const { error } = await supabase
    .from('server_watchlists')
    .delete()
    .eq('guild_id', interaction.guildId!)

  if (error) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to clear watchlist.')],
    })
    return
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle('Watchlist Cleared')
    .setDescription('All tickers have been removed from the watchlist.')

  await interaction.editReply({ embeds: [embed] })
}
