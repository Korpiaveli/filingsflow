import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { createEnhancedWhalesEmbed, createErrorEmbed } from '../lib/embeds'
import { getEnhancedWhaleData } from '../lib/metrics'

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

  try {
    const { whales, activity, concentration } = await getEnhancedWhaleData(ticker, limit)

    if (whales.length === 0) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            `No 13F holdings found for **${ticker}**. This could mean:\n• The ticker is not held by any 13F filers\n• The ticker symbol may be incorrect\n• 13F data hasn't been loaded yet`
          ),
        ],
      })
      return
    }

    const embed = createEnhancedWhalesEmbed(ticker, whales, activity, concentration)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    console.error('Error fetching whale data:', error)
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to fetch holdings. Please try again.')],
    })
  }
}
