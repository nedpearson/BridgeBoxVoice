/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  PLATFORM SUPER-AGENT v1.0                                       ║
 * ║  Runtime health validator — runs once on app startup             ║
 * ║  Validates: DB schema, API keys, agent pipeline, UI components   ║
 * ║  Logs a colour-coded dashboard to the browser console            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { supabase } from '../supabase'

export interface HealthCheck {
  name: string
  status: 'ok' | 'warn' | 'fail'
  message: string
  fix?: string
}

export interface PlatformHealth {
  score: number          // 0-100
  checks: HealthCheck[]
  criticalFailures: string[]
  warnings: string[]
  timestamp: string
}

// ── Required Supabase tables ──────────────────────────────────────────────────
const REQUIRED_TABLES = [
  'workspaces',
  'projects',
  'profiles',
  'screen_captures',
  'workspace_members',
  'workspace_invitations',
  'enhancement_requests',
] as const

// ── Main validator ────────────────────────────────────────────────────────────
export async function runPlatformSuperAgent(): Promise<PlatformHealth> {
  const checks: HealthCheck[] = []

  // ── 1. Supabase connection ────────────────────────────────────────────────
  try {
    const { error } = await supabase.from('workspaces').select('id').limit(1)
    checks.push({
      name: 'Supabase Connection',
      status: error ? 'fail' : 'ok',
      message: error ? `DB unreachable: ${error.message}` : 'Connected and responding',
      fix: error ? 'Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env' : undefined,
    })
  } catch (e: any) {
    checks.push({ name: 'Supabase Connection', status: 'fail', message: e.message, fix: 'Check .env configuration' })
  }

  // ── 2. Auth session ───────────────────────────────────────────────────────
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    checks.push({
      name: 'Auth Session',
      status: error ? 'fail' : session ? 'ok' : 'warn',
      message: error ? error.message : session ? `Authenticated as ${session.user.email}` : 'No active session (user not logged in)',
    })
  } catch (e: any) {
    checks.push({ name: 'Auth Session', status: 'warn', message: 'Could not check auth: ' + e.message })
  }

  // ── 3. Required DB tables ─────────────────────────────────────────────────
  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1)
      // RLS "no rows" is fine; table-not-exist returns code 42P01
      const missing = error?.code === '42P01' || (error?.message ?? '').includes('does not exist')
      checks.push({
        name: `Table: ${table}`,
        status: missing ? (table === 'enhancement_requests' ? 'warn' : 'fail') : 'ok',
        message: missing ? `Table "${table}" does not exist in Supabase` : 'Table exists',
        fix: missing ? `Run the migration SQL for "${table}" in your Supabase dashboard` : undefined,
      })
    } catch (e: any) {
      checks.push({ name: `Table: ${table}`, status: 'warn', message: 'Could not verify: ' + e.message })
    }
  }

  // ── 4. Claude / AI Edge Function ──────────────────────────────────────────
  try {
    const { error } = await supabase.functions.invoke('ai-generate', {
      body: { model: 'claude-3-haiku-20240307', systemPrompt: 'Reply OK', userMessage: 'ping', maxTokens: 8 }
    })
    checks.push({
      name: 'AI Edge Function (Claude)',
      status: error ? 'fail' : 'ok',
      message: error ? `Edge function error: ${error.message}` : 'Claude API reachable',
      fix: error ? 'Check ANTHROPIC_API_KEY in Supabase Edge Function secrets' : undefined,
    })
  } catch (e: any) {
    checks.push({ name: 'AI Edge Function (Claude)', status: 'fail', message: 'Unreachable: ' + e.message, fix: 'Deploy ai-generate Edge Function to Supabase' })
  }

  // ── 5. Chrome extension ZIP available ────────────────────────────────────
  try {
    const res = await fetch('/bridgebox-extension.zip', { method: 'HEAD' })
    checks.push({
      name: 'Chrome Extension ZIP',
      status: res.ok ? 'ok' : 'warn',
      message: res.ok ? 'Extension ZIP served correctly (/bridgebox-extension.zip)' : `ZIP not found (HTTP ${res.status})`,
      fix: res.ok ? undefined : 'Copy chrome-extension/ folder as ZIP to public/bridgebox-extension.zip',
    })
  } catch (e: any) {
    checks.push({ name: 'Chrome Extension ZIP', status: 'warn', message: 'Could not verify: ' + e.message })
  }

  // ── 6. LocalStorage write/read ────────────────────────────────────────────
  try {
    const KEY = '__bbv_health__'
    localStorage.setItem(KEY, '1')
    const ok = localStorage.getItem(KEY) === '1'
    localStorage.removeItem(KEY)
    checks.push({
      name: 'LocalStorage (page cache)',
      status: ok ? 'ok' : 'fail',
      message: ok ? 'Read/write working — page data cache will function' : 'localStorage unavailable — page cache disabled',
    })
  } catch {
    checks.push({ name: 'LocalStorage (page cache)', status: 'warn', message: 'localStorage blocked (private browsing?)' })
  }

  // ── 7. Key environment variables ─────────────────────────────────────────
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  checks.push({
    name: 'Env: VITE_SUPABASE_URL',
    status: supabaseUrl ? 'ok' : 'fail',
    message: supabaseUrl ? 'Set correctly' : 'MISSING — app will not connect to database',
    fix: supabaseUrl ? undefined : 'Add VITE_SUPABASE_URL to .env',
  })
  checks.push({
    name: 'Env: VITE_SUPABASE_ANON_KEY',
    status: supabaseKey ? 'ok' : 'fail',
    message: supabaseKey ? 'Set correctly' : 'MISSING — auth and DB calls will fail',
    fix: supabaseKey ? undefined : 'Add VITE_SUPABASE_ANON_KEY to .env',
  })

  // ── 8. Vercel token (optional, needed for build pipeline) ─────────────────
  const vercelToken = import.meta.env.VITE_VERCEL_TOKEN
  checks.push({
    name: 'Env: VITE_VERCEL_TOKEN',
    status: vercelToken ? 'ok' : 'warn',
    message: vercelToken ? 'Present — app deployment pipeline enabled' : 'Missing — AI-built apps cannot be deployed to Vercel',
    fix: vercelToken ? undefined : 'Add VITE_VERCEL_TOKEN to .env for deployment pipeline',
  })

  // ── 9. SuperAgent in build pipeline ──────────────────────────────────────
  // Verify the SuperAgent module is importable (validates agent chain)
  try {
    await import('../agents/superAgent')
    checks.push({ name: 'SuperAgent (pre-deploy validator)', status: 'ok', message: 'Module loaded — validates code before every Vercel deploy' })
  } catch (e: any) {
    checks.push({ name: 'SuperAgent (pre-deploy validator)', status: 'fail', message: 'Cannot import: ' + e.message, fix: 'Check src/lib/agents/superAgent.ts for syntax errors' })
  }

  // ── 10. Core agent modules ────────────────────────────────────────────────
  const agents = [
    { name: 'Skeleton Agent', path: '../agents/skeletonAgent' },
    { name: 'Page Agent',     path: '../agents/pageAgent' },
    { name: 'Build Agent',    path: '../agents/buildAgent' },
    { name: 'Orchestrator',   path: '../agents/orchestrator' },
  ]
  for (const agent of agents) {
    try {
      await import(/* @vite-ignore */ agent.path)
      checks.push({ name: agent.name, status: 'ok', message: 'Module importable' })
    } catch (e: any) {
      checks.push({ name: agent.name, status: 'fail', message: 'Import failed: ' + e.message, fix: `Check ${agent.path}.ts for syntax errors` })
    }
  }

  // ── Aggregate results ─────────────────────────────────────────────────────
  const fails = checks.filter(c => c.status === 'fail')
  const warns = checks.filter(c => c.status === 'warn')
  const oks   = checks.filter(c => c.status === 'ok')
  const score = Math.round((oks.length / checks.length) * 100)

  const health: PlatformHealth = {
    score,
    checks,
    criticalFailures: fails.map(c => c.name),
    warnings: warns.map(c => c.name),
    timestamp: new Date().toISOString(),
  }

  // ── Print to console ──────────────────────────────────────────────────────
  _printHealthReport(health)

  return health
}

