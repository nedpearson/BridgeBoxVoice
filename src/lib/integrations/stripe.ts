/**
 * Stripe Integration Client
 * Checkout sessions, subscription management, webhook verification
 */

import { supabase } from '../supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StripePrice {
  id: string
  unit_amount: number
  currency: string
  recurring?: { interval: 'month' | 'year' }
  product: string
}

export interface StripeSubscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid'
  current_period_end: number
  items: { data: Array<{ price: StripePrice }> }
}

export interface CheckoutSessionParams extends Record<string, unknown> {
  priceId: string
  successUrl: string
  cancelUrl: string
  email?: string
  metadata?: Record<string, string>
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('stripe', {
    body: { action, ...params },
  })
  if (error) throw new Error(error.message)
  return data as T
}

export const Stripe = {
  /**
   * Create a Stripe Checkout Session and redirect to payment page
   * Returns the checkout URL
   */
  createCheckoutSession: async (params: CheckoutSessionParams): Promise<string> => {
    const { url } = await invoke<{ url: string }>('createCheckoutSession', params)
    return url
  },

  /**
   * Retrieve a subscription by ID
   */
  getSubscription: (subscriptionId: string) =>
    invoke<StripeSubscription>('getSubscription', { subscriptionId }),

  /**
   * Cancel a subscription at period end
   */
  cancelSubscription: (subscriptionId: string) =>
    invoke<StripeSubscription>('cancelSubscription', { subscriptionId }),

  /**
   * List available price plans
   */
  getPrices: () => invoke<{ data: StripePrice[] }>('getPrices'),

  /**
   * Create a customer portal session (for managing billing)
   */
  createPortalSession: (customerId: string, returnUrl: string) =>
    invoke<{ url: string }>('createPortalSession', { customerId, returnUrl }),
}

// ─── Client-side Stripe.js helper (for payment elements) ─────────────────────

export async function loadStripeJs(): Promise<boolean> {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  if (!key) { console.warn('Stripe publishable key not set'); return false }
  return true
}

// ─── Plan helpers ─────────────────────────────────────────────────────────────

export const PLANS = [
  { id: 'starter',      label: 'Starter',      price: 49,  interval: 'month', priceId: 'price_starter' },
  { id: 'professional', label: 'Professional',  price: 149, interval: 'month', priceId: 'price_pro' },
  { id: 'business',     label: 'Business',      price: 499, interval: 'month', priceId: 'price_business' },
  { id: 'enterprise',   label: 'Enterprise',    price: 0,   interval: 'custom', priceId: '' },
] as const

export type PlanId = typeof PLANS[number]['id']
