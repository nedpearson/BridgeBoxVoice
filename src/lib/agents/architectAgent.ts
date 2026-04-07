/**
 * Architect Agent
 * Converts raw AIAnalysis → structured TechnicalSpec (DB schema, API surface, component tree)
 */

import { AIAnalysis } from '../anthropic'

export interface DatabaseTable {
  name: string
  columns: Array<{
    name: string
    type: 'uuid' | 'text' | 'varchar' | 'int' | 'bigint' | 'boolean' | 'timestamptz' | 'jsonb' | 'numeric' | 'date'
    nullable: boolean
    default?: string
    references?: string // e.g. "users(id)"
  }>
  rls: boolean
  indexes?: string[]
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: boolean
  body?: Record<string, string>
  response?: Record<string, string>
}

export interface ComponentSpec {
  name: string
  type: 'page' | 'layout' | 'widget' | 'form' | 'modal' | 'list'
  props?: Record<string, string>
  children?: string[]
  route?: string
}

export interface TechnicalSpec {
  appName: string
  description: string
  industry: string
  techStack: {
    frontend: string
    backend: string
    database: string
    auth: string
    storage: string
    hosting: string
  }
  database: DatabaseTable[]
  apiEndpoints: ApiEndpoint[]
  components: ComponentSpec[]
  userRoles: Array<{ name: string; permissions: string[] }>
  integrations: string[]
  deploymentTargets: string[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'enterprise'
}

const ARCHITECT_SYSTEM = `You are a senior software architect specializing in SaaS application design.

Given a business requirements analysis, produce a complete technical specification as JSON.

The spec must include:
- techStack: always use React 18 + TypeScript + Tailwind (frontend), Supabase (backend/auth/storage), hosted on Vercel (web) + Capacitor (mobile)
- database: normalized tables with UUID PKs, RLS enabled, proper foreign keys, timestamptz for all dates
- apiEndpoints: RESTful using Supabase PostgREST (/rest/v1/...) plus any Edge Functions needed
- components: ALL screens the app needs, with proper page hierarchy
- userRoles: extracted from requirements with specific CRUD permissions per entity
- estimatedComplexity: simple (<5 tables), moderate (5-10), complex (10-20), enterprise (20+)

Respond with ONLY the JSON object matching the TechnicalSpec TypeScript interface. No markdown, no explanation.`

async function callClaude(system: string, user: string): Promise<string> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function runArchitectAgent(analysis: AIAnalysis): Promise<TechnicalSpec> {
  const prompt = `Business Requirements Analysis:
${JSON.stringify(analysis, null, 2)}

Generate the complete TechnicalSpec JSON for this application.`

  const raw = await callClaude(ARCHITECT_SYSTEM, prompt)

  try {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    return JSON.parse(cleaned) as TechnicalSpec
  } catch {
    // Return a minimal fallback spec
    return {
      appName: analysis.businessType ?? 'Custom App',
      description: analysis.summary,
      industry: analysis.industry,
      techStack: {
        frontend: 'React 18 + TypeScript + Tailwind CSS',
        backend: 'Supabase (PostgREST + Edge Functions)',
        database: 'PostgreSQL 15 (Supabase)',
        auth: 'Supabase Auth (email + magic link)',
        storage: 'Supabase Storage',
        hosting: 'Vercel (web) + Capacitor (mobile)',
      },
      database: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
            { name: 'email', type: 'text', nullable: false },
            { name: 'full_name', type: 'text', nullable: true },
            { name: 'role', type: 'text', nullable: false, default: "'user'" },
            { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
          ],
          rls: true,
        },
      ],
      apiEndpoints: [
        { method: 'GET', path: '/rest/v1/users', description: 'List users', auth: true },
      ],
      components: [
        { name: 'Dashboard', type: 'page', route: '/' },
        { name: 'Settings', type: 'page', route: '/settings' },
      ],
      userRoles: (analysis.userRoles ?? []).map((r: string) => ({ name: r, permissions: [] })),
      integrations: analysis.integrations ?? [],
      deploymentTargets: analysis.deploymentTargets ?? ['web'],
      estimatedComplexity: 'moderate',
    }
  }
}

// SQL DDL generator from TechnicalSpec
export function generateDDL(spec: TechnicalSpec): string {
  const lines: string[] = ['-- Auto-generated by Bridgebox Voice Architect Agent', '-- Run in Supabase SQL Editor\n']

  for (const table of spec.database) {
    lines.push(`CREATE TABLE IF NOT EXISTS ${table.name} (`)
    const colDefs = table.columns.map((col) => {
      let def = `  ${col.name} ${col.type.toUpperCase()}`
      if (!col.nullable) def += ' NOT NULL'
      if (col.default) def += ` DEFAULT ${col.default}`
      if (col.references) def += ` REFERENCES ${col.references} ON DELETE CASCADE`
      return def
    })
    colDefs.push('  PRIMARY KEY (id)')
    lines.push(colDefs.join(',\n'))
    lines.push(');')

    if (table.rls) {
      lines.push(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`)
      lines.push(`CREATE POLICY "Users access own data" ON ${table.name}`)
      lines.push(`  FOR ALL USING (auth.uid()::text = user_id::text);\n`)
    } else {
      lines.push('')
    }
  }

  return lines.join('\n')
}