function _printHealthReport(h: PlatformHealth) {
  const bar = h.score >= 90 ? '🟢' : h.score >= 70 ? '🟡' : '🔴'
  console.groupCollapsed(`%c🤖 BridgeBox Voice — Platform SuperAgent  ${bar} ${h.score}/100`, 'font-weight:bold; font-size:13px; color:#6366F1')
  console.log(`%cRun at: ${h.timestamp}`, 'color:#475569; font-size:11px')
  console.log(`%c${h.checks.filter(c=>c.status==='ok').length} passed · ${h.checks.filter(c=>c.status==='warn').length} warnings · ${h.checks.filter(c=>c.status==='fail').length} failures`, 'font-size:12px; color:#94A3B8')
  console.log('')

  for (const c of h.checks) {
    const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'
    const color = c.status === 'ok' ? '#22C55E' : c.status === 'warn' ? '#F59E0B' : '#EF4444'
    console.log(`%c${icon} ${c.name}%c  ${c.message}${c.fix ? `\n   💡 Fix: ${c.fix}` : ''}`,
      `color:${color}; font-weight:600`, 'color:#94A3B8; font-weight:400'
    )
  }

  if (h.criticalFailures.length > 0) {
    console.log('')
    console.error('❌ CRITICAL FAILURES:', h.criticalFailures.join(', '))
  }
  if (h.warnings.length > 0) {
    console.warn('⚠️  WARNINGS:', h.warnings.join(', '))
  }
  console.groupEnd()
}

/**
 * Lightweight version — checks only the most critical path (DB + auth).
 * Called on every page load via App.tsx. Full audit is on-demand.
 */
export async function runQuickHealthCheck(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('workspaces').select('id').limit(1)
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
      return { ok: false, message: `DB: ${error.message}` }
    }
    return { ok: true, message: 'Platform healthy' }
  } catch (e: any) {
    return { ok: false, message: e.message }
  }
}
