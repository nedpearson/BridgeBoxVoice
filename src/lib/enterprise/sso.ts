/**
 * SSO / SAML 2.0 + SCIM 2.0 Client
 * Handles IdP configuration, auth URL generation, and SCIM token management
 */

import { supabase } from '../supabase'

export type SSOProvider = 'okta' | 'azure_ad' | 'google' | 'onelogin' | 'custom_saml'

export interface SSOConfig {
  id: string
  workspaceId: string
  provider: SSOProvider
  samlMetadataUrl: string | null
  samlEntityId: string | null
  samlAcsUrl: string | null
  scimEnabled: boolean
  jitProvisioning: boolean
  defaultRole: string
  attributeMapping: Record<string, string>
  enabled: boolean
}

// ─── Known IdP metadata URLs ──────────────────────────────────────────────────

export const PROVIDER_DOCS: Record<SSOProvider, { name: string; docsUrl: string; icon: string }> = {
  okta:        { name: 'Okta',           docsUrl: 'https://developer.okta.com/docs/guides/saml-tracer',                  icon: '🔑' },
  azure_ad:    { name: 'Azure Active Directory', docsUrl: 'https://learn.microsoft.com/en-us/azure/active-directory/saas-apps', icon: '☁️' },
  google:      { name: 'Google Workspace', docsUrl: 'https://support.google.com/a/answer/6087519',                        icon: '🔵' },
  onelogin:    { name: 'OneLogin',        docsUrl: 'https://onelogin.service-now.com/support',                             icon: '🔐' },
  custom_saml: { name: 'Custom SAML 2.0', docsUrl: 'https://docs.oasis-open.org/security/saml/',                          icon: '⚙️' },
}

// ─── SSO Config CRUD ──────────────────────────────────────────────────────────

export async function getSSOConfig(workspaceId: string): Promise<SSOConfig | null> {
  const { data } = await supabase
    .from('sso_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (!data) return null

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    provider: data.provider,
    samlMetadataUrl: data.saml_metadata_url,
    samlEntityId: data.saml_entity_id,
    samlAcsUrl: data.saml_acs_url,
    scimEnabled: data.scim_enabled,
    jitProvisioning: data.jit_provisioning,
    defaultRole: data.default_role,
    attributeMapping: data.attribute_mapping ?? {},
    enabled: data.enabled,
  }
}

export async function upsertSSOConfig(
  workspaceId: string,
  config: Partial<Omit<SSOConfig, 'id' | 'workspaceId'>>
): Promise<SSOConfig> {
  const { error } = await supabase
    .from('sso_configs')
    .upsert({
      workspace_id: workspaceId,
      provider: config.provider,
      saml_metadata_url: config.samlMetadataUrl,
      saml_entity_id: config.samlEntityId,
      saml_acs_url: config.samlAcsUrl,
      scim_enabled: config.scimEnabled,
      jit_provisioning: config.jitProvisioning,
      default_role: config.defaultRole,
      attribute_mapping: config.attributeMapping,
      enabled: config.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' })
    .select()
    .single()

  if (error) throw error
  return getSSOConfig(workspaceId) as Promise<SSOConfig>
}

// ─── SCIM Token Management ────────────────────────────────────────────────────

export async function rotateSCIMToken(workspaceId: string): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')

  // Hash before storing
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

  await supabase
    .from('sso_configs')
    .update({ scim_token_hash: hashHex, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)

  // Return plaintext token once — it won't be retrievable after this
  return `scim_${token}`
}

// ─── Metadata URL helpers ────────────────────────────────────────────────────

export function getACSUrl(workspaceId: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL ?? ''
  return `${base}/functions/v1/sso-exchange?workspace=${workspaceId}`
}

export function getEntityId(workspaceId: string): string {
  return `https://bridgebox.ai/saml/${workspaceId}`
}

// ─── SAML Login Redirect ──────────────────────────────────────────────────────

export async function initiateSSO(workspaceId: string): Promise<string> {
  const { data: fn } = await supabase.functions.invoke('sso-exchange', {
    body: { action: 'getLoginUrl', workspaceId },
  })
  if (!fn?.loginUrl) throw new Error('Failed to generate SSO login URL')
  return fn.loginUrl
}

