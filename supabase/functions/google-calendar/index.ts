// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CAL_BASE = 'https://www.googleapis.com/calendar/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const {
      action, code, calendarId = 'primary',
      timeMin, timeMax, event, eventId, events,
    } = await req.json()

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ── OAuth token exchange ───────────────────────────────────────────────────
    if (action === 'exchangeCode') {
      const clientId     = Deno.env.get('GOOGLE_CLIENT_ID')!
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!
      const redirectUri  = Deno.env.get('GOOGLE_REDIRECT_URI')!

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret,
          redirect_uri: redirectUri, grant_type: 'authorization_code',
        }),
      })
      const tokens = await res.json()

      await supabase.from('integration_tokens').upsert({
        provider: 'google_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })

      return new Response(JSON.stringify(tokens), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ── Get access token (refresh if needed) ──────────────────────────────────
    const { data: tokenRow } = await supabase.from('integration_tokens')
      .select('*').eq('provider', 'google_calendar').single()

    if (!tokenRow) throw new Error('Google Calendar not connected. Complete OAuth first.')

    let accessToken = tokenRow.access_token
    const expiry = new Date(tokenRow.expires_at ?? 0)

    if (expiry <= new Date()) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokenRow.refresh_token,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          grant_type: 'refresh_token',
        }),
      })
      const refreshed = await refreshRes.json()
      accessToken = refreshed.access_token
      await supabase.from('integration_tokens').update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq('provider', 'google_calendar')
    }

    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    let result: unknown

    if (action === 'listEvents') {
      const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '50' })
      if (timeMin) params.set('timeMin', timeMin)
      if (timeMax) params.set('timeMax', timeMax)
      const r = await fetch(`${CAL_BASE}/calendars/${calendarId}/events?${params}`, { headers })
      result = await r.json()

    } else if (action === 'createEvent') {
      const r = await fetch(`${CAL_BASE}/calendars/${calendarId}/events`, {
        method: 'POST', headers, body: JSON.stringify(event),
      })
      result = await r.json()

    } else if (action === 'updateEvent') {
      const r = await fetch(`${CAL_BASE}/calendars/${calendarId}/events/${eventId}`, {
        method: 'PATCH', headers, body: JSON.stringify(event),
      })
      result = await r.json()

    } else if (action === 'deleteEvent') {
      await fetch(`${CAL_BASE}/calendars/${calendarId}/events/${eventId}`, { method: 'DELETE', headers })
      result = { ok: true }

    } else if (action === 'syncAppointments') {
      // Batch upsert appointments from local app to Google Calendar
      const results = await Promise.allSettled(
        (events ?? []).map(async (e: Record<string, unknown>) => {
          const r = await fetch(`${CAL_BASE}/calendars/${calendarId}/events`, {
            method: 'POST', headers, body: JSON.stringify(e),
          })
          return r.json()
        })
      )
      result = results.map((r) => r.status === 'fulfilled' ? r.value : { error: (r as PromiseRejectedResult).reason })

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

