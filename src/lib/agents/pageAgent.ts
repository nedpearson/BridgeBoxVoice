/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PAGE AGENT — Generates, validates, and heals each page  ║
 * ║  Enforces proper grid layouts, icon sizes, table styles  ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'
import { detectCorruption, sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'

// ─── STRICT LAYOUT-ENFORCING SYSTEM PROMPT ───────────────────────────────────
const PAGE_SYSTEM = `You are a senior React/Tailwind engineer. Generate a SINGLE complete React page component.

Output ONLY this JSON: { "content": "...complete TypeScript component as a string..." }

━━━ CRITICAL LAYOUT RULES (violations cause broken UI) ━━━

STAT CARDS must use this exact grid pattern:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155]">
    <p className="text-slate-400 text-xs mb-1">Label</p>
    <p className="text-2xl font-bold text-white">42</p>
  </div>
</div>

HEADER ROW must use flex justify-between:
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-white">Page Title</h1>
  <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium">
    <Plus size={16} />New Item
  </button>
</div>

SEARCH BAR must use flex with icon inline:
<div className="relative mb-4">
  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
  <input className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
</div>

TABLE must use this exact structure (never use border-collapse):
<div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="border-b border-[#334155]">
        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">Column</th>
      </tr>
    </thead>
    <tbody>
      {filtered.map(row => (
        <tr key={row.id} className="border-b border-[#334155] hover:bg-[#263148] cursor-pointer transition-colors" onClick={() => setSelected(row)}>
          <td className="px-4 py-3 text-sm text-white">{row.field}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

STATUS BADGES must be inline spans (never block):
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">Active</span>

ICONS: Always include size prop: <Plus size={16} /> <Search size={16} /> <Edit2 size={14} />
AVAILABLE ICONS ONLY: BarChart2, Bell, Box, Calendar, Check, CheckCircle, ChevronRight, Clock, DollarSign, Edit2, Eye, FileText, Plus, RefreshCw, Search, Settings, Star, Trash2, TrendingUp, User, Users, X, XCircle

━━━ CODE RULES ━━━
- Default export. Component name: letters/numbers only (no hyphens/spaces).
- Import ONLY from: 'react', 'react-router-dom', 'lucide-react'. NO local imports.
- Mock data: const arrays BEFORE the component. Use realistic names/numbers.
- State: useState for search filter + selected item for detail panel.
- Filter logic: const filtered = data.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
- Detail panel: {selected && <div className="mt-4 bg-[#1e293b] rounded-xl p-4 border border-[#334155]">...</div>}
- Page wrapper: <div className="p-6 max-w-6xl mx-auto">
- UNDER 200 LINES. Return ONLY the JSON. No markdown.`

// ─── SIMPLE FALLBACK PROMPT ───────────────────────────────────────────────────
const PAGE_SYSTEM_SIMPLE = `You are a React engineer. Generate a simple React page component.
Output ONLY: { "content": "...TypeScript component..." }
Rules:
- Default export, letters/numbers component name only
- Import only: react, lucide-react (Plus, Search, RefreshCw only)
- Wrapper: <div className="p-6 max-w-6xl mx-auto">
- Stats grid: <div className="grid grid-cols-3 gap-4 mb-6">...stat cards with bg-[#1e293b] rounded-xl p-4...</div>
- Table: bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden, use <table className="w-full">
- Under 120 lines. No markdown.`

function validatePageContent(content: string): { valid: boolean; reason: string } {
  if (!content || typeof content !== 'string') return { valid: false, reason: 'empty content' }
  if (content.length < 150) return { valid: false, reason: 'content too short' }
  if (!content.includes('export default')) return { valid: false, reason: 'missing default export' }
  if (!content.includes('return') || !content.includes('<')) return { valid: false, reason: 'no JSX return' }
  // Must have a grid or flex layout for stats
  if (!content.includes('grid') && !content.includes('flex')) return { valid: false, reason: 'no layout classes' }
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
  const specStr = JSON.stringify({
    description: spec.description || spec.type || 'Business application',
    features: spec.features,
    industry: spec.industry,
  }).slice(0, 800)

  const prompt = `Project: ${projectName}
Spec: ${specStr}
Page: ${page.name} (route: ${page.route})
File: ${page.path}
Other pages in app: ${allPageNames.filter(n => n !== page.name).join(', ')}

Generate a COMPLETE, FULLY FEATURED page for "${page.name}".
The page MUST have:
1. A flex justify-between header with the page title and a "+ New" or action button
2. Stat cards in a GRID (not stacked vertically) - use grid grid-cols-2 md:grid-cols-4 gap-4
3. A search input using the relative/absolute pattern with Search icon
4. A full styled table inside bg-[#1e293b] rounded-xl with proper column headers
5. Click-to-expand detail panel using useState
Use realistic mock data for "${projectName}" in the ${spec.description || 'business'} industry.`

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
  onStatus(`Page Agent: Generating ${pages.length} pages in parallel...`)
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
          onStatus(`${page.name}: ${reason} (retry ${attempt})`)
        } catch (e: any) {
          lastError = e.message?.slice(0, 60) || 'unknown error'
        }
      }
      // Attempt 3: Simple prompt
      try {
        onStatus(`${page.name}: Trying simplified prompt...`)
        const content = await generateOnePage(page, spec, projectName, allPageNames, true)
        const { valid } = validatePageContent(content)
        if (valid) {
          const sanitized = sanitizeFileContent(page.path, content)
          onStatus(`${page.name}: Simplified prompt succeeded`)
          return { path: page.path, content: sanitized }
        }
      } catch (_) { /* fall through to stub */ }

      // Final fallback: guaranteed safe stub
      onStatus(`${page.name}: Using safe stub (${lastError})`)
      return { path: page.path, content: generateSafeStub(page.name, page.route) }
    })
  )

  // Collect results — any settled rejection becomes a stub
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    onStatus(`${pages[i].name}: Fell back to stub`)
    return { path: pages[i].path, content: generateSafeStub(pages[i].name, pages[i].route) }
  })
}
