/**
 * Google Calendar Integration Client
 * OAuth 2.0 PKCE flow + Calendar API v3 via Supabase Edge Function
 */

import { supabase } from '../supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone?: string }
  end:   { dateTime: string; timeZone?: string }
  attendees?: Array<{ email: string; displayName?: string }>
  colorId?: string
  reminders?: { useDefault: boolean; overrides?: Array<{ method: 'email' | 'popup'; minutes: number }> }
}

export interface CalendarEventList {
  items: CalendarEvent[]
  nextPageToken?: string
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES    = 'https://www.googleapis.com/auth/calendar'

export function buildAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id:             import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
    redirect_uri:          `${window.location.origin}/oauth/google/callback`,
    response_type:         'code',
    scope:                 SCOPES,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
  })
  return `${AUTH_URL}?${params}`
}

/** Generate PKCE code verifier + challenge */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = crypto.getRandomValues(new Uint8Array(32))
  const verifier = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('google-calendar', { body: { action, ...params } })
  if (error) throw new Error(error.message)
  return data as T
}

export const GoogleCalendar = {
  /** List upcoming events */
  listEvents: (params?: { maxResults?: number; calendarId?: string }) =>
    invoke<CalendarEventList>('listEvents', params),

  /** Create a new calendar event */
  createEvent: (event: CalendarEvent) =>
    invoke<CalendarEvent>('createEvent', { event }),

  /** Update an existing event */
  updateEvent: (eventId: string, event: Partial<CalendarEvent>) =>
    invoke<CalendarEvent>('updateEvent', { eventId, event }),

  /** Delete an event */
  deleteEvent: (eventId: string) =>
    invoke<void>('deleteEvent', { eventId }),

  /**
   * Sync a list of local appointments to Google Calendar.
   * Upserts each appointment as an event using a `bridgebox_id` extended property.
   */
  syncAppointments: (appointments: Array<{
    id: string
    title: string
    description?: string
    start: Date
    end: Date
    attendeeEmail?: string
  }>) => {
    const events: CalendarEvent[] = appointments.map((a) => ({
      summary: a.title,
      description: a.description,
      start: { dateTime: a.start.toISOString() },
      end:   { dateTime: a.end.toISOString() },
      attendees: a.attendeeEmail ? [{ email: a.attendeeEmail }] : undefined,
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
    }))
    return invoke<{ synced: number }>('syncBatch', { events })
  },
}
