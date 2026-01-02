import { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe/client'

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const REFERRAL_MILESTONES = [
  { count: 5, amountCents: 500 },
  { count: 15, amountCents: 2000 },
  { count: 30, amountCents: 5000 },
  { count: 50, amountCents: 10000 },
] as const

export interface ReferralStats {
  code: string
  totalReferrals: number
  confirmedReferrals: number
  pendingReferrals: number
  creditsEarnedCents: number
  nextMilestone: number | null
  creditsAtNextCents: number | null
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  code_used: string
  status: 'pending' | 'confirmed' | 'rejected'
  signup_ip: string | null
  created_at: string
  confirmed_at: string | null
}

interface ReferralStatsRow {
  total_referrals: number
  confirmed_referrals: number
  pending_referrals: number
  credits_earned_cents: number
}

export function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)]
  }
  return code
}

export async function getOrCreateReferralCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await (supabase as SupabaseClient)
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .single()

  if (existing) return (existing as { code: string }).code

  let code = generateReferralCode()
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    const { error } = await (supabase as SupabaseClient).from('referral_codes').insert({
      user_id: userId,
      code,
    })

    if (!error) return code

    if (error.code === '23505') {
      code = generateReferralCode()
      attempts++
    } else {
      throw error
    }
  }

  throw new Error('Failed to generate unique referral code')
}

export async function validateReferralCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
  const { data } = await (supabase as SupabaseClient)
    .from('referral_codes')
    .select('user_id, users(email)')
    .eq('code', code.toUpperCase())
    .single()

  if (!data) return { valid: false }

  const row = data as unknown as { user_id: string; users: { email: string } | { email: string }[] | null }
  let email: string | undefined
  if (Array.isArray(row.users)) {
    email = row.users[0]?.email
  } else {
    email = row.users?.email
  }
  const referrerName = email ? (email.split('@')[0] ?? '').slice(0, 2) + '***' : 'User'

  return {
    valid: true,
    referrerId: row.user_id,
    referrerName,
  }
}

export async function trackReferral(
  supabase: SupabaseClient,
  code: string,
  referredUserId: string,
  signupIp: string | null
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateReferralCode(supabase, code)
  if (!validation.valid || !validation.referrerId) {
    return { success: false, error: 'Invalid referral code' }
  }

  if (validation.referrerId === referredUserId) {
    await logAuditEvent(supabase, 'self_referral_attempt', referredUserId, {
      code,
    }, signupIp)
    return { success: false, error: 'Cannot refer yourself' }
  }

  const { data: existingRef } = await (supabase as SupabaseClient)
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .single()

  if (existingRef) {
    return { success: false, error: 'User already referred' }
  }

  const { error } = await (supabase as SupabaseClient).from('referrals').insert({
    referrer_id: validation.referrerId,
    referred_id: referredUserId,
    code_used: code.toUpperCase(),
    status: 'pending',
    signup_ip: signupIp,
  })

  if (error) {
    console.error('Failed to track referral:', error)
    return { success: false, error: 'Failed to track referral' }
  }

  await logAuditEvent(supabase, 'referral_created', validation.referrerId, {
    referred_id: referredUserId,
    code,
  }, signupIp)

  return { success: true }
}

export async function getReferralStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ReferralStats | null> {
  const code = await getOrCreateReferralCode(supabase, userId)

  const { data: stats } = await (supabase as SupabaseClient).rpc('get_referral_stats', {
    p_user_id: userId,
  })

  const rows = stats as ReferralStatsRow[] | null
  if (!rows || !rows[0]) {
    return {
      code,
      totalReferrals: 0,
      confirmedReferrals: 0,
      pendingReferrals: 0,
      creditsEarnedCents: 0,
      nextMilestone: REFERRAL_MILESTONES[0].count,
      creditsAtNextCents: REFERRAL_MILESTONES[0].amountCents,
    }
  }

  const row = rows[0]
  const confirmed = Number(row.confirmed_referrals) || 0

  const nextMilestoneObj = REFERRAL_MILESTONES.find((m) => m.count > confirmed)

  return {
    code,
    totalReferrals: Number(row.total_referrals) || 0,
    confirmedReferrals: confirmed,
    pendingReferrals: Number(row.pending_referrals) || 0,
    creditsEarnedCents: Number(row.credits_earned_cents) || 0,
    nextMilestone: nextMilestoneObj?.count ?? null,
    creditsAtNextCents: nextMilestoneObj?.amountCents ?? null,
  }
}

