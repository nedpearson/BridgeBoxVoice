/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PAGE TEMPLATE — Unlimited drill-down navigation stack   ║
 * ║  Stat cards → filter   Row → record detail               ║
 * ║  Field → field pivot   Sub-record → sub-record detail    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

export interface PageData {
  fields: string[]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text' | 'date' | 'select' | 'textarea'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}

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
import { BarChart2, Plus, Search, Edit2, X, ChevronRight, ChevronLeft, TrendingUp, Trash2 } from 'lucide-react';

const DATA: Record<string, any>[] = ${dataJson};
const SUB_RECORDS = ${subJson};
const STATS = ${statsJson};
const FORM_FIELDS: { key: string; label: string; type: string; options?: string[] }[] = ${formJson};
const FIELDS: string[] = ${fieldsJson};
const PAGE_NAME = '${pageName}';
const EMPTY_FORM: Record<string, any> = ${emptyForm};
const STATUS_MAP: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  available: 'bg-emerald-500/20 text-emerald-400',
  complete: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  done: 'bg-emerald-500/20 text-emerald-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  upcoming: 'bg-blue-500/20 text-blue-400',
  inprogress: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-amber-500/20 text-amber-400',
  reserved: 'bg-amber-500/20 text-amber-400',
  alteration: 'bg-amber-500/20 text-amber-400',
  cancelled: 'bg-red-500/20 text-red-400',
  overdue: 'bg-red-500/20 text-red-400',
  inactive: 'bg-slate-500/20 text-slate-400',
};

type NavItem = { type: string; label: string; data?: any; parentRecord?: any; fieldKey?: string; fieldValue?: any };

