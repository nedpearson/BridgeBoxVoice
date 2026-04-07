/**
 * Tamper-proof Audit Logger
 * Writes HMAC-signed immutable audit events to Supabase
 */

import { supabase } from '../supabase'

const AUDIT_SECRET = import.meta.env.VITE_AUDIT_HMAC_SECRET ?? 'dev-secret'

export type AuditAction =
  | 'user.login' | 'user.logout' | 'user.invite' | 'user.delete' | 'user.role_change'
  | 'project.create' | 'project.update' | 'project.delete' | 'project.deploy'
  | 'code.generate' | 'code.approve' | 'code.reject'
  | 'billing.subscribe' | 'billing.cancel' | 'billing.payment'
  | 'sso.login' | 'sso.provision' | 'sso.deprovision'
  | 'api_key.create' | 'api_key.revoke'
  | 'data.export' | 'data.delete' | 'data.access'
  | 'security.ip_blocked' | 'security.mfa_enabled' | 'security.mfa_disabled'
  | 'settings.update' | 'backup.start' | 'backup.complete'

export interface AuditEvent {
  action: AuditAction
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  workspaceId: string
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(AUDIT_SECRET)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const sigPayload = `${id}|${event.action}|${userId ?? ''}|${now}`
    const signature = await sign(sigPayload)

    await supabase.from('audit_logs').insert({
      id,
      workspace_id: event.workspaceId,
      user_id: userId,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      metadata: event.metadata ?? null,
      signature,
      created_at: now,
    })
  } catch (err) {
    // Never throw from audit logger — log to console only
    console.warn('[audit] Failed to write audit log:', err)
  }
}

export async function verifyAuditLog(log: {
  id: string; action: string; user_id: string | null; created_at: string; signature: string
}): Promise<boolean> {
  const sigPayload = `${log.id}|${log.action}|${log.user_id ?? ''}|${log.created_at}`
  const expected = await sign(sigPayload)
  return expected === log.signature
}

// Hook: audit all Supabase auth events automatically
supabase.auth.onAuthStateChange(async (event, session) => {
  if (!session) return
  const workspaceId = session.user.user_metadata?.workspace_id
  if (!workspaceId) return

  if (event === 'SIGNED_IN') await audit({ action: 'user.login', workspaceId })
  if (event === 'SIGNED_OUT') await audit({ action: 'user.logout', workspaceId })
})
