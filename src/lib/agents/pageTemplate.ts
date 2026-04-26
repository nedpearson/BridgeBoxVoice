/**
 * PAGE TEMPLATE v2 — Professional Retail UI (Lightspeed-style split panel)
 */

export interface PageData {
  fields: string[]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text' | 'date' | 'select' | 'textarea' | 'number'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}

const STATUS_MAP: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  available: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  complete: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'paid-off': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  current: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'in-transit': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  received: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  reserved: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  alteration: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'in progress': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
  late: 'bg-red-500/20 text-red-400 border-red-500/30',
  defaulted: 'bg-red-500/20 text-red-400 border-red-500/30',
  inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'on-hold': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function buildPageFromData(pageName: string, _route: string, data: PageData): string {
  const safeName = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const dataJson = JSON.stringify(data.records, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  const subJson = JSON.stringify(data.subRecords, null, 2)
  const statsJson = JSON.stringify(data.stats, null, 2)
  const formJson = JSON.stringify(data.formFields, null, 2)
  const emptyForm = `{ ${data.formFields.map(f => `${f.key}: ''`).join(', ')} }`
  const fieldsJson = JSON.stringify(fields)

  return `import React, { useState } from 'react';
import { Search, Plus, Edit2, X, Trash2, ChevronRight, ChevronLeft, Filter, RefreshCw, TrendingUp } from 'lucide-react';

const DATA: Record<string, any>[] = ${dataJson};
const SUB_RECORDS = ${subJson};
const STATS = ${statsJson};
const FORM_FIELDS: { key: string; label: string; type: string; options?: string[] }[] = ${formJson};
const FIELDS: string[] = ${fieldsJson};
const PAGE_NAME = '${pageName}';
const EMPTY_FORM: Record<string, any> = ${emptyForm};
const STATUS_MAP: Record<string, string> = { active:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', available:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', complete:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', completed:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', done:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', 'paid-off':'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', current:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', scheduled:'bg-blue-500/20 text-blue-400 border-blue-500/30', confirmed:'bg-blue-500/20 text-blue-400 border-blue-500/30', pending:'bg-amber-500/20 text-amber-400 border-amber-500/30', reserved:'bg-amber-500/20 text-amber-400 border-amber-500/30', cancelled:'bg-red-500/20 text-red-400 border-red-500/30', overdue:'bg-red-500/20 text-red-400 border-red-500/30', late:'bg-red-500/20 text-red-400 border-red-500/30', inactive:'bg-slate-500/20 text-slate-400 border-slate-500/30' };
const badge = (v: any) => STATUS_MAP[String(v).toLowerCase()] || 'bg-purple-500/20 text-purple-400 border-purple-500/30';
const isMoney = (k: string) => /amount|price|pay|cost|revenue|total|value|gross|balance|margin|deposit/i.test(k);
const isStatus = (k: string) => /status|availability|state/i.test(k);
const fmtKey = (k: string) => k.replace(/([A-Z])/g, ' ' + '$' + '1').trim();

type NavItem = { type: string; label: string; data?: any; parentRecord?: any; fieldKey?: string; fieldValue?: any };

export default function ${safeName}() {
  const [items, setItems] = useState<Record<string, any>[]>(DATA);
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [nav, setNav] = useState<NavItem[]>([{ type: 'list', label: PAGE_NAME }]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [detailTab, setDetailTab] = useState('fields');

  const push = (v: NavItem) => { setNav(n => [...n, v]); setDetailTab('fields'); };
  const pop = () => setNav(n => n.length > 1 ? n.slice(0, -1) : n);
  const jumpTo = (i: number) => setNav(n => n.slice(0, i + 1));
  const cur = nav[nav.length - 1];

  const filtered = items.filter(r => {
    const ms = Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    const mf = !statFilter || Object.values(r).some(v => String(v).toLowerCase().includes(statFilter.toLowerCase()));
    return ms && mf;
  });

  const handleSave = () => {
    if (form.id) setItems(it => it.map(i => i.id === form.id ? { ...i, ...form } : i));
    else setItems(it => [...it, { ...form, id: Date.now() }]);
    setShowForm(false); setForm(EMPTY_FORM);
  };

  const related = cur.data ? SUB_RECORDS.filter(r => r.parentId === cur.data?.id) : [];
  const sameValue = cur.fieldKey ? items.filter(r => String(r[cur.fieldKey!]).toLowerCase() === String(cur.fieldValue).toLowerCase()) : [];
  const allVals = cur.fieldKey ? [...new Set(items.map(r => String(r[cur.fieldKey!])))] : [];

  return (
    <div className="flex flex-col h-full bg-[#0a0f1e]">
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b] flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
          {nav.map((v, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-slate-600 mx-0.5">/</span>}
              <button onClick={() => jumpTo(i)} className={i === nav.length - 1 ? 'text-white font-medium truncate' : 'text-slate-400 hover:text-slate-200 transition-colors truncate'}>
                {v.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        {/* Toolbar actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {cur.type !== 'list' && (
            <button onClick={pop} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-[#1e293b] hover:bg-[#263148] rounded border border-[#334155] transition-colors">
              <ChevronLeft size={12} />Back
            </button>
          )}
          {cur.type === 'list' && (
            <>
              <button onClick={() => { setStatFilter(null); setSearch(''); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-[#1e293b] hover:bg-[#263148] rounded border border-[#334155] transition-colors">
                <RefreshCw size={11} />Reset
              </button>
              <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded border border-purple-500 transition-colors">
                <Plus size={12} />New {PAGE_NAME.replace(/s$/,'')}
              </button>
            </>
          )}
          {(cur.type === 'record' && cur.data) && (
            <>
              <button onClick={() => { setForm({ ...cur.data }); setShowForm(true); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-[#1e293b] hover:bg-[#263148] rounded border border-[#334155] transition-colors">
                <Edit2 size={11} />Edit
              </button>
              <button onClick={() => { setItems(it => it.filter(i => i.id !== cur.data.id)); pop(); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 bg-[#1e293b] hover:bg-red-900/20 rounded border border-[#334155] hover:border-red-500/30 transition-colors">
                <Trash2 size={11} />Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── List View ── */}
      {cur.type === 'list' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* KPI bar */}
          <div className="grid grid-cols-4 gap-px bg-[#1e293b] border-b border-[#1e293b]">
            {STATS.map((s, i) => (
              <button key={i} onClick={() => setStatFilter(statFilter === String(s.value) ? null : String(s.value))}
                className={\`flex flex-col items-start px-4 py-3 bg-[#0f172a] hover:bg-[#141f35] transition-colors text-left \${statFilter === String(s.value) ? 'border-b-2 border-purple-500' : 'border-b-2 border-transparent'}\`}>
                <span className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{s.label}</span>
                <span className="text-lg font-bold text-white">{s.value}</span>
                {statFilter === String(s.value) && <span className="text-xs text-purple-400 mt-0.5">Filtered</span>}
              </button>
            ))}
          </div>
          {/* Search + filter bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] border-b border-[#1e293b]">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={\`Search \${PAGE_NAME.toLowerCase()}...\`}
                className="w-full pl-7 pr-3 py-1.5 bg-[#1e293b] border border-[#334155] rounded text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500" />
            </div>
            {(search || statFilter) && (
              <button onClick={() => { setSearch(''); setStatFilter(null); }} className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-white bg-[#1e293b] rounded border border-[#334155] transition-colors">
                <X size={11} />Clear
              </button>
            )}
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} records</span>
          </div>
          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f172a] border-b border-[#1e293b]">
                  {FIELDS.map(f => (
                    <th key={f} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">{fmtKey(f)}</th>
                  ))}
                  <th className="px-3 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={FIELDS.length + 1} className="text-center py-16 text-slate-600">No records found</td></tr>
                  : filtered.map((row, idx) => (
                    <tr key={row.id} onClick={() => push({ type: 'record', label: String(row[FIELDS[0]] ?? row.id), data: row })}
                      className={\`border-b border-[#1e293b] hover:bg-[#141f35] cursor-pointer transition-colors group \${idx % 2 === 0 ? 'bg-[#0a0f1e]' : 'bg-[#0d1424]'}\`}>
                      {FIELDS.map(f => (
                        <td key={f} className="px-4 py-2.5 whitespace-nowrap"
                          onClick={e => { e.stopPropagation(); push({ type: 'field', label: fmtKey(f), fieldKey: f, fieldValue: row[f], parentRecord: row }); }}>
                          {isStatus(f)
                            ? <span className={\`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border \${badge(row[f])}\`}>{String(row[f])}</span>
                            : isMoney(f)
                              ? <span className="text-emerald-400 font-mono text-xs">{String(row[f])}</span>
                              : <span className="text-slate-200 group-hover:text-white transition-colors">{String(row[f])}</span>
                          }
                        </td>
                      ))}
                      <td className="px-3 py-2.5">
                        <button onClick={e => { e.stopPropagation(); setForm({ ...row }); setShowForm(true); }}
                          className="p-1 text-slate-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-purple-500/10">
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Record Detail ── */}
      {cur.type === 'record' && cur.data && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Detail header */}
          <div className="px-4 py-3 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">{String(cur.data[FIELDS[0]] ?? cur.data.id)}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{PAGE_NAME} Record</p>
            </div>
            <div className="flex items-center gap-2">
              {isStatus(FIELDS.find(f => isStatus(f) || '') as string) && cur.data[FIELDS.find(f => isStatus(f) || '') as string] && (
                <span className={\`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border \${badge(cur.data[FIELDS.find(f => isStatus(f) || '') as string] || '')}\`}>
                  {String(cur.data[FIELDS.find(f => isStatus(f) || '') as string] || '')}
                </span>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-[#1e293b] bg-[#0f172a] px-4">
            {['fields', 'activity'].map(t => (
              <button key={t} onClick={() => setDetailTab(t)}
                className={\`px-4 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors \${detailTab === t ? 'border-purple-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}\`}>
                {t === 'activity' ? \`Activity (\${related.length})\` : 'Details'}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-auto p-4">
            {detailTab === 'fields' && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(cur.data).filter(([k]) => k !== 'id').map(([k, v]) => (
                  <div key={k} onClick={() => push({ type: 'field', label: fmtKey(k), fieldKey: k, fieldValue: v, parentRecord: cur.data })}
                    className="bg-[#0f172a] rounded border border-[#1e293b] p-3 cursor-pointer hover:border-purple-500/40 hover:bg-[#141f35] transition-all group">
                    <p className="text-xs text-slate-500 capitalize mb-1 group-hover:text-slate-400">{fmtKey(k)}</p>
                    {isStatus(k)
                      ? <span className={\`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border \${badge(v)}\`}>{String(v)}</span>
                      : isMoney(k)
                        ? <p className="text-emerald-400 font-mono text-sm font-medium">{String(v)}</p>
                        : <p className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors truncate">{String(v)}</p>
                    }
                    <ChevronRight size={10} className="text-slate-600 mt-1.5 group-hover:text-purple-500 transition-colors" />
                  </div>
                ))}
              </div>
            )}
            {detailTab === 'activity' && (
              <div>
                {related.length === 0
                  ? <p className="text-slate-600 text-sm py-8 text-center">No activity recorded yet.</p>
                  : <div className="space-y-1">
                    {related.map(r => (
                      <div key={r.id} onClick={() => push({ type: 'subRecord', label: r.title, data: r, parentRecord: cur.data })}
                        className="flex items-center justify-between px-3 py-2.5 bg-[#0f172a] rounded border border-[#1e293b] hover:border-purple-500/30 hover:bg-[#141f35] cursor-pointer transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                          <p className="text-sm text-slate-200 group-hover:text-white truncate">{r.title}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-slate-600">{r.date}</span>
                          <span className={\`inline-flex items-center px-1.5 py-0.5 rounded text-xs border \${badge(r.status)}\`}>{r.status}</span>
                          <ChevronRight size={12} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-record detail ── */}
      {cur.type === 'subRecord' && cur.data && (
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-2xl">
            <div className="bg-[#0f172a] rounded-lg border border-[#1e293b] overflow-hidden mb-3">
              <div className="px-4 py-3 border-b border-[#1e293b]">
                <h3 className="text-sm font-semibold text-white">{cur.data.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Activity on: <button onClick={() => push({ type: 'record', label: String(cur.parentRecord?.[FIELDS[0]]), data: cur.parentRecord })} className="text-purple-400 hover:text-purple-300 transition-colors">{String(cur.parentRecord?.[FIELDS[0]])}</button></p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[#1e293b]">
                {Object.entries(cur.data).filter(([k]) => k !== 'id' && k !== 'parentId').map(([k, v]) => (
                  <div key={k} onClick={() => push({ type: 'field', label: k, fieldKey: k, fieldValue: v, parentRecord: cur.data })}
                    className="bg-[#0f172a] px-4 py-3 cursor-pointer hover:bg-[#141f35] transition-colors group">
                    <p className="text-xs text-slate-500 capitalize mb-0.5">{k}</p>
                    {isStatus(k)
                      ? <span className={\`inline-flex items-center px-1.5 py-0.5 rounded text-xs border \${badge(v)}\`}>{String(v)}</span>
                      : <p className="text-sm text-white group-hover:text-purple-300 transition-colors">{String(v)}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Field pivot ── */}
      {cur.type === 'field' && (
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-2xl">
            <div className="bg-[#0f172a] rounded-lg border border-[#1e293b] overflow-hidden mb-3">
              <div className="px-4 py-3 border-b border-[#1e293b]">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{cur.label}</p>
                <div className="flex items-center gap-2">
                  {isStatus(cur.fieldKey || '') 
                    ? <span className={\`inline-flex items-center px-2 py-1 rounded text-sm font-semibold border \${badge(cur.fieldValue)}\`}>{String(cur.fieldValue)}</span>
                    : isMoney(cur.fieldKey || '')
                      ? <span className="text-xl font-bold text-emerald-400 font-mono">{String(cur.fieldValue)}</span>
                      : <span className="text-xl font-bold text-white">{String(cur.fieldValue)}</span>
                  }
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{sameValue.length} records with this value</p>
                <div className="space-y-1 mb-4">
                  {sameValue.map(r => (
                    <div key={r.id} onClick={() => push({ type: 'record', label: String(r[FIELDS[0]]), data: r })}
                      className="flex items-center justify-between px-3 py-2 bg-[#0a0f1e] rounded border border-[#1e293b] hover:border-purple-500/30 hover:bg-[#141f35] cursor-pointer group transition-all">
                      <span className="text-sm text-slate-200 group-hover:text-white">{String(r[FIELDS[0]])}</span>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-purple-400" />
                    </div>
                  ))}
                  {sameValue.length === 0 && <p className="text-slate-600 text-xs py-2 text-center">No other records with this value.</p>}
                </div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">All values</p>
                <div className="flex flex-wrap gap-1.5">
                  {allVals.map(val => (
                    <button key={val} onClick={() => push({ type: 'field', label: cur.label, fieldKey: cur.fieldKey, fieldValue: val, parentRecord: cur.parentRecord })}
                      className={\`px-2.5 py-1 rounded text-xs border font-medium transition-colors \${String(val) === String(cur.fieldValue) ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#0a0f1e] text-slate-300 border-[#1e293b] hover:border-purple-500/40 hover:text-white'}\`}>
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] rounded-xl border border-[#334155] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e293b] bg-[#141f35]">
              <div>
                <h2 className="text-sm font-bold text-white">{form.id ? 'Edit' : 'New'} {PAGE_NAME.replace(/s$/, '')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{form.id ? 'Update record details' : 'Create a new record'}</p>
              </div>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-[#1e293b]"><X size={16} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {FORM_FIELDS.map(ff => (
                <div key={ff.key} className={ff.type === 'textarea' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">{ff.label}</label>
                  {ff.type === 'select'
                    ? <select value={form[ff.key] ?? ''} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} className="w-full bg-[#0a0f1e] border border-[#334155] rounded px-2.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500">{(ff.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
                    : ff.type === 'textarea'
                      ? <textarea value={form[ff.key] ?? ''} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} rows={2} className="w-full bg-[#0a0f1e] border border-[#334155] rounded px-2.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
                      : <input type={ff.type || 'text'} value={form[ff.key] ?? ''} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} className="w-full bg-[#0a0f1e] border border-[#334155] rounded px-2.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                  }
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-[#1e293b] bg-[#141f35]">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="flex-1 px-4 py-2 bg-[#0a0f1e] border border-[#334155] text-slate-300 rounded text-sm font-medium hover:bg-[#1e293b] transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-semibold transition-colors">{form.id ? 'Save Changes' : 'Create Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
}
