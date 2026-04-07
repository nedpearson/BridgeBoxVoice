// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() })

  try {
    const { action, priceId, successUrl, cancelUrl, email, customerId, metadata, sessionId } =
      await req.json()

    let result: unknown

    if (action === 'createCheckoutSession') {
      result = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        metadata: metadata ?? {},
      })
    } else if (action === 'getSubscription') {
      if (!customerId) throw new Error('customerId required')
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'all' })
      result = subs.data[0] ?? null
    } else if (action === 'createPortalSession') {
      if (!customerId) throw new Error('customerId required')
      result = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: successUrl,
      })
    } else if (action === 'getInvoices') {
      if (!customerId) throw new Error('customerId required')
      result = await stripe.invoices.list({ customer: customerId, limit: 10 })
    } else if (action === 'cancelSubscription') {
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 })
      if (!subs.data[0]) throw new Error('No active subscription')
      result = await stripe.subscriptions.cancel(subs.data[0].id)
    } else {
      throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

