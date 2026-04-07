/**
 * Slack Integration Client
 * Incoming webhooks + Bot API via Supabase Edge Function
 */

import { supabase } from '../supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'actions' | 'context'
  text?: { type: 'mrkdwn' | 'plain_text'; text: string }
  elements?: Array<{ type: 'button' | 'image'; text?: { type: string; text: string }; value?: string; url?: string }>
}

export interface SlackMessage {
  text?: string
  blocks?: SlackBlock[]
  channel?: string
  username?: string
  icon_emoji?: string
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('slack', { body: { action, ...params } })
  if (error) throw new Error(error.message)
  return data as T
}

export const Slack = {
  /**
   * Post a simple message via incoming webhook (no auth required after setup)
   */
  postWebhook: (text: string, blocks?: SlackBlock[]) =>
    invoke<{ ok: boolean }>('postWebhook', { text, blocks }),

  /**
   * Post a message to a channel using the Bot token
   */
  postMessage: (channel: string, text: string, blocks?: SlackBlock[]) =>
    invoke<{ ts: string; channel: string }>('postMessage', { channel, text, blocks }),

  /**
   * List workspace channels
   */
  listChannels: () =>
    invoke<{ channels: Array<{ id: string; name: string; is_private: boolean }> }>('listChannels'),
}

// ─── Block Kit Helpers ────────────────────────────────────────────────────────

export const Blocks = {
  header: (text: string): SlackBlock => ({
    type: 'header',
    text: { type: 'plain_text', text },
  }),

  section: (text: string): SlackBlock => ({
    type: 'section',
    text: { type: 'mrkdwn', text },
  }),

  divider: (): SlackBlock => ({ type: 'divider' }),

  /** Build a deployment notification block kit message */
  deploymentNotification: (params: {
    appName:  string
    url:      string
    version:  string
    status:   'success' | 'failed' | 'building'
    builder:  string
  }): SlackMessage => {
    const emoji = params.status === 'success' ? '✅' : params.status === 'failed' ? '❌' : '⏳'
    return {
      text: `${emoji} ${params.appName} deployment ${params.status}`,
      blocks: [
        Blocks.header(`${emoji} Deployment ${params.status.charAt(0).toUpperCase() + params.status.slice(1)}`),
        Blocks.section([
          `*App:* ${params.appName}`,
          `*Version:* ${params.version}`,
          `*Built by:* ${params.builder}`,
          params.url ? `*URL:* <${params.url}|${params.url}>` : '',
        ].filter(Boolean).join('\n')),
        Blocks.divider(),
      ],
    }
  },
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     import.meta.env.VITE_SLACK_CLIENT_ID ?? '',
    redirect_uri:  `${window.location.origin}/oauth/slack/callback`,
    scope:         'chat:write channels:read users:read',
    state,
  })
  return `https://slack.com/oauth/v2/authorize?${params}`
}
