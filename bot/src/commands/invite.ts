import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'

const BOT_PERMISSIONS = '274878032960'

export const data = new SlashCommandBuilder()
  .setName('invite')
  .setDescription('Get the bot invite link to add FilingsFlow to another server')

export async function execute(interaction: ChatInputCommandInteraction) {
  const clientId = interaction.client.user?.id

  if (!clientId) {
    await interaction.reply({
      content: 'Unable to generate invite link.',
      ephemeral: true,
    })
    return
  }

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`

  const embed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle('Add FilingsFlow to Your Server')
    .setDescription(
      `Bring real-time SEC filing alerts to another Discord server!\n\n` +
      `[**Click here to invite FilingsFlow**](${inviteUrl})\n\n` +
      `**Features:**\n` +
      `• Real-time insider transaction alerts\n` +
      `• AI-powered filing summaries\n` +
      `• Institutional whale tracking\n` +
      `• Server-wide watchlists\n` +
      `• Cluster detection for coordinated insider activity`
    )
    .setFooter({ text: 'FilingsFlow • SEC Filing Intelligence' })

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
