import { createClient } from '@/lib/supabase/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { tier } = body

  if (tier !== 'pro' && tier !== 'premium') {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const stripe = getStripe()

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: {
        supabase_user_id: user.id,
      },
    })
    customerId = customer.id

    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const priceId = tier === 'pro' ? STRIPE_PRICES.pro : STRIPE_PRICES.premium

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
    metadata: {
      supabase_user_id: user.id,
      tier,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        tier,
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
