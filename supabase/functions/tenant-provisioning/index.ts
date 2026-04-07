// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Authenticate caller
  const authHeader = req.headers.get('authorization')
  const { data: { user }, error } = await adminClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '')
  if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Check caller is a super admin
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden — super admin only' }), { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  // ── CREATE tenant workspace ────────────────────────────────────────────────
  if (action === 'create_tenant') {
    const { name, plan = 'starter', owner_email, custom_domain } = body

    // Create the workspace
    const { data: workspace, error: wsErr } = await adminClient
      .from('workspaces')
      .insert({ name, plan, custom_domain, created_by: user.id })
      .select()
      .single()
    if (wsErr) return new Response(JSON.stringify({ error: wsErr.message }), { status: 400 })

    // Look up or create the owner user
    let ownerId: string | null = null
    const { data: existing } = await adminClient.from('profiles').select('id').eq('email', owner_email).single()
    if (existing) {
      ownerId = existing.id
    } else {
      // Invite new user
      const { data: invited } = await adminClient.auth.admin.inviteUserByEmail(owner_email, {
        data: { workspace_id: workspace.id, role: 'owner' },
        redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://app.bridgebox.ai'}/onboarding`,
      })
      ownerId = invited?.user?.id ?? null
    }

    // Add owner to workspace_members
    if (ownerId) {
      await adminClient.from('workspace_members').insert({
        workspace_id: workspace.id,
        user_id: ownerId,
        role: 'owner',
      })
    }

    // Initialize default feature flags for tenant
    const defaultFlags = ['voice_capture', 'ai_generation', 'marketplace', 'analytics']
    await adminClient.from('feature_flags').insert(
      defaultFlags.map(flag => ({ workspace_id: workspace.id, flag_name: flag, enabled: true, rollout_percentage: 100 }))
    )

    return new Response(JSON.stringify({
      success: true,
      workspace,
      owner_id: ownerId,
      message: `Tenant "${name}" provisioned. Owner invite sent to ${owner_email}.`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ── SUSPEND tenant ─────────────────────────────────────────────────────────
  if (action === 'suspend_tenant') {
    const { workspace_id, reason } = body
    await adminClient.from('workspaces').update({ suspended: true, suspended_reason: reason, suspended_at: new Date().toISOString() } as any).eq('id', workspace_id)
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
  }

  // ── LIST tenants ───────────────────────────────────────────────────────────
  if (action === 'list_tenants') {
    const { data: workspaces } = await adminClient
      .from('workspaces')
      .select('id, name, plan, created_at, custom_domain')
      .order('created_at', { ascending: false })
    return new Response(JSON.stringify({ workspaces }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action. Use: create_tenant, suspend_tenant, list_tenants' }), {
    status: 400, headers: corsHeaders,
  })
})
