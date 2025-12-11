import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

function getStripePrices() {
  const pro = process.env.STRIPE_PRO_PRICE_ID
  const premium = process.env.STRIPE_PREMIUM_PRICE_ID

  if (!pro || !premium) {
    console.warn('Stripe price IDs not configured. Subscriptions will not work.')
  }

  return {
    pro: pro || 'price_not_configured',
    premium: premium || 'price_not_configured',
  } as const
}

export const STRIPE_PRICES = getStripePrices()

export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY')
  if (!process.env.STRIPE_PRO_PRICE_ID) missing.push('STRIPE_PRO_PRICE_ID')
  if (!process.env.STRIPE_PREMIUM_PRICE_ID) missing.push('STRIPE_PREMIUM_PRICE_ID')
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET')
  return { valid: missing.length === 0, missing }
}

export function getTierFromPrice(priceId: string): 'pro' | 'premium' | null {
  if (priceId === STRIPE_PRICES.pro) return 'pro'
  if (priceId === STRIPE_PRICES.premium) return 'premium'
  return null
}
