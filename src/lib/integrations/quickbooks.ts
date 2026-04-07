/**
 * QuickBooks Online Integration Client
 * OAuth 2.0 flow + API wrapper calling the Supabase Edge Function
 */

import { supabase } from '../supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QBCustomer {
  Id: string
  DisplayName: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  Balance: number
}

export interface QBInvoice {
  CustomerRef: { value: string; name?: string }
  Line: Array<{ Amount: number; DetailType: 'SalesItemLineDetail'; SalesItemLineDetail: { ItemRef: { value: string; name: string } } }>
  DueDate?: string
}

export interface QBPayment {
  Id: string
  TotalAmt: number
  CustomerRef: { value: string; name: string }
  TxnDate: string
}

// ─── OAuth Helpers ────────────────────────────────────────────────────────────

const OAUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const SCOPES    = 'com.intuit.quickbooks.accounting'

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     import.meta.env.VITE_QUICKBOOKS_CLIENT_ID ?? '',
    redirect_uri:  `${window.location.origin}/oauth/quickbooks/callback`,
    response_type: 'code',
    scope:         SCOPES,
    state,
  })
  return `${OAUTH_URL}?${params}`
}

export async function exchangeCodeForTokens(code: string, realmId: string) {
  const { data, error } = await supabase.functions.invoke('quickbooks', {
    body: { action: 'exchangeCode', code, realmId },
  })
  if (error) throw error
  return data as { access_token: string; refresh_token: string; expires_in: number }
}

// ─── API Client (via Edge Function) ──────────────────────────────────────────

async function invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('quickbooks', {
    body: { action, accessToken: session?.access_token, ...params },
  })
  if (error) throw new Error(error.message)
  return data as T
}

export const QuickBooks = {
  /** List all customers from QBO */
  getCustomers: () => invoke<{ QueryResponse: { Customer: QBCustomer[] } }>('getCustomers'),

  /** Create an invoice in QBO */
  createInvoice: (invoice: QBInvoice) => invoke<{ Invoice: { Id: string; DocNumber: string } }>('createInvoice', { invoice }),

  /** Get recent payments */
  getPayments: (since?: string) => invoke<{ QueryResponse: { Payment: QBPayment[] } }>('getPayments', { since }),

  /** Sync a local customer to QBO */
  syncCustomer: (name: string, email: string, phone?: string) =>
    invoke('syncCustomer', { name, email, phone }),
}
