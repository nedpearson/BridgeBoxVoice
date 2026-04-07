// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const QB_BASE = 'https://quickbooks.api.intuit.com/v3/company'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { action, accessToken, code, realmId, invoice, name, email, phone, since } =
      await req.json()

    // ── Token exchange ────────────────────────────────────────────────────────
    if (action === 'exchangeCode') {
      const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')!
      const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')!
      const redirectUri = Deno.env.get('QUICKBOOKS_REDIRECT_URI')!
      const basic = btoa(`${clientId}:${clientSecret}`)

      const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      })
      const tokens = await res.json()

      // Store tokens in Supabase
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await supabase.from('integration_tokens').upsert({
        provider: 'quickbooks', realm_id: realmId,
        access_token: tokens.access_token, refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })

      return new Response(JSON.stringify(tokens), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ── Retrieve stored tokens ────────────────────────────────────────────────
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: tokenRow } = await supabase.from('integration_tokens')
      .select('*').eq('provider', 'quickbooks').single()

    if (!tokenRow) throw new Error('QuickBooks not connected. Complete OAuth first.')
    const qbToken = tokenRow.access_token
    const realm = tokenRow.realm_id
    const headers = { Authorization: `Bearer ${qbToken}`, Accept: 'application/json' }

    // ── API actions ───────────────────────────────────────────────────────────
    let result: unknown

    if (action === 'getCustomers') {
      const r = await fetch(`${QB_BASE}/${realm}/query?query=SELECT * FROM Customer MAXRESULTS 100`, { headers })
      result = await r.json()
    } else if (action === 'createInvoice') {
      const r = await fetch(`${QB_BASE}/${realm}/invoice`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      })
      result = await r.json()
    } else if (action === 'getPayments') {
      const whereClause = since ? ` WHERE TxnDate > '${since}'` : ''
      const r = await fetch(`${QB_BASE}/${realm}/query?query=SELECT * FROM Payment${whereClause} MAXRESULTS 50`, { headers })
      result = await r.json()
    } else if (action === 'syncCustomer') {
      const r = await fetch(`${QB_BASE}/${realm}/customer`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ DisplayName: name, PrimaryEmailAddr: { Address: email }, PrimaryPhone: phone ? { FreeFormNumber: phone } : undefined }),
      })
      result = await r.json()
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

