/**
 * Integration Agent
 * Generates OAuth config, API client stubs, and Supabase Edge Functions for each integration
 */

export interface OAuthConfig {
  provider: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnvVar: string
  clientSecretEnvVar: string
  redirectUri: string
  pkce: boolean
}

export interface IntegrationClient {
  provider: string
  type: 'oauth' | 'api_key' | 'webhook'
  oauthConfig?: OAuthConfig
  edgeFunctionCode: string
  clientCode: string
  envVarsRequired: string[]
  documentationUrl: string
}

// ─── Integration definitions ──────────────────────────────────────────────────

const INTEGRATION_REGISTRY: Record<string, Omit<IntegrationClient, 'edgeFunctionCode' | 'clientCode'>> = {
  QuickBooks: {
    provider: 'QuickBooks',
    type: 'oauth',
    oauthConfig: {
      provider: 'QuickBooks',
      authUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      scopes: ['com.intuit.quickbooks.accounting'],
      clientIdEnvVar: 'VITE_QUICKBOOKS_CLIENT_ID',
      clientSecretEnvVar: 'QUICKBOOKS_CLIENT_SECRET',
      redirectUri: `${window?.location?.origin ?? 'https://app.bridgebox.ai'}/oauth/quickbooks/callback`,
      pkce: false,
    },
    envVarsRequired: ['VITE_QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET', 'QUICKBOOKS_REALM_ID'],
    documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account',
  },
  Stripe: {
    provider: 'Stripe',
    type: 'api_key',
    envVarsRequired: ['VITE_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    documentationUrl: 'https://stripe.com/docs/api',
  },
  Twilio: {
    provider: 'Twilio',
    type: 'api_key',
    envVarsRequired: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
    documentationUrl: 'https://www.twilio.com/docs/usage/api',
  },
  'Google Calendar': {
    provider: 'Google Calendar',
    type: 'oauth',
    oauthConfig: {
      provider: 'Google Calendar',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/calendar'],
      clientIdEnvVar: 'VITE_GOOGLE_CLIENT_ID',
      clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
      redirectUri: `${window?.location?.origin ?? 'https://app.bridgebox.ai'}/oauth/google/callback`,
      pkce: true,
    },
    envVarsRequired: ['VITE_GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    documentationUrl: 'https://developers.google.com/calendar/api/v3/reference',
  },
  Slack: {
    provider: 'Slack',
    type: 'oauth',
    oauthConfig: {
      provider: 'Slack',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read', 'users:read'],
      clientIdEnvVar: 'VITE_SLACK_CLIENT_ID',
      clientSecretEnvVar: 'SLACK_CLIENT_SECRET',
      redirectUri: `${window?.location?.origin ?? 'https://app.bridgebox.ai'}/oauth/slack/callback`,
      pkce: false,
    },
    envVarsRequired: ['VITE_SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET', 'SLACK_WEBHOOK_URL'],
    documentationUrl: 'https://api.slack.com/methods',
  },
}

// ─── Edge Function generators ─────────────────────────────────────────────────

function generateQuickBooksEdgeFunction(): string {
  return `// supabase/functions/quickbooks/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')!
const REALM_ID = Deno.env.get('QUICKBOOKS_REALM_ID')!

serve(async (req) => {
  const { action, accessToken, ...params } = await req.json()
  const BASE = \`https://quickbooks.api.intuit.com/v3/company/\${REALM_ID}\`

  if (action === 'getCustomers') {
    const res = await fetch(\`\${BASE}/query?query=select * from Customer&minorversion=65\`, {
      headers: { Authorization: \`Bearer \${accessToken}\`, Accept: 'application/json' },
    })
    return new Response(await res.text(), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'createInvoice') {
    const res = await fetch(\`\${BASE}/invoice?minorversion=65\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${accessToken}\`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params.invoice),
    })
    return new Response(await res.text(), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
})`
}

function generateStripeEdgeFunction(): string {
  return `// supabase/functions/stripe/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() })
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const { action, ...params } = await req.json()

  if (action === 'createCheckoutSession') {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: \`\${params.successUrl}?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: params.cancelUrl,
      customer_email: params.email,
    })
    return new Response(JSON.stringify({ url: session.url }), { headers: CORS })
  }

  if (action === 'getSubscription') {
    const sub = await stripe.subscriptions.retrieve(params.subscriptionId)
    return new Response(JSON.stringify(sub), { headers: CORS })
  }

  if (action === 'webhook') {
    const sig = req.headers.get('stripe-signature')!
    const body = await req.text()
    try {
      const event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
      console.log('Stripe event:', event.type)
      return new Response(JSON.stringify({ received: true }), { headers: CORS })
    } catch (err) {
      return new Response(\`Webhook Error: \${err.message}\`, { status: 400 })
    }
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS })
})`
}

function generateTwilioEdgeFunction(): string {
  return `// supabase/functions/twilio/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!
const FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER')!
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const { to, body } = await req.json()

  const params = new URLSearchParams({ From: FROM_NUMBER, To: to, Body: body })
  const res = await fetch(\`https://api.twilio.com/2010-04-01/Accounts/\${ACCOUNT_SID}/Messages.json\`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(\`\${ACCOUNT_SID}:\${AUTH_TOKEN}\`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const data = await res.json()
  return new Response(JSON.stringify({ sid: data.sid, status: data.status }), { headers: CORS })
})`
}

function generateGoogleCalendarEdgeFunction(): string {
  return `// supabase/functions/google-calendar/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const { action, accessToken, ...params } = await req.json()
  const BASE = 'https://www.googleapis.com/calendar/v3'

  if (action === 'listEvents') {
    const qs = new URLSearchParams({ calendarId: params.calendarId ?? 'primary', maxResults: '50', orderBy: 'startTime', singleEvents: 'true', timeMin: new Date().toISOString() })
    const res = await fetch(\`\${BASE}/calendars/primary/events?\${qs}\`, { headers: { Authorization: \`Bearer \${accessToken}\` } })
    return new Response(await res.text(), { headers: CORS })
  }

  if (action === 'createEvent') {
    const res = await fetch(\`\${BASE}/calendars/primary/events\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${accessToken}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params.event),
    })
    return new Response(await res.text(), { headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS })
})`
}

function generateSlackEdgeFunction(): string {
  return `// supabase/functions/slack/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')!
const BOT_TOKEN   = Deno.env.get('SLACK_BOT_TOKEN') ?? ''
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const { action, ...params } = await req.json()

  if (action === 'postWebhook') {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: params.text, blocks: params.blocks }),
    })
    return new Response(JSON.stringify({ ok: res.ok }), { headers: CORS })
  }

  if (action === 'postMessage') {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: \`Bearer \${BOT_TOKEN}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: params.channel, text: params.text }),
    })
    return new Response(await res.text(), { headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS })
})`
}

// ─── Client-side stubs ────────────────────────────────────────────────────────

function generateClientStub(provider: string): string {
  const fn = provider.replace(/\s+/g, '')
  return `// src/lib/integrations/${fn.toLowerCase()}.ts — auto-generated client
// Calls the corresponding Supabase Edge Function

import { supabase } from '../supabase'

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('${fn.toLowerCase()}', {
    body: { action, ...params },
  })
  if (error) throw error
  return data
}

export const ${fn} = { invoke } // extend with specific methods as needed
`
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

const EDGE_FN_GENERATORS: Record<string, () => string> = {
  QuickBooks: generateQuickBooksEdgeFunction,
  Stripe: generateStripeEdgeFunction,
  Twilio: generateTwilioEdgeFunction,
  'Google Calendar': generateGoogleCalendarEdgeFunction,
  Slack: generateSlackEdgeFunction,
}

export function runIntegrationAgent(requestedIntegrations: string[]): IntegrationClient[] {
  return requestedIntegrations.map((name) => {
    const reg = INTEGRATION_REGISTRY[name]
    const edgeFn = EDGE_FN_GENERATORS[name] ?? (() => `// Edge function for ${name} — add manually`)
    return {
      provider: name,
      type: reg?.type ?? 'api_key',
      oauthConfig: reg?.oauthConfig,
      edgeFunctionCode: edgeFn(),
      clientCode: generateClientStub(name),
      envVarsRequired: reg?.envVarsRequired ?? [],
      documentationUrl: reg?.documentationUrl ?? `https://docs.${name.toLowerCase().replace(/\s+/g, '')}.com`,
    }
  })
}

// Build the OAuth redirect URL for a given integration
export function buildOAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: import.meta.env[config.clientIdEnvVar] ?? '',
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${config.authUrl}?${params}`
}
