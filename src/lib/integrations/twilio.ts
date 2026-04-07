/**
 * Twilio SMS Integration Client
 * Sends SMS and schedules appointment reminders via Supabase Edge Function
 */

import { supabase } from '../supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SMSResult {
  sid: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
  to: string
}

export interface ReminderPayload {
  to: string              // E.164 format: +14155552671
  message: string
  sendAt?: string         // ISO 8601 — if omitted, sends immediately
  appointmentId?: string  // stored in Supabase for tracking
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function invoke<T>(params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('twilio', { body: params })
  if (error) throw new Error(error.message)
  return data as T
}

export const Twilio = {
  /**
   * Send an SMS immediately
   * @param to E.164 phone number (e.g. "+14155552671")
   * @param body Message text (max 160 chars for single SMS)
   */
  sendSMS: (to: string, body: string) =>
    invoke<SMSResult>({ to: formatPhone(to), body }),

  /**
   * Schedule a reminder for an upcoming appointment.
   * Stores the job in Supabase and fires via pg_cron or Edge Function cron.
   */
  scheduleReminder: async (payload: ReminderPayload): Promise<void> => {
    const { error } = await supabase.from('sms_queue').insert({
      to: formatPhone(payload.to),
      message: payload.message,
      send_at: payload.sendAt ?? new Date().toISOString(),
      appointment_id: payload.appointmentId ?? null,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  /**
   * Build a standard appointment reminder message
   */
  buildReminderMessage: (params: {
    customerName: string
    serviceName: string
    date: string  // human-readable e.g. "Tuesday, April 1 at 2:00 PM"
    businessName: string
    address?: string
  }): string => {
    let msg = `Hi ${params.customerName}! Reminder: your ${params.serviceName} appointment at ${params.businessName} is scheduled for ${params.date}.`
    if (params.address) msg += ` Address: ${params.address}.`
    msg += ' Reply STOP to unsubscribe.'
    return msg
  },
}

// ─── Phone formatting ─────────────────────────────────────────────────────────

/** Converts common formats to E.164 (US numbers assumed if no country code) */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return `+${digits}` // pass through as-is for international numbers
}

/** Validate E.164 format */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(formatPhone(phone))
}
