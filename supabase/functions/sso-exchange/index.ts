// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspace')
  const body = await req.json().catch(() => ({}))
  const { action } = body

  if (action === 'getLoginUrl') {
    if (!workspaceId) return new Response(JSON.stringify({ error: 'Missing workspace' }), { status: 400 })
    const { data: cfg } = await supabase.from('sso_configs').select('*').eq('workspace_id', workspaceId).eq('enabled', true).single()
    if (!cfg) return new Response(JSON.stringify({ error: 'SSO not configured' }), { status: 404 })

    // In production: fetch metadata, generate AuthnRequest, sign with private key
    // For now return a redirect to the IdP metadata URL as a stub
    const loginUrl = cfg.saml_metadata_url
      ? `${cfg.saml_metadata_url}?RelayState=${encodeURIComponent(workspaceId)}`
      : null
    return new Response(JSON.stringify({ loginUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // SAML Assertion Consumer Service (ACS) — POST from IdP after authentication
  if (req.method === 'POST' && !action) {
    const formData = await req.formData().catch(() => null)
    const samlResponse = formData?.get('SAMLResponse')?.toString() ?? ''
    const relayState = formData?.get('RelayState')?.toString() ?? workspaceId ?? ''

    if (!samlResponse) return new Response('Missing SAMLResponse', { status: 400 })

    // In production: verify signature, parse assertion XML, extract attributes
    // For MVP: decode base64 and extract name/email (simplified)
    let email: string | null = null
    try {
      const decoded = atob(samlResponse)
      const emailMatch = decoded.match(/<(?:saml:|saml2:)?NameID[^>]*>([^<]+)</)
      email = emailMatch?.[1]?.trim() ?? null
    } catch {}

    if (!email) return new Response('Could not extract email from SAML assertion', { status: 400 })

    const { data: cfg } = await supabase.from('sso_configs').select('*').eq('workspace_id', relayState).single()
    if (!cfg) return new Response('SSO config not found', { status: 404 })

    // JIT provision
    if (cfg.jit_provisioning) {
      const { data: existing } = await supabase.auth.admin.getUserByEmail(email).catch(() => ({ data: null }))
      let userId = existing?.user?.id

      if (!userId) {
        const { data: created } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { workspace_id: relayState, sso_provider: cfg.provider } })
        userId = created?.user?.id
      }

      if (userId) {
        await supabase.from('workspace_members').upsert({ workspace_id: relayState, user_id: userId, role: cfg.default_role ?? 'member' }, { onConflict: 'workspace_id,user_id' })
        // Log SSO login
        await supabase.from('audit_logs').insert({ workspace_id: relayState, user_id: userId, action: 'sso.login', metadata: { provider: cfg.provider, email }, signature: 'sso-generated', created_at: new Date().toISOString() })
      }

      // Return magic link / session token
      const { data: session } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
      const redirectUrl = session?.properties?.hashed_token
        ? `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/?sso_token=${session.properties.hashed_token}`
        : `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/`

      return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectUrl } })
    }

    return new Response('JIT provisioning disabled', { status: 403 })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })
})
