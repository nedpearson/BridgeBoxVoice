/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  PAGE AGENT v4 — Data-First Template Architecture                    ║
 * ║                                                                      ║
 * ║  AI generates only JSON data (reliable).                            ║
 * ║  A guaranteed-correct template assembles the React component.        ║
 * ║  Result: dark theme always correct, drill-downs always work.         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'
import { sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PageData {
  fields: string[]          // column headers e.g. ["name","status","date","amount"]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text' | 'date' | 'select' | 'textarea'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}

// ── AI: Data-Only Prompt ──────────────────────────────────────────────────────
const DATA_SYSTEM = `You are a data generator for a business SaaS application.
Output ONLY valid JSON matching this exact schema:
{
  "fields": ["name", "status", "date"],
  "records": [
    { "id": 1, "name": "...", "status": "...", "date": "YYYY-MM-DD", ...other fields... },
    ...6-8 records...
  ],
  "stats": [
    { "label": "Total", "value": 42 },
    { "label": "Active", "value": 18 },
    { "label": "Pending", "value": 7 },
    { "label": "This Month", "value": "$12,400" }
  ],
  "formFields": [
    { "key": "name", "label": "Full Name", "type": "text" },
    { "key": "status", "label": "Status", "type": "select", "options": ["Active","Pending","Complete"] },
    { "key": "date", "label": "Date", "type": "date" }
  ],
  "subRecords": [
    { "id": 1, "parentId": 1, "title": "Activity note", "date": "2024-01-15", "status": "Done" },
    { "id": 2, "parentId": 1, "title": "Follow-up", "date": "2024-01-20", "status": "Pending" },
    { "id": 3, "parentId": 2, "title": "Activity note", "date": "2024-01-22", "status": "Done" },
    ...6-10 sub-records...
  ]
}
Rules:
- fields: 3-6 column names (camelCase, no spaces), always include "id" and "name"
- records: 6-8 realistic records with all the fields listed
- stats: exactly 4 stats with relevant business metrics
- formFields: form fields to create/edit a record (3-5 fields)
- subRecords: 6-10 child records spread across 3-4 parent records (parentId matches record ids)
- Use realistic data appropriate for the business type
- Return ONLY JSON. No markdown. No explanation.`

// ── Template: Generate the full React component from data ─────────────────────
function buildPageFromData(pageName: string, _route: string, data: PageData): string {
  const safeName = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const statusField = fields.find(f => f.toLowerCase().includes('status')) || fields[1] || fields[0]
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    available: 'bg-emerald-500/20 text-emerald-400',
    complete: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    done: 'bg-emerald-500/20 text-emerald-400',
    scheduled: 'bg-blue-500/20 text-blue-400',
    upcoming: 'bg-blue-500/20 text-blue-400',
    arrived: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-amber-500/20 text-amber-400',
    alteration: 'bg-amber-500/20 text-amber-400',
    reserved: 'bg-amber-500/20 text-amber-400',
    cancelled: 'bg-red-500/20 text-red-400',
    canceled: 'bg-red-500/20 text-red-400',
    inactive: 'bg-slate-500/20 text-slate-400',
  }

  const getStatusClass = (field: string) =>
    `(() => { const map: Record<string,string> = ${JSON.stringify(statusColors)}; return map[String(row.${field}).toLowerCase()] || 'bg-purple-500/20 text-purple-400'; })()`

  const statsGrid = data.stats.slice(0, 4).map(s =>
    `          <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155]">
            <p className="text-slate-400 text-xs mb-1">${s.label}</p>
            <p className="text-2xl font-bold text-white">${s.value}</p>
          </div>`
  ).join('\n')

  const tableHeaders = fields.map(f =>
    `              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">${f.replace(/([A-Z])/g, ' $1').trim()}</th>`
  ).join('\n')

  const tableCells = fields.map(f => {
    if (f === statusField) {
      return `              <td className="px-4 py-3 text-sm">
                <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \${${getStatusClass(f)}}\`}>{String(row.${f})}</span>
              </td>`
    }
    if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('price') || f.toLowerCase().includes('value') || f.toLowerCase().includes('cost') || f.toLowerCase().includes('total')) {
      return `              <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{String(row.${f})}</td>`
    }
    if (f.toLowerCase().includes('date')) {
      return `              <td className="px-4 py-3 text-sm text-slate-400">{String(row.${f})}</td>`
    }
    return `              <td className="px-4 py-3 text-sm text-white">{String(row.${f})}</td>`
  }).join('\n')

  const detailFields = fields.map(f =>
    `            <div className="bg-[#0f172a] rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">${f.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-white text-sm font-medium">{String(selected.${f})}</p>
            </div>`
  ).join('\n')

  const formFieldsJSX = data.formFields.map(ff => {
    if (ff.type === 'select' && ff.options) {
      return `          <div>
            <label className="block text-xs text-slate-400 mb-1.5">${ff.label}</label>
            <select value={form.${ff.key} || ''} onChange={e => setForm((f: any) => ({...f, ${ff.key}: e.target.value}))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              ${ff.options.map(o => `<option value="${o}">${o}</option>`).join('')}
            </select>
          </div>`
    }
    if (ff.type === 'textarea') {
      return `          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1.5">${ff.label}</label>
            <textarea value={form.${ff.key} || ''} onChange={e => setForm((f: any) => ({...f, ${ff.key}: e.target.value}))} rows={3} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" placeholder="Enter ${ff.label.toLowerCase()}..." />
          </div>`
    }
    return `          <div>
            <label className="block text-xs text-slate-400 mb-1.5">${ff.label}</label>
            <input type="${ff.type}" value={form.${ff.key} || ''} onChange={e => setForm((f: any) => ({...f, ${ff.key}: e.target.value}))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" placeholder="Enter ${ff.label.toLowerCase()}..." />
          </div>`
  }).join('\n')

  const emptyForm = `{ ${data.formFields.map(f => `${f.key}: ''`).join(', ')} }`

  const dataJson = JSON.stringify(data.records, null, 2)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  const subJson = JSON.stringify(data.subRecords, null, 2)

  return `import React, { useState } from 'react';
import { BarChart2, Plus, Search, Edit2, X, RefreshCw, ChevronRight, TrendingUp } from 'lucide-react';

const DATA: Record<string, any>[] = ${dataJson};

const SUB_RECORDS: { id: number; parentId: number; title: string; date: string; status: string }[] = ${subJson};

const EMPTY_FORM = ${emptyForm};

export default function ${safeName}() {
  const [items, setItems] = useState<Record<string, any>[]>(DATA);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const filtered = items.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = () => {
    if (form.id) {
      setItems(it => it.map(i => i.id === form.id ? { ...i, ...form } : i));
      setSelected({ ...form });
    } else {
      const newItem = { ...form, id: Date.now() };
      setItems(it => [...it, newItem]);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: any) => {
    setItems(it => it.filter(i => i.id !== id));
    setSelected(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
            <BarChart2 size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">${pageName}</h1>
            <p className="text-slate-400 text-sm">{filtered.length} records</p>
          </div>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setSelected(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-purple-900/30"
        >
          <Plus size={16} />New ${pageName.replace(/s$/, '')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
${statsGrid}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ${pageName.toLowerCase()}..."
          className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#334155] bg-[#0f172a]">
              <th className="w-8 px-4 py-3"></th>
${tableHeaders}
              <th className="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={${fields.length + 2}} className="text-center py-12 text-slate-500">No records found</td></tr>
            ) : filtered.map(row => (
              <tr
                key={row.id}
                onClick={() => { setSelected(selected?.id === row.id ? null : row); setShowForm(false); }}
                className={\`border-b border-[#334155] hover:bg-[#263148] cursor-pointer transition-colors last:border-0 \${selected?.id === row.id ? 'bg-purple-900/20 border-l-2 border-l-purple-500' : ''}\`}
              >
                <td className="px-4 py-3">
                  <ChevronRight size={14} className={\`text-slate-500 transition-transform \${selected?.id === row.id ? 'rotate-90 text-purple-400' : ''}\`} />
                </td>
${tableCells}
                <td className="px-4 py-3">
                  <button
                    onClick={e => { e.stopPropagation(); setForm({...row}); setSelected(null); setShowForm(true); }}
                    className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors rounded-lg hover:bg-purple-500/10"
                  >
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selected && !showForm && (
        <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0f172a]">
            <div className="flex items-center gap-3">
              <TrendingUp size={18} className="text-purple-400" />
              <h2 className="text-lg font-bold text-white">{String(selected.name)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setForm({...selected}); setShowForm(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-600/30 transition-colors"
              >
                <Edit2 size={12} />Edit
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors"
              >
                <X size={12} />Delete
              </button>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Record Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
${detailFields}
            </div>

            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Related Activity</h3>
            <div className="space-y-2">
              {SUB_RECORDS.filter(r => r.parentId === selected.id).length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No related activity yet.</p>
              ) : SUB_RECORDS.filter(r => r.parentId === selected.id).map(r => (
                <div key={r.id} className="flex items-center justify-between bg-[#0f172a] rounded-xl px-4 py-3 hover:bg-[#263148] transition-colors cursor-pointer">
                  <div>
                    <p className="text-white text-sm font-medium">{r.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{r.date}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-medium">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
              <h2 className="text-lg font-bold text-white">{form.id ? 'Edit' : 'New'} ${pageName.replace(/s$/, '')}</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
${formFieldsJSX}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[#334155] text-slate-300 rounded-xl text-sm font-semibold hover:bg-[#263148] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-purple-900/30"
              >
                {form.id ? 'Save Changes' : 'Create ${pageName.replace(/s$/, '')}'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
}

// ── AI: Request data for a page ───────────────────────────────────────────────
async function fetchPageData(
  page: SkeletonPage,
  spec: Record<string, unknown>,
  projectName: string
): Promise<PageData> {
  const specStr = JSON.stringify(spec).slice(0, 800)
  const prompt = `Project: ${projectName}
Industry: ${spec.description || spec.type || 'Business application'}
Spec: ${specStr}
Page: ${page.name}
Generate realistic data for the "${page.name}" page of this ${projectName} application.
The data should reflect the actual business domain — use real-sounding names/values appropriate for the industry.`

  const raw = await callClaude(DATA_SYSTEM, prompt, [], 4096)
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as PageData
}

// ── Validate page data has required fields ────────────────────────────────────
function validatePageData(data: unknown): data is PageData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.fields) || d.fields.length < 2) return false
  if (!Array.isArray(d.records) || d.records.length < 1) return false
  if (!Array.isArray(d.stats) || d.stats.length < 1) return false
  if (!Array.isArray(d.formFields) || d.formFields.length < 1) return false
  if (!Array.isArray(d.subRecords)) return false
  return true
}

// ── Main: Generate all pages ──────────────────────────────────────────────────
export async function runPageAgent(
  pages: SkeletonPage[],
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: (msg: string) => void,
  maxRetriesPerPage = 2
): Promise<{ path: string; content: string }[]> {
  onStatus(`Page Agent: Generating ${pages.length} pages with full drill-downs...`)

  const results = await Promise.allSettled(
    pages.map(async (page) => {
      // Attempt to get AI data
      for (let attempt = 1; attempt <= maxRetriesPerPage; attempt++) {
        try {
          onStatus(`${page.name}: Fetching data (attempt ${attempt})...`)
          const data = await fetchPageData(page, spec, projectName)
          if (validatePageData(data)) {
            onStatus(`${page.name}: Building page from template...`)
            const content = buildPageFromData(page.name, page.route, data)
            const sanitized = sanitizeFileContent(page.path, content)
            onStatus(`${page.name}: Done`)
            return { path: page.path, content: sanitized }
          }
          onStatus(`${page.name}: Data validation failed (attempt ${attempt})`)
        } catch (e: any) {
          onStatus(`${page.name}: Error - ${e.message?.slice(0, 50)} (attempt ${attempt})`)
        }
      }

      // Final fallback: guaranteed safe stub
      onStatus(`${page.name}: Using safe stub`)
      return { path: page.path, content: generateSafeStub(page.name, page.route) }
    })
  )

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { path: pages[i].path, content: generateSafeStub(pages[i].name, pages[i].route) }
  })
}