export async function isValidReferral(
  supabase: SupabaseClient,
  referral: Referral
): Promise<{ valid: boolean; reason?: string }> {
  if (referral.referrer_id === referral.referred_id) {
    return { valid: false, reason: 'self_referral' }
  }

  if (referral.signup_ip) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count } = await (supabase as SupabaseClient)
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('signup_ip', referral.signup_ip)
      .gte('created_at', twentyFourHoursAgo)

    if ((count || 0) > 3) {
      return { valid: false, reason: 'ip_velocity_exceeded' }
    }
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('id', referral.referred_id)
    .single()

  if (!user) {
    return { valid: false, reason: 'referred_user_deleted' }
  }

  return { valid: true }
}

export async function confirmReferral(
  supabase: SupabaseClient,
  referralId: string
): Promise<void> {
  await (supabase as SupabaseClient)
    .from('referrals')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', referralId)
}

export async function rejectReferral(
  supabase: SupabaseClient,
  referralId: string,
  reason: string
): Promise<void> {
  await (supabase as SupabaseClient)
    .from('referrals')
    .update({
      status: 'rejected',
      rejection_reason: reason,
    })
    .eq('id', referralId)
}

export async function getConfirmedReferralCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await (supabase as SupabaseClient)
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('status', 'confirmed')

  return count || 0
}

export async function getAwardedMilestones(
  supabase: SupabaseClient,
  userId: string
): Promise<number[]> {
  const { data } = await (supabase as SupabaseClient)
    .from('referral_credits')
    .select('milestone')
    .eq('user_id', userId)

  const rows = data as { milestone: number }[] | null
  return rows?.map((r) => r.milestone) || []
}

export async function awardReferralCredit(
  supabase: SupabaseClient,
  userId: string,
  amountCents: number,
  milestone: number
): Promise<{ success: boolean; error?: string }> {
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  const userRow = user as { stripe_customer_id: string | null } | null
  if (!userRow?.stripe_customer_id) {
    return { success: false, error: 'User has no Stripe customer' }
  }

  try {
    const stripe = getStripe()
    const txn = await stripe.customers.createBalanceTransaction(
      userRow.stripe_customer_id,
      {
        amount: -amountCents,
        currency: 'usd',
        description: `Referral reward: ${milestone} referrals milestone`,
      }
    )

    await (supabase as SupabaseClient).from('referral_credits').insert({
      user_id: userId,
      milestone,
      amount_cents: amountCents,
      stripe_txn_id: txn.id,
    })

    await logAuditEvent(supabase, 'credit_awarded', userId, {
      milestone,
      amount_cents: amountCents,
      stripe_txn_id: txn.id,
    }, null)

    return { success: true }
  } catch (error) {
    console.error('Failed to award referral credit:', error)
    return { success: false, error: 'Failed to award credit' }
  }
}

export async function checkAndAwardMilestones(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const count = await getConfirmedReferralCount(supabase, userId)
  const awarded = await getAwardedMilestones(supabase, userId)

  for (const m of REFERRAL_MILESTONES) {
    if (count >= m.count && !awarded.includes(m.count)) {
      await awardReferralCredit(supabase, userId, m.amountCents, m.count)
    }
  }
}

export async function getPendingReferralsOver24h(
  supabase: SupabaseClient
): Promise<Referral[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await (supabase as SupabaseClient)
    .from('referrals')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', twentyFourHoursAgo)

  return (data as Referral[]) || []
}

async function logAuditEvent(
  supabase: SupabaseClient,
  eventType: string,
  userId: string | null,
  details: Record<string, unknown>,
  ipAddress: string | null
): Promise<void> {
  await (supabase as SupabaseClient).from('referral_audit_log').insert({
    event_type: eventType,
    user_id: userId,
    details,
    ip_address: ipAddress,
  })
}
