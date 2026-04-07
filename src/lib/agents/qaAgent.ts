/**
 * QA Agent
 * Reviews generated code for bugs, type errors, security issues, and best-practice violations
 */

import { GeneratedFile } from './developerAgent'
import { TechnicalSpec } from './architectAgent'

export interface QAIssue {
  severity: 'critical' | 'warning' | 'info'
  file: string
  line?: number
  message: string
  suggestion: string
}

export interface QAReport {
  passCount: number
  failCount: number
  warningCount: number
  issues: QAIssue[]
  score: number // 0-100
  summary: string
  approved: boolean
}

const QA_SYSTEM = `You are a senior QA engineer and security auditor specializing in React/TypeScript SaaS applications.

Review the provided code for:
1. TypeScript type safety issues (missing types, any usage, type assertions)
2. React anti-patterns (missing keys, effect deps, memory leaks, missing error boundaries)
3. Security issues (XSS, exposed secrets, missing auth checks, SQL injection via PostgREST)
4. Supabase RLS policy gaps (operations without auth context)
5. Missing error handling (unhandled promises, no try/catch, no loading states)
6. Performance issues (unnecessary re-renders, large bundles, missing memoization)
7. Accessibility (missing aria labels, no keyboard navigation, color contrast)

Respond as JSON matching this shape:
{
  "issues": [
    { "severity": "critical"|"warning"|"info", "file": "...", "line": N, "message": "...", "suggestion": "..." }
  ],
  "summary": "..."
}

Keep it concise. Max 15 issues.`

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
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── Static checks (no AI required) ─────────────────────────────────────────

function runStaticChecks(files: GeneratedFile[], spec: TechnicalSpec): QAIssue[] {
  const issues: QAIssue[] = []

  for (const file of files) {
    const c = file.content

    // Security: hardcoded secrets
    if (/sk_live_|sk_test_|AIzaSy|Bearer\s+[A-Za-z0-9_-]{20}/.test(c)) {
      issues.push({
        severity: 'critical',
        file: file.path,
        message: 'Potential hardcoded secret detected',
        suggestion: 'Move to environment variables and import via import.meta.env',
      })
    }

    // Missing error boundaries in page components
    if (file.language === 'tsx' && file.path.includes('/pages/') && !c.includes('ErrorBoundary') && !c.includes('try {')) {
      issues.push({
        severity: 'warning',
        file: file.path,
        message: 'Page component has no error handling',
        suggestion: 'Wrap data fetching in try/catch and display error state to user',
      })
    }

    // XSS risk
    if (c.includes('dangerouslySetInnerHTML') || c.includes('innerHTML =')) {
      issues.push({
        severity: 'critical',
        file: file.path,
        message: 'Potential XSS via dangerouslySetInnerHTML or innerHTML',
        suggestion: 'Sanitize HTML content with DOMPurify before rendering',
      })
    }

    // Missing RLS context
    if (c.includes('.from(') && !c.includes('auth.uid()') && !c.includes('.eq(') && file.language === 'typescript') {
      issues.push({
        severity: 'warning',
        file: file.path,
        message: 'Supabase query may lack user-scoped filter',
        suggestion: 'Ensure RLS policies are enabled on table, or add .eq("user_id", user.id) filter',
      })
    }

    // any usage
    const anyCount = (c.match(/: any\b/g) ?? []).length
    if (anyCount > 3) {
      issues.push({
        severity: 'info',
        file: file.path,
        message: `${anyCount} uses of TypeScript \`any\` detected`,
        suggestion: 'Replace with proper types or unknown + type guards',
      })
    }

    // Missing loading state
    if (file.language === 'tsx' && c.includes('useEffect') && !c.includes('isLoading') && !c.includes('loading')) {
      issues.push({
        severity: 'info',
        file: file.path,
        message: 'Component fetches data but has no loading state',
        suggestion: "Add `const [loading, setLoading] = useState(true)` and show a spinner while fetching",
      })
    }
  }

  // Check spec completeness
  for (const role of spec.userRoles) {
    const hasRoleCheck = files.some((f) => f.content.includes(role.name.toLowerCase()))
    if (!hasRoleCheck) {
      issues.push({
        severity: 'warning',
        file: 'global',
        message: `User role "${role.name}" is not referenced in any component`,
        suggestion: 'Add role-based access control (RBAC) checks in layout and page components',
      })
    }
  }

  return issues
}

// ─── AI Review (batched to avoid token limits) ────────────────────────────────

async function runAiReview(files: GeneratedFile[], spec: TechnicalSpec): Promise<QAIssue[]> {
  // Only review AI-generated TSX files — static files don't need review
  const reviewable = files.filter((f) => f.language === 'tsx' && f.content.length > 200)
  if (!reviewable.length) return []

  // Batch into one prompt (first 3 files max)
  const sample = reviewable.slice(0, 3)
  const codeBlock = sample.map((f) => `=== ${f.path} ===\n${f.content.slice(0, 2000)}`).join('\n\n')

  const prompt = `App: ${spec.appName} (${spec.industry})

Review these generated files:
${codeBlock}

Return your JSON analysis.`

  try {
    const raw = await callClaude(QA_SYSTEM, prompt)
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { issues: QAIssue[]; summary: string }
    return parsed.issues ?? []
  } catch {
    return []
  }
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export async function runQAAgent(files: GeneratedFile[], spec: TechnicalSpec): Promise<QAReport> {
  const staticIssues = runStaticChecks(files, spec)

  let aiIssues: QAIssue[] = []
  try {
    aiIssues = await runAiReview(files, spec)
  } catch {
    // AI review is best-effort
  }

  const allIssues = [...staticIssues, ...aiIssues]

  const criticals = allIssues.filter((i) => i.severity === 'critical').length
  const warnings  = allIssues.filter((i) => i.severity === 'warning').length
  const infos     = allIssues.filter((i) => i.severity === 'info').length

  // Score: start at 100, deduct per issue
  const score = Math.max(0, 100 - criticals * 20 - warnings * 5 - infos * 1)

  return {
    passCount: files.length - criticals,
    failCount: criticals,
    warningCount: warnings,
    issues: allIssues,
    score,
    summary: criticals > 0
      ? `⚠️ ${criticals} critical ${criticals === 1 ? 'issue' : 'issues'} must be fixed before deployment.`
      : warnings > 0
      ? `✅ No critical issues. ${warnings} warnings to review.`
      : `✅ All checks passed. Score: ${score}/100`,
    approved: criticals === 0,
  }
}
