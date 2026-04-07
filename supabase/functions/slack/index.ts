// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const botToken = Deno.env.get('SLACK_BOT_TOKEN')!

  try {
    const {
      action, webhookUrl, channel, text, blocks,
      projectName, deployUrl, deployStatus, username,
    } = await req.json()

    let result: unknown

    const slackPost = async (endpoint: string, body: Record<string, unknown>) => {
      const res = await fetch(`https://slack.com/api/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res.json()
    }

    if (action === 'postWebhook') {
      if (!webhookUrl) throw new Error('webhookUrl required')
      const payload: Record<string, unknown> = { text }
      if (blocks) payload.blocks = blocks

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      result = { ok: res.ok, status: res.status }

    } else if (action === 'postMessage') {
      if (!channel || !text) throw new Error('channel and text required')
      result = await slackPost('chat.postMessage', { channel, text, blocks, username })

    } else if (action === 'notifyDeployment') {
      // Rich deployment notification with Block Kit
      const color = deployStatus === 'success' ? '#2EB886' : deployStatus === 'error' ? '#E01E5A' : '#ECB22E'
      const icon  = deployStatus === 'success' ? '✅' : deployStatus === 'error' ? '❌' : '🚀'

      const slackBlocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${icon} Bridgebox Voice Deployment ${deployStatus === 'success' ? 'Succeeded' : 'Update'}` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Project:*\n${projectName ?? 'Unknown'}` },
            { type: 'mrkdwn', text: `*Status:*\n${deployStatus ?? 'in progress'}` },
          ],
        },
        ...(deployUrl ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `*Live URL:*\n<${deployUrl}|${deployUrl}>` },
        }] : []),
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `Deployed at ${new Date().toLocaleString()}` }],
        },
      ]

      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks: slackBlocks }),
        })
        result = { ok: res.ok }
      } else if (channel) {
        result = await slackPost('chat.postMessage', { channel, blocks: slackBlocks })
      } else {
        throw new Error('webhookUrl or channel required for notifyDeployment')
      }

    } else if (action === 'listChannels') {
      result = await slackPost('conversations.list', { types: 'public_channel,private_channel', limit: 100 })

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