export default function ${safeName}() {
  const [items, setItems] = useState<Record<string, any>[]>(DATA);
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [nav, setNav] = useState<NavItem[]>([{ type: 'list', label: PAGE_NAME }]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);

  const push = (v: NavItem) => setNav(n => [...n, v]);
  const pop = () => setNav(n => n.length > 1 ? n.slice(0, -1) : n);
  const jumpTo = (i: number) => setNav(n => n.slice(0, i + 1));
  const cur = nav[nav.length - 1];

  const filtered = items.filter(r => {
    const ms = Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    const mf = !statFilter || Object.values(r).some(v => String(v).toLowerCase().includes(statFilter.toLowerCase()));
    return ms && mf;
  });

  const handleSave = () => {
    if (form.id) { setItems(it => it.map(i => i.id === form.id ? { ...i, ...form } : i)); }
    else { setItems(it => [...it, { ...form, id: Date.now() }]); }
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const badgeCls = (v: any) => STATUS_MAP[String(v).toLowerCase().replace(/[^a-z]/g, '')] || 'bg-purple-500/20 text-purple-400';
  const isAmount = (k: string) => /amount|price|pay|cost|revenue|total|value/i.test(k);
  const isStatus = (k: string) => /status|availability|state/i.test(k);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {nav.length > 1 && (
        <div className="flex items-center gap-1 mb-5 text-sm overflow-x-auto pb-1">
          {nav.map((v, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />}
              <button onClick={() => jumpTo(i)} className={i === nav.length - 1 ? 'text-white font-semibold whitespace-nowrap' : 'text-purple-400 hover:text-purple-300 whitespace-nowrap transition-colors'}>
                {v.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {cur.type === 'list' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <BarChart2 size={20} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{PAGE_NAME}</h1>
                <p className="text-slate-400 text-sm">{filtered.length} records{statFilter && <> · <button onClick={() => setStatFilter(null)} className="text-purple-400 hover:text-purple-300">clear filter</button></>}</p>
              </div>
            </div>
            <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-purple-900/30">
              <Plus size={16} />New
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {STATS.map((s, i) => (
              <div key={i} onClick={() => setStatFilter(statFilter === String(s.value) ? null : String(s.value))}
                className={\`bg-[#1e293b] rounded-xl p-4 border cursor-pointer hover:border-purple-500/60 transition-all \${statFilter === String(s.value) ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-[#334155]'}\`}>
                <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-purple-500 text-xs mt-1">Filter</p>
              </div>
            ))}
          </div>

          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={\`Search \${PAGE_NAME.toLowerCase()}...\`}
              className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-9 pr-10 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X size={14} /></button>}
          </div>

          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155] bg-[#0f172a]">
                  <th className="w-6 px-3 py-3"></th>
                  {FIELDS.map(f => <th key={f} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{f.replace(/([A-Z])/g, ' $1').trim()}</th>)}
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={FIELDS.length + 2} className="text-center py-12 text-slate-500">No records found</td></tr>
                  : filtered.map(row => (
                    <tr key={row.id} onClick={() => push({ type: 'record', label: String(row[FIELDS[0]] ?? row.id), data: row })}
                      className="border-b border-[#334155] hover:bg-[#263148] cursor-pointer transition-colors last:border-0 group">
                      <td className="px-3 py-3"><ChevronRight size={14} className="text-slate-600 group-hover:text-purple-400 transition-colors" /></td>
                      {FIELDS.map(f => (
                        <td key={f} className="px-4 py-3 text-sm" onClick={e => { e.stopPropagation(); push({ type: 'field', label: f.replace(/([A-Z])/g, ' $1').trim(), fieldKey: f, fieldValue: row[f], parentRecord: row }); }}>
                          {isStatus(f)
                            ? <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \${badgeCls(row[f])}\`}>{String(row[f])}</span>
                            : isAmount(f)
                              ? <span className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">{String(row[f])}</span>
                              : <span className="text-white hover:text-purple-300 transition-colors">{String(row[f])}</span>}
                        </td>
                      ))}
                      <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setForm({ ...row }); setShowForm(true); }} className="p-1.5 text-slate-500 hover:text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors"><Edit2 size={13} /></button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {cur.type === 'record' && cur.data && (
        <div>
          <button onClick={pop} className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm mb-5 transition-colors"><ChevronLeft size={16} />Back</button>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0f172a]">
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-purple-400" />
                <h2 className="text-xl font-bold text-white">{String(cur.data[FIELDS[0]] ?? cur.data.id)}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setForm({ ...cur.data }); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-600/30 transition-colors"><Edit2 size={12} />Edit</button>
                <button onClick={() => { setItems(it => it.filter(i => i.id !== cur.data.id)); pop(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors"><Trash2 size={12} />Delete</button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fields — click any to drill down</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {Object.entries(cur.data).filter(([k]) => k !== 'id').map(([k, v]) => (
                  <div key={k} onClick={() => push({ type: 'field', label: k.replace(/([A-Z])/g, ' $1').trim(), fieldKey: k, fieldValue: v, parentRecord: cur.data })}
                    className="bg-[#0f172a] rounded-xl p-3 cursor-pointer border border-transparent hover:border-purple-500/50 hover:bg-[#263148] transition-all group">
                    <p className="text-slate-400 text-xs capitalize mb-1 group-hover:text-slate-300">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">{String(v)}</p>
                    <ChevronRight size={10} className="text-purple-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Related Activity — click any to drill down</p>
              <div className="space-y-2">
                {SUB_RECORDS.filter(r => r.parentId === cur.data.id).length === 0
                  ? <p className="text-slate-500 text-sm py-4 text-center">No related records yet.</p>
                  : SUB_RECORDS.filter(r => r.parentId === cur.data.id).map(r => (
                    <div key={r.id} onClick={() => push({ type: 'subRecord', label: r.title, data: r, parentRecord: cur.data })}
                      className="flex items-center justify-between bg-[#0f172a] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#263148] border border-transparent hover:border-purple-500/30 transition-all group">
                      <div>
                        <p className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">{r.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{r.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={\`text-xs px-2.5 py-1 rounded-full font-medium \${badgeCls(r.status)}\`}>{r.status}</span>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {cur.type === 'subRecord' && cur.data && (
        <div>
          <button onClick={pop} className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm mb-5 transition-colors"><ChevronLeft size={16} />Back</button>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#334155] bg-[#0f172a]">
              <h2 className="text-xl font-bold text-white">{cur.data.title}</h2>
              <p className="text-slate-400 text-sm mt-0.5">Activity on: <button onClick={() => push({ type: 'record', label: String(cur.parentRecord?.[FIELDS[0]] ?? ''), data: cur.parentRecord })} className="text-purple-400 hover:text-purple-300 transition-colors">{String(cur.parentRecord?.[FIELDS[0]] ?? '')}</button></p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.entries(cur.data).filter(([k]) => k !== 'id' && k !== 'parentId').map(([k, v]) => (
                  <div key={k} onClick={() => push({ type: 'field', label: k, fieldKey: k, fieldValue: v, parentRecord: cur.data })}
                    className="bg-[#0f172a] rounded-xl p-3 cursor-pointer border border-transparent hover:border-purple-500/50 hover:bg-[#263148] transition-all group">
                    <p className="text-slate-400 text-xs capitalize mb-1">{k}</p>
                    <p className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">{String(v)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0f172a] rounded-xl p-4 border border-[#334155]">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Parent Record</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(cur.parentRecord || {}).filter(([k]) => k !== 'id').slice(0, 4).map(([k, v]) => (
                    <div key={k} onClick={() => push({ type: 'record', label: String(cur.parentRecord[FIELDS[0]]), data: cur.parentRecord })} className="cursor-pointer hover:text-purple-300 transition-colors">
                      <p className="text-slate-500 text-xs capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-slate-200 text-sm font-medium">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cur.type === 'field' && (
        <div>
          <button onClick={pop} className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm mb-5 transition-colors"><ChevronLeft size={16} />Back</button>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#334155] bg-[#0f172a]">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{String(cur.label)}</p>
              <h2 className="text-2xl font-bold text-white">{String(cur.fieldValue)}</h2>
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Records with this value — click to drill down</p>
              <div className="space-y-2 mb-6">
                {items.filter(r => String(r[cur.fieldKey!]).toLowerCase() === String(cur.fieldValue).toLowerCase()).map(r => (
                  <div key={r.id} onClick={() => push({ type: 'record', label: String(r[FIELDS[0]]), data: r })}
                    className="flex items-center justify-between bg-[#0f172a] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#263148] border border-transparent hover:border-purple-500/30 transition-all group">
                    <span className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">{String(r[FIELDS[0]])}</span>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-purple-400" />
                  </div>
                ))}
                {items.filter(r => String(r[cur.fieldKey!]).toLowerCase() === String(cur.fieldValue).toLowerCase()).length === 0 && (
                  <p className="text-slate-500 text-sm py-4 text-center">No records with this value.</p>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">All values for this field</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set(items.map(r => String(r[cur.fieldKey!])))].map(val => (
                  <button key={val} onClick={() => push({ type: 'field', label: cur.label, fieldKey: cur.fieldKey, fieldValue: val, parentRecord: cur.parentRecord })}
                    className={\`px-3 py-1.5 rounded-lg text-sm border transition-colors \${String(val) === String(cur.fieldValue) ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#0f172a] text-slate-300 border-[#334155] hover:border-purple-500/50 hover:text-white'}\`}>
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] sticky top-0 bg-[#1e293b]">
              <h2 className="text-lg font-bold text-white">{form.id ? 'Edit' : 'New'} Record</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="p-1.5 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {FORM_FIELDS.map(ff => (
                <div key={ff.key} className={ff.type === 'textarea' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-slate-400 mb-1.5">{ff.label}</label>
                  {ff.type === 'select'
                    ? <select value={form[ff.key] ?? ''} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">{(ff.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
                    : ff.type === 'textarea'
                      ? <textarea value={form[ff.key] ?? ''} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} rows={3} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
                      : <input type={ff.type} value={form[ff.key] ?? ''} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                  }
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[#334155] text-slate-300 rounded-xl text-sm font-semibold hover:bg-[#263148] transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors">{form.id ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
}
