// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scim-token',
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// SCIM 2.0 base path: /functions/v1/scim/v2/:workspaceId/Users

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  // Expected: [..., 'scim', 'v2', workspaceId, 'Users', optionalId]
  const scimIdx = pathParts.findIndex(p => p === 'scim')
  const workspaceId = pathParts[scimIdx + 2]
  const resource = pathParts[scimIdx + 3] ?? 'Users'
  const resourceId = pathParts[scimIdx + 4]

  if (!workspaceId) return new Response(JSON.stringify({ error: 'Missing workspaceId' }), { status: 400 })

  // Authenticate SCIM token
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (token) {
    const encoder = new TextEncoder()
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(token))
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
    const { data: cfg } = await supabase.from('sso_configs').select('scim_token_hash, scim_enabled').eq('workspace_id', workspaceId).single()
    if (!cfg?.scim_enabled || cfg?.scim_token_hash !== hashHex) {
      return new Response(JSON.stringify({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: 401, detail: 'Invalid SCIM token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' } })
    }
  }

  const respondSCIM = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' } })

  // GET /Users or GET /Users/:id
  if (req.method === 'GET' && resource === 'Users') {
    if (resourceId) {
      const { data } = await supabase.from('scim_users').select('*').eq('id', resourceId).eq('workspace_id', workspaceId).single()
      if (!data) return respondSCIM({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: 404, detail: 'User not found' }, 404)
      return respondSCIM(toSCIMUser(data))
    }
    const { data: users } = await supabase.from('scim_users').select('*').eq('workspace_id', workspaceId)
    return respondSCIM({ schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: users?.length ?? 0, Resources: (users ?? []).map(toSCIMUser) })
  }

  // POST /Users — create or JIT provision
  if (req.method === 'POST' && resource === 'Users') {
    const body = await req.json()
    const email = body.emails?.[0]?.value ?? body.userName
    const displayName = body.displayName ?? `${body.name?.givenName ?? ''} ${body.name?.familyName ?? ''}`.trim()

    // Check JIT provisioning config
    const { data: cfg } = await supabase.from('sso_configs').select('jit_provisioning, default_role').eq('workspace_id', workspaceId).single()

    if (cfg?.jit_provisioning) {
      // Create or get Supabase auth user
      const { data: authUser } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: displayName, workspace_id: workspaceId } })
      const userId = authUser?.user?.id

      // Upsert workspace membership
      if (userId) {
        await supabase.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: userId, role: cfg.default_role ?? 'member' }, { onConflict: 'workspace_id,user_id' })
      }

      const { data: scimUser } = await supabase.from('scim_users').insert({ workspace_id: workspaceId, external_id: body.externalId ?? email, user_id: userId, display_name: displayName, emails: body.emails, active: body.active ?? true, raw_attributes: body }).select().single()
      return respondSCIM(toSCIMUser(scimUser), 201)
    }

    return respondSCIM({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: 403, detail: 'JIT provisioning disabled' }, 403)
  }

  // PATCH /Users/:id — update (activate/deactivate)
  if (req.method === 'PATCH' && resource === 'Users' && resourceId) {
    const body = await req.json()
    const active = body.Operations?.find((op: any) => op.path === 'active')?.value
    if (active !== undefined) {
      await supabase.from('scim_users').update({ active, synced_at: new Date().toISOString() }).eq('id', resourceId)
    }
    const { data } = await supabase.from('scim_users').select('*').eq('id', resourceId).single()
    return respondSCIM(toSCIMUser(data))
  }

  // DELETE /Users/:id — deprovision
  if (req.method === 'DELETE' && resource === 'Users' && resourceId) {
    const { data: scimUser } = await supabase.from('scim_users').select('user_id').eq('id', resourceId).single()
    if (scimUser?.user_id) {
      await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', scimUser.user_id)
    }
    await supabase.from('scim_users').update({ active: false }).eq('id', resourceId)
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  return respondSCIM({ error: 'Not Found' }, 404)
})

function toSCIMUser(u: any) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: u.id,
    externalId: u.external_id,
    displayName: u.display_name,
    emails: u.emails ?? [],
    active: u.active,
    meta: { resourceType: 'User', created: u.created_at, lastModified: u.synced_at },
  }
}
