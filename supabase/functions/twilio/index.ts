// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!
  const basic      = btoa(`${accountSid}:${authToken}`)
  const baseUrl    = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`

  try {
    const { action, to, body, mediaUrl, scheduledTime, type, appointmentDetails } =
      await req.json()

    let result: unknown

    const sendSms = async (toNum: string, msgBody: string) => {
      const form = new URLSearchParams({ From: fromNumber, To: toNum, Body: msgBody })
      if (mediaUrl) form.set('MediaUrl', mediaUrl)

      const res = await fetch(`${baseUrl}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      })
      return res.json()
    }

    if (action === 'sendSMS') {
      if (!to || !body) throw new Error('to and body required')
      result = await sendSms(to, body)

    } else if (action === 'scheduleReminder') {
      // Build reminder message from appointment details
      const appt = appointmentDetails ?? {}
      const msg = `Reminder: You have an appointment on ${appt.date ?? 'soon'} at ${appt.time ?? 'TBD'}`
        + (appt.location ? ` at ${appt.location}` : '')
        + `. Reply CONFIRM or CANCEL.`

      result = await sendSms(to, msg)

    } else if (action === 'sendBulk') {
      if (!Array.isArray(to)) throw new Error('to must be an array for bulk sends')
      const results = await Promise.allSettled(to.map((num: string) => sendSms(num, body)))
      result = results.map((r) => r.status === 'fulfilled' ? r.value : { error: r.reason })

    } else if (action === 'getMessages') {
      const res = await fetch(`${baseUrl}/Messages.json?PageSize=20`, {
        headers: { Authorization: `Basic ${basic}` },
      })
      result = await res.json()

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

