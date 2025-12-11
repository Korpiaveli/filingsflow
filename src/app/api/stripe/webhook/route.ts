import { getStripe, getTierFromPrice } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

const processedEvents = new Set<string>()
const EVENT_CACHE_TTL = 60 * 60 * 1000

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (processedEvents.has(event.id)) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  processedEvents.add(event.id)
  setTimeout(() => processedEvents.delete(event.id), EVENT_CACHE_TTL)

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const tier = session.metadata?.tier

      if (userId && tier) {
        await supabase
          .from('users')
          .update({
            subscription_tier: tier as 'pro' | 'premium',
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
          })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id

      if (userId) {
        const priceId = subscription.items.data[0]?.price.id
        const tier = priceId ? (getTierFromPrice(priceId) || 'free') : 'free'

        await supabase
          .from('users')
          .update({
            subscription_tier: tier,
            subscription_status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing',
          })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id

      if (userId) {
        await supabase
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('id', userId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({ subscription_status: 'past_due' })
          .eq('id', user.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
