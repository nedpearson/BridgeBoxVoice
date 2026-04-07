// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? (await req.json().catch(() => ({}))).action

  // ── EXPORT ────────────────────────────────────────────────────────────────
  if (action === 'export') {
    const workspaceIds: string[] = []
    const { data: memberships } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id)
    memberships?.forEach(m => workspaceIds.push(m.workspace_id))

    const [{ data: profile }, { data: workspaces }, { data: projects }, { data: audit }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('workspaces').select('*').in('id', workspaceIds),
      supabase.from('projects').select('id, name, description, created_at').eq('owner_id', user.id),
      supabase.from('audit_logs').select('action, created_at, ip_address, metadata').eq('user_id', user.id).limit(1000),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      request_by: user.email,
      profile: { id: user.id, email: user.email, created_at: user.created_at, ...profile },
      workspaces: workspaces ?? [],
      projects: projects ?? [],
      audit_log: audit ?? [],
    }

    // Log the export event
    await supabase.from('audit_logs').insert({
      workspace_id: workspaceIds[0],
      user_id: user.id,
      action: 'gdpr.data_export',
      metadata: { exported_tables: ['profile', 'workspaces', 'projects', 'audit_logs'] },
      signature: 'gdpr-fn',
      created_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bridgebox-data-export-${Date.now()}.json"`,
      },
    })
  }

  // ── ERASE (Right to be forgotten) ─────────────────────────────────────────
  if (action === 'erase') {
    const body = await req.json().catch(() => ({}))
    if (!body.confirm || body.confirm !== 'DELETE MY ACCOUNT') {
      return new Response(JSON.stringify({ error: 'Must confirm with "DELETE MY ACCOUNT"' }), { status: 400 })
    }

    // Anonymize personal data (retain audit logs for legal compliance)
    await supabase.from('audit_logs')
      .update({ user_id: null, ip_address: null, metadata: { anonymized: true } })
      .eq('user_id', user.id)

    // Delete workspace data owned by this user
    await supabase.from('projects').delete().eq('owner_id', user.id)
    await supabase.from('workspace_members').delete().eq('user_id', user.id)

    // Delete the Supabase auth user
    await supabase.auth.admin.deleteUser(user.id)

    return new Response(JSON.stringify({ success: true, message: 'Account and personal data erased.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown action. Use ?action=export or action=erase' }), {
    status: 400,
    headers: corsHeaders,
  })
})
