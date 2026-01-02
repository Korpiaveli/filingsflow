import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../lib/supabase'

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const REFERRAL_MILESTONES = [
  { count: 5, amountCents: 500 },
  { count: 15, amountCents: 2000 },
  { count: 30, amountCents: 5000 },
  { count: 50, amountCents: 10000 },
] as const

function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)]
  }
  return code
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export const data = new SlashCommandBuilder()
  .setName('referral')
  .setDescription('View your referral dashboard and get your shareable link')

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const discordId = interaction.user.id

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('discord_id', discordId)
    .single()

  if (!user) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setTitle('Account Not Linked')
      .setDescription(
        'Your Discord account is not linked to FilingsFlow.\n\n' +
        'Visit [filingsflow.com](https://filingsflow.com) to create an account and link your Discord.'
      )
    await interaction.editReply({ embeds: [embed] })
    return
  }

  const userId = user.id

  let code: string
  const { data: existingCode } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .single()

  if (existingCode) {
    code = existingCode.code
  } else {
    code = generateReferralCode()
    let attempts = 0
    while (attempts < 5) {
      const { error } = await supabase.from('referral_codes').insert({
        user_id: userId,
        code,
      })
      if (!error) break
      if (error.code === '23505') {
        code = generateReferralCode()
        attempts++
      } else {
        throw error
      }
    }
  }

  const { data: statsData } = await supabase.rpc('get_referral_stats', {
    p_user_id: userId,
  })

  const stats = statsData?.[0] || {
    total_referrals: 0,
    confirmed_referrals: 0,
    pending_referrals: 0,
    credits_earned_cents: 0,
  }

  const confirmed = Number(stats.confirmed_referrals) || 0
  const pending = Number(stats.pending_referrals) || 0
  const creditsEarned = Number(stats.credits_earned_cents) || 0

  const nextMilestone = REFERRAL_MILESTONES.find((m) => m.count > confirmed)
  const baseUrl = process.env.APP_URL || 'https://filingsflow.com'
  const referralUrl = `${baseUrl}/signup?ref=${code}`

  let progressText = `**${confirmed}** referrals`
  if (pending > 0) {
    progressText += ` (${pending} pending)`
  }

  let milestoneText = ''
  if (nextMilestone) {
    const remaining = nextMilestone.count - confirmed
    milestoneText = `\n\n**Next Milestone:** ${nextMilestone.count} referrals → +${formatCents(nextMilestone.amountCents)}\n*${remaining} more to go!*`
  } else {
    milestoneText = '\n\n**All milestones reached!** Thank you for spreading the word!'
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle('Your Referral Dashboard')
    .setDescription(
      `**Your Code:** \`${code}\`\n` +
      `**Link:** ${referralUrl}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Progress:** ${progressText}\n` +
      `**Credits Earned:** ${formatCents(creditsEarned)}` +
      milestoneText +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Rewards:**\n` +
      `• 5 referrals → $5 credit\n` +
      `• 15 referrals → $20 credit\n` +
      `• 30 referrals → $50 credit\n` +
      `• 50 referrals → $100 credit\n\n` +
      `Share FilingsFlow to earn account credits!`
    )
    .setFooter({ text: 'Not investment advice • Data from SEC EDGAR • filingsflow.com' })

  await interaction.editReply({ embeds: [embed] })
}
