/**
 * AI Governance Service
 * Prompt injection detection, code sanitization, model versioning, usage caps
 */

import { supabase } from '../supabase'

// ─── Prompt Injection Detection ──────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|prior)\s+instructions?/i,
  /forget\s+(everything|all|prior)\s+/i,
  /you\s+are\s+now\s+a?\s*(different|new|another)/i,
  /act\s+as\s+(if\s+)?(?:you\s+are\s+)?(?:a\s+)?(?:jailbreak|evil|uncensored|dan)/i,
  /\bsystem\s+prompt\b/i,
  /\bconfidential\s+instructions?\b/i,
  /override\s+(your\s+)?(safety|restrictions?|guidelines?)/i,
  /pretend\s+(you\s+)?(can|have\s+no\s+restrictions?)/i,
  /disregard\s+(your|all)\s+(rules?|instructions?)/i,
]

export interface SafetyReport {
  safe: boolean
  flags: string[]
  sanitizedInput: string
}

export function analyzePromptSafety(input: string): SafetyReport {
  const flags: string[] = []
  let sanitized = input

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      flags.push(`Pattern match: ${pattern.source.substring(0, 40)}`)
    }
  }

  // PII detection
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(input)) flags.push('SSN pattern detected')
  if (/\b4[0-9]{12}(?:[0-9]{3})?\b/.test(input)) flags.push('Credit card pattern detected')
  if (/\bhttps?:\/\/\S+onion\b/i.test(input)) flags.push('Tor URL detected')

  return { safe: flags.length === 0, flags, sanitizedInput: sanitized }
}

// ─── Generated Code Sanitization ─────────────────────────────────────────────

const CODE_RISK_PATTERNS = [
  { pattern: /process\.env\.\w+\s*=/, desc: 'Writing to env vars' },
  { pattern: /fs\.writeFileSync/, desc: 'Unsafe file write' },
  { pattern: /eval\s*\(/, desc: 'eval() usage' },
  { pattern: /new\s+Function\s*\(/, desc: 'Dynamic function creation' },
  { pattern: /child_process|exec|spawn/, desc: 'Shell command execution' },
  { pattern: /password\s*[:=]\s*['"`][^'"` ]{3,}/, desc: 'Hardcoded password' },
  { pattern: /secret\s*[:=]\s*['"`][^'"` ]{8,}/, desc: 'Hardcoded secret' },
  { pattern: /api[_-]?key\s*[:=]\s*['"`][A-Za-z0-9_\-]{20,}/, desc: 'Hardcoded API key' },
  { pattern: /SELECT\s+\*\s+FROM.*WHERE.*\+\s*\w+/, desc: 'Potential SQL injection' },
  { pattern: /innerHTML\s*=/, desc: 'Potential XSS via innerHTML' },
]

export interface CodeSafetyReport {
  safe: boolean
  risks: Array<{ line: number; description: string; snippet: string }>
  sanitizedCode: string
}

export function analyzeCodeSafety(code: string): CodeSafetyReport {
  const lines = code.split('\n')
  const risks: CodeSafetyReport['risks'] = []

  lines.forEach((line, idx) => {
    for (const { pattern, desc } of CODE_RISK_PATTERNS) {
      if (pattern.test(line)) {
        risks.push({
          line: idx + 1,
          description: desc,
          snippet: line.trim().substring(0, 80),
        })
      }
    }
  })

  // Redact hardcoded secrets
  let sanitized = code
    .replace(/(password|secret|api[_-]?key)\s*[:=]\s*['"`][^'"` ]+['"`]/gi, '$1 = "[REDACTED]"')
    .replace(/\b[A-Za-z0-9_\-]{32,}\b(?=.*# ?secret)/g, '[REDACTED]')

  return { safe: risks.length === 0, risks, sanitizedCode: sanitized }
}

// ─── Usage Cap Enforcement ───────────────────────────────────────────────────

export async function checkUsageCap(
  workspaceId: string,
  tokensNeeded: number
): Promise<{ allowed: boolean; reason?: string }> {
  const { data } = await supabase
    .from('ai_usage_caps')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (!data) return { allowed: true }

  if (data.tokens_used_this_month + tokensNeeded > data.monthly_token_limit) {
    return { allowed: false, reason: `Monthly token limit (${data.monthly_token_limit.toLocaleString()}) reached` }
  }

  if (data.generations_today >= data.daily_generation_limit) {
    return { allowed: false, reason: `Daily generation limit (${data.daily_generation_limit}) reached` }
  }

  return { allowed: true }
}

export async function recordUsage(
  workspaceId: string,
  tokens: number
): Promise<void> {
  await supabase.rpc('increment_ai_usage', {
    p_workspace_id: workspaceId,
    p_tokens: tokens,
  }).throwOnError()
}

// ─── Compliance Checker ──────────────────────────────────────────────────────

export interface ComplianceIssue {
  standard: string
  requirement: string
  severity: 'info' | 'warning' | 'critical'
  suggestion: string
}

export function checkCodeCompliance(
  code: string,
  standards: ('pci' | 'hipaa' | 'gdpr')[]
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = []

  if (standards.includes('pci')) {
    if (/card[_-]?number|credit[_-]?card|cvv|pan\b/i.test(code)) {
      issues.push({
        standard: 'PCI-DSS',
        requirement: 'Req 3.4: Never store card numbers',
        severity: 'critical',
        suggestion: 'Use Stripe.js or Payment Element — never handle raw card data',
      })
    }
  }

  if (standards.includes('hipaa')) {
    if (/patient|diagnosis|medical[_-]?record|ssn|dob\b/i.test(code)) {
      issues.push({
        standard: 'HIPAA',
        requirement: '§164.312: PHI must be encrypted at rest and in transit',
        severity: 'warning',
        suggestion: 'Ensure PHI fields are encrypted and access is logged',
      })
    }
  }

  if (standards.includes('gdpr')) {
    if (/email|phone|address|location/i.test(code) && !/consent|gdpr/i.test(code)) {
      issues.push({
        standard: 'GDPR',
        requirement: 'Art. 6: Processing requires a lawful basis',
        severity: 'info',
        suggestion: 'Add consent tracking and data subject rights (export/delete) endpoints',
      })
    }
  }

  return issues
}
