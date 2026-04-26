/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PAGE AGENT — Full CRUD drill-downs enforced             ║
 * ║  Every page: list → detail → edit form → sub-records     ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'
import { detectCorruption, sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'

// ─── FULL DRILL-DOWN SYSTEM PROMPT ───────────────────────────────────────────
const PAGE_SYSTEM = `You are a senior React engineer building a production SaaS page.
Output ONLY: { "content": "...complete TypeScript React component as a string..." }

━━━ MANDATORY STRUCTURE (every page must have ALL of these) ━━━

1. STAT CARDS — horizontal grid, never vertical stack:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155]">
    <p className="text-slate-400 text-xs mb-1">Total</p>
    <p className="text-2xl font-bold text-white">42</p>
  </div>
</div>

2. HEADER — flex justify-between with action button:
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-white">Title</h1>
  <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
    <Plus size={16} />New Item
  </button>
</div>

3. SEARCH with icon:
<div className="relative mb-4">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
  <input className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
</div>

4. TABLE inside rounded card:
<div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
  <table className="w-full">
    <thead><tr className="border-b border-[#334155] bg-[#0f172a]">
      <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Col</th>
    </tr></thead>
    <tbody>
      {filtered.map(row => (
        <tr key={row.id} onClick={() => { setSelected(row); setShowForm(false); }} className="border-b border-[#334155] hover:bg-[#263148] cursor-pointer transition-colors last:border-0">
          <td className="px-4 py-3 text-sm text-white">{row.name}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

5. DETAIL PANEL — shown when selected, hidden when showForm:
{selected && !showForm && (
  <div className="mt-4 bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
      <h2 className="text-lg font-bold text-white">{selected.name}</h2>
      <div className="flex gap-2">
        <button onClick={() => { setForm({...selected}); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-600/30 transition-colors">
          <Edit2 size={12} />Edit
        </button>
        <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
    <div className="p-6 grid grid-cols-2 gap-4">
      {Object.entries(selected).filter(([k]) => k !== 'id').map(([k, v]) => (
        <div key={k} className="bg-[#0f172a] rounded-lg p-3">
          <p className="text-slate-400 text-xs capitalize mb-1">{k.replace(/([A-Z])/g,' $1')}</p>
          <p className="text-white text-sm font-medium">{String(v)}</p>
        </div>
      ))}
    </div>
    <div className="px-6 pb-6">
      <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Related Activity</h3>
      <div className="space-y-2">
        {SUB_RECORDS.filter(r => r.parentId === selected.id).map(r => (
          <div key={r.id} className="flex items-center justify-between bg-[#0f172a] rounded-lg px-4 py-2.5">
            <div>
              <p className="text-white text-sm">{r.title}</p>
              <p className="text-slate-500 text-xs">{r.date}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{r.status}</span>
          </div>
        ))}
        {SUB_RECORDS.filter(r => r.parentId === selected.id).length === 0 && (
          <p className="text-slate-500 text-sm">No related records yet.</p>
        )}
      </div>
    </div>
  </div>
)}

6. ADD/EDIT MODAL — inline overlay form:
{showForm && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-[#1e293b] rounded-2xl border border-[#334155] w-full max-w-lg shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
        <h2 className="text-lg font-bold text-white">{form.id ? 'Edit' : 'New'} Item</h2>
        <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="p-1.5 text-slate-400 hover:text-white"><X size={18} /></button>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1.5">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" placeholder="Enter name..." />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
            <option>Active</option><option>Pending</option><option>Complete</option><option>Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
        </div>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[#334155] text-slate-300 rounded-lg text-sm font-medium hover:bg-[#263148] transition-colors">Cancel</button>
        <button onClick={() => {
          if (form.id) { setItems(it => it.map(i => i.id === form.id ? {...i, ...form} : i)); setSelected({...form}); }
          else { const n = {...form, id: Date.now()}; setItems(it => [...it, n]); }
          setShowForm(false); setForm(EMPTY_FORM);
        }} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
          {form.id ? 'Save Changes' : 'Create'}
        </button>
      </div>
    </div>
  </div>
)}

━━━ REQUIRED STATE ━━━
const [items, setItems] = useState(DATA)
const [search, setSearch] = useState('')
const [selected, setSelected] = useState<any>(null)
const [showForm, setShowForm] = useState(false)
const [form, setForm] = useState<any>(EMPTY_FORM)
const filtered = items.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))

━━━ REQUIRED DATA ━━━
Declare SUB_RECORDS array with {id, parentId (matching item ids), title, date, status} - 6-8 entries spread across items.
Declare EMPTY_FORM object matching DATA fields but with empty values.

━━━ ICON RULES ━━━
Always use size prop: <Plus size={16} /> <X size={18} /> <Edit2 size={12} /> <Search size={16} />
ALLOWED: BarChart2, Calendar, Check, CheckCircle, ChevronRight, Clock, DollarSign, Edit2, Eye, FileText, Plus, RefreshCw, Search, Settings, Star, Trash2, TrendingUp, User, Users, X, XCircle

━━━ CODE RULES ━━━
- Default export, component name letters/numbers only
- Import ONLY: 'react', 'react-router-dom', 'lucide-react'
- All data as const arrays BEFORE component
- Page wrapper: <div className="p-6 max-w-5xl mx-auto">
- Status badges: inline-flex span, never block div
- Under 250 lines
- Return ONLY the JSON. No markdown.`

// ─── SIMPLE FALLBACK ─────────────────────────────────────────────────────────
const PAGE_SYSTEM_SIMPLE = `You are a React engineer. Generate a simple but complete React page.
Output ONLY: { "content": "...TypeScript component..." }
Requirements:
- Default export, letters/numbers name only
- Import only: react, lucide-react (Plus, Search, X, Edit2)
- const DATA array before component with 4-5 realistic items
- const EMPTY_FORM = { name: '', status: 'Active', date: '' }
- useState for: items, search, selected, showForm, form
- Grid stat cards: <div className="grid grid-cols-3 gap-4 mb-6">
- Table inside bg-[#1e293b] rounded-xl border border-[#334155]
- Inline modal for add/edit with fixed inset-0 bg-black/60 z-50
- Detail panel shown below table when selected
- Under 150 lines. No markdown.`

function validatePageContent(content: string): { valid: boolean; reason: string } {
  if (!content || typeof content !== 'string') return { valid: false, reason: 'empty content' }
  if (content.length < 200) return { valid: false, reason: 'content too short' }
  if (!content.includes('export default')) return { valid: false, reason: 'missing default export' }
  if (!content.includes('return') || !content.includes('<')) return { valid: false, reason: 'no JSX return' }
  if (!content.includes('useState')) return { valid: false, reason: 'no state management' }
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
    description: spec.description || spec.type || '',
    features: spec.features,
    industry: spec.industry,
    dataModels: spec.dataModels,
  }).slice(0, 1000)

  const prompt = `Project: ${projectName}
Industry/Type: ${spec.description || spec.type || 'Business application'}
Spec context: ${specStr}
Page: ${page.name} (route: ${page.route})
Other pages: ${allPageNames.filter(n => n !== page.name).join(', ')}

Generate a COMPLETE "${page.name}" page for ${projectName}.
MUST INCLUDE:
1. Stat cards in GRID (not vertical) showing relevant counts/totals
2. Search bar with Search icon (relative/absolute pattern)
3. Clickable data table (clicking row shows detail panel)
4. Detail panel below table with ALL record fields + sub-records list
5. "+ New ${page.name.replace(/s$/, '')}" button that opens an add form modal
6. Edit button inside detail panel that populates the form with existing data
7. Save in form updates the items array (useState mutation)
Use industry-specific realistic mock data appropriate for ${projectName}.
SUB_RECORDS should represent activity related to the main records (e.g., notes, appointments, orders).`

  const raw = await callClaude(system, prompt, [], useSimplePrompt ? 3000 : 8192)
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return parsed.content as string
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function runPageAgent(
  pages: SkeletonPage[],
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: (msg: string) => void,
  maxRetriesPerPage = 2
): Promise<{ path: string; content: string }[]> {
  onStatus(`Page Agent: Generating ${pages.length} pages with full drill-downs...`)
  const allPageNames = pages.map(p => p.name)

  const results = await Promise.allSettled(
    pages.map(async (page) => {
      let lastError = ''
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
          lastError = e.message?.slice(0, 60) || 'unknown'
        }
      }
      // Simple prompt fallback
      try {
        const content = await generateOnePage(page, spec, projectName, allPageNames, true)
        const { valid } = validatePageContent(content)
        if (valid) {
          const sanitized = sanitizeFileContent(page.path, content)
          onStatus(`${page.name}: simplified prompt succeeded`)
          return { path: page.path, content: sanitized }
        }
      } catch (_) { /* fall through */ }

      onStatus(`${page.name}: using safe stub (${lastError})`)
      return { path: page.path, content: generateSafeStub(page.name, page.route) }
    })
  )

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    onStatus(`${pages[i].name}: fallback stub`)
    return { path: pages[i].path, content: generateSafeStub(pages[i].name, pages[i].route) }
  })
}
