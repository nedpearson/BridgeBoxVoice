/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PAGE AGENT — Generates, validates, and heals each page  ║
 * ║  Runs in parallel; retries with simpler prompts on fail  ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'
import { detectCorruption, sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'

const PAGE_SYSTEM = `You are a React engineer. Generate a SINGLE fully-featured React page component.

Output ONLY this JSON: { "content": "...complete TypeScript React component..." }

MANDATORY RULES:
1. Complete file — NO truncation, NO "..." placeholders whatsoever.
2. Default export. Component name: letters/numbers only.
3. ONLY import from: 'react', 'react-router-dom', 'lucide-react'. NO local file imports.
4. Mock data as const arrays BEFORE the component function. Strings and numbers only.
5. ONLY these icons: BarChart2, Bell, Box, Calendar, Check, CheckCircle, ChevronDown, ChevronRight, Clock, Cog, CreditCard, DollarSign, Edit2, Eye, FileText, Plus, PlusCircle, RefreshCw, Search, Settings, Star, Trash2, TrendingUp, User, Users, Wallet, X, XCircle.
6. All JSX attributes complete. No ternary inside attributes.
7. All opening JSX tags properly closed.
8. UNDER 180 LINES TOTAL.
9. Include: 1 stat bar, 1 searchable data table with clickable rows, 1 detail panel toggled by useState.
Return ONLY the JSON. No markdown.`

const PAGE_SYSTEM_SIMPLE = `You are a React engineer. Generate a simple React page component.
Output ONLY: { "content": "...TypeScript component..." }
Rules: Default export, under 100 lines, only import react and lucide-react (BarChart2, Plus, Search, RefreshCw only), const data array before component, clickable table rows using useState. No markdown.`

function validatePageContent(content: string): { valid: boolean; reason: string } {
  if (!content || typeof content !== 'string') return { valid: false, reason: 'empty content' }
  if (content.length < 100) return { valid: false, reason: 'content too short' }
  if (!content.includes('export default')) return { valid: false, reason: 'missing default export' }
  if (!content.includes('return') || !content.includes('<')) return { valid: false, reason: 'no JSX return' }
  const { broken, reason } = detectCorruption(content)
  if (broken) return { valid: false, reason }
  return { valid: true, reason: '' }
}

async function generateOnePage(
  page: SkeletonPage,
  spec: Record<string, unknown>,
  projectName: string,
  allPageNames: string[],
  useSimplePrompt = false
): Promise<string> {
  const system = useSimplePrompt ? PAGE_SYSTEM_SIMPLE : PAGE_SYSTEM
  const prompt = `Project: ${projectName}
Industry/Type: ${spec.description || spec.type || 'Business application'}
Page: ${page.name} (route: ${page.route})
File: ${page.path}
Other pages: ${allPageNames.filter(n => n !== page.name).join(', ')}

Generate a COMPLETE, FULLY FEATURED page for "${page.name}" with realistic mock data and full interactivity.`

  const raw = await callClaude(system, prompt, [], useSimplePrompt ? 3000 : 8192)
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return parsed.content as string
}

// ── Main: Generate all pages with per-page retry and healing ──────────────────
export async function runPageAgent(
  pages: SkeletonPage[],
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: (msg: string) => void,
  maxRetriesPerPage = 2
): Promise<{ path: string; content: string }[]> {
  onStatus(`📄 Page Agent: Generating ${pages.length} pages in parallel...`)
  const allPageNames = pages.map(p => p.name)

  const results = await Promise.allSettled(
    pages.map(async (page) => {
      let lastError = ''
      // Attempt 1-2: Full prompt
      for (let attempt = 1; attempt <= maxRetriesPerPage; attempt++) {
        try {
          const content = await generateOnePage(page, spec, projectName, allPageNames, false)
        const { valid, reason } = validatePageContent(content)
          if (valid) {
            const sanitized = sanitizeFileContent(page.path, content)
            return { path: page.path, content: sanitized }
          }
          lastError = reason
          onStatus(`⚠️ ${page.name}: ${reason} (retry ${attempt})`)
        } catch (e: any) {
          lastError = e.message?.slice(0, 60) || 'unknown error'
        }
      }
      // Attempt 3: Simple prompt
      try {
        onStatus(`🔄 ${page.name}: Trying simplified prompt...`)
        const content = await generateOnePage(page, spec, projectName, allPageNames, true)
        const { valid, reason } = validatePageContent(content)
        if (valid) {
          const sanitized = sanitizeFileContent(page.path, content)
          onStatus(`✅ ${page.name}: Simplified prompt succeeded`)
          return { path: page.path, content: sanitized }
        }
        lastError = reason
      } catch (e: any) {
        lastError = e.message?.slice(0, 60) || 'unknown error'
      }

      // Final fallback: guaranteed safe stub
      onStatus(`🛡️ ${page.name}: Using safe stub (${lastError})`)
      const stub = generateSafeStub(page.name, page.route)
      return { path: page.path, content: stub }
    })
  )

  const files: { path: string; content: string }[] = []
  let succeeded = 0
  let stubbed = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      files.push(result.value)
      // Check if it was stubbed (stubs contain "Record A")
      if (result.value.content.includes('Record A')) stubbed++
      else succeeded++
    }
  }

  onStatus(`✅ Page Agent: ${succeeded} full pages, ${stubbed} safe stubs`)
  return files
}
