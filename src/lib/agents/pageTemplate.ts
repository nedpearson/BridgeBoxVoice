/* eslint-disable */

export interface PageData {
  fields: string[]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text'|'date'|'select'|'textarea'|'number'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}


export const THEMES = [
  { bg: 'bg-[#030712]', cardBg: 'bg-[#0B0F19]', navBg: 'bg-[#060913]', border: 'border-[#1E293B]', textNormal: 'text-slate-200', textMain: 'text-white', textSub: 'text-slate-500', textMuted: 'text-slate-400', inputBg: 'bg-[#131B2B]', hoverBg: 'hover:bg-[#1E293B]', accentBg: 'bg-blue-600', accentHover: 'hover:bg-blue-500', accentText: 'text-blue-400', shadow: 'shadow-blue-600/20' },
  { bg: 'bg-stone-50', cardBg: 'bg-white', navBg: 'bg-stone-100', border: 'border-stone-200', textNormal: 'text-stone-700', textMain: 'text-stone-900', textSub: 'text-stone-500', textMuted: 'text-stone-400', inputBg: 'bg-stone-50', hoverBg: 'hover:bg-stone-100', accentBg: 'bg-rose-600', accentHover: 'hover:bg-rose-500', accentText: 'text-rose-600', shadow: 'shadow-rose-600/20' },
  { bg: 'bg-zinc-50', cardBg: 'bg-white', navBg: 'bg-zinc-100', border: 'border-zinc-200', textNormal: 'text-zinc-700', textMain: 'text-zinc-900', textSub: 'text-zinc-500', textMuted: 'text-zinc-400', inputBg: 'bg-zinc-50', hoverBg: 'hover:bg-zinc-100', accentBg: 'bg-emerald-600', accentHover: 'hover:bg-emerald-500', accentText: 'text-emerald-600', shadow: 'shadow-emerald-600/20' },
  { bg: 'bg-slate-950', cardBg: 'bg-slate-900', navBg: 'bg-slate-950', border: 'border-slate-800', textNormal: 'text-slate-300', textMain: 'text-slate-50', textSub: 'text-slate-500', textMuted: 'text-slate-400', inputBg: 'bg-slate-800', hoverBg: 'hover:bg-slate-700', accentBg: 'bg-violet-600', accentHover: 'hover:bg-violet-500', accentText: 'text-violet-400', shadow: 'shadow-violet-600/20' }
];
export const getTheme = (name: string | undefined) => THEMES[(name || '').split('').reduce((a,b)=>a+b.charCodeAt(0),0) % THEMES.length];

export const STATUS_MAP = {}

export function validatePageData(d: any): d is PageData {
  return d && Array.isArray(d.fields) && Array.isArray(d.records) && d.fields.length > 0
}

export function generateSafeStub(pageName: string, _route: string, projectName?: string): string {
  const T = getTheme(projectName);
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  return `import React from 'react';
export default function ${safe}(){
  return (
    <div className="p-8 ${T.textNormal} h-full flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
        <div className="${T.accentText} font-bold text-2xl">${safe[0]}</div>
      </div>
      <h2 className="text-2xl font-bold mb-2 ${T.textMain}">${pageName}</h2>
      <p className="${T.textSub} ${T.inputBg} border ${T.border} px-4 py-2 rounded-lg font-mono text-xs mt-4">${_route}</p>
    </div>
  );
}`
}

export function buildPageFromData(pageName: string, _route: string, data: PageData, projectName?: string): string {
  const T = getTheme(projectName);
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const primaryField = fields[0] || 'name'
  const statusField = fields.find(f => /status|state|stage/i.test(f)) || ''
  const dateField = fields.find(f => /date|time|created|updated/i.test(f)) || ''
  const moneyFields = fields.filter(f => /price|amount|balance|cost|fee|total|pay|revenue|salary|wage|rate/i.test(f))

  const dataJson = JSON.stringify(data.records).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  const statsJson = JSON.stringify(data.stats)
  const fieldsJson = JSON.stringify(fields)
  const moneyJson = JSON.stringify(moneyFields)
  const formJson = JSON.stringify(data.formFields || [])
  const emptyForm = '{' + (data.formFields || []).map(f => `"${f.key}":""`).join(',') + '}'

  return `import React, { useState } from 'react';
import { Plus, Search, ChevronRight, ChevronLeft, Edit2, Trash2, X, Filter, MoreHorizontal, TrendingUp, ExternalLink } from 'lucide-react';

const DATA = ${dataJson} || [];
const STATS = ${statsJson} || [];
const FF = ${formJson} || [];
const FIELDS = ${fieldsJson} || [];
const MF = ${moneyJson} || [];

const PAGE = '${pageName}';
const PF = '${primaryField}';
const SF = '${statusField}';
const DF = '${dateField}';
const EMPTY = ${emptyForm};
const IS_DASH = PAGE.toLowerCase().includes('dashboard');

const SC: Record<string, string> = { active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', confirmed: 'bg-blue-500/10 ${T.accentText} border-blue-500/20', completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20', cancelled: 'bg-red-500/10 text-red-400 border-red-500/20', 'no-show': 'bg-red-500/10 text-red-400 border-red-500/20', scheduled: 'bg-blue-500/10 ${T.accentText} border-blue-500/20', paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', overdue: 'bg-red-500/10 text-red-400 border-red-500/20', delinquent: 'bg-red-500/10 text-red-400 border-red-500/20' };
const sc = (v: any) => SC[String(v || '').toLowerCase()] || 'bg-purple-500/10 text-purple-400 border-purple-500/20';
const fk = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
const isMon = (f: string) => MF.includes(f);
const isSt = (f: string) => SF && f === SF;
const fmt = (v: any) => v === null || v === undefined ? '-' : String(v);

function Badge({ v }: { v: any }) {
  const c = sc(v);
  return (
    <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap " + c}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {fmt(v)}
    </span>
  );
}

export default function ${safe}() {
  const [items, setItems] = useState<any[]>(DATA);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const rows = q ? items.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q.toLowerCase()))) : items;

  const save = () => {
    if (form.id) setItems(it => it.map(i => i.id === form.id ? { ...i, ...form } : i));
    else setItems(it => [...it, { ...form, id: Date.now() }]);
    setShowForm(false); setForm(EMPTY);
  };

  const del = (id: any) => { setItems(it => it.filter(i => i.id !== id)); if (sel && sel.id === id) setSel(null); };

  if (sel) {
    return (
      <div className="flex flex-col h-full ${T.bg} ${T.textNormal} font-sans overflow-hidden">
        <div className="px-6 py-5 ${T.cardBg} border-b ${T.border} flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSel(null)} className="p-2 ${T.hoverBg} ${T.textMuted} hover:${T.textMain} rounded-xl transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="text-2xl font-black ${T.textMain} tracking-tight">{fmt(sel[PF])}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest ${T.textSub} mt-1">{PAGE} / {fmt(sel[PF])}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {SF && sel[SF] && <Badge v={sel[SF]} />}
            <button onClick={() => { setForm({ ...sel }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 ${T.inputBg} ${T.hoverBg} ${T.textMain} text-sm font-bold rounded-xl border ${T.border} transition-all">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={() => del(sel.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-xl border border-red-500/20 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
            <div className="${T.cardBg} border ${T.border} rounded-3xl p-8 shadow-2xl shadow-black/40">
              <div className="text-[11px] font-black ${T.textSub} uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Record Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(sel).filter(([k]) => k !== 'id').map(([k, v]) => (
                  <div key={k} className="${T.inputBg}/50 border ${T.border}/50 rounded-2xl p-5 hover:${T.border} transition-colors">
                    <div className="text-[10px] font-bold ${T.textSub} uppercase tracking-widest mb-2">{fk(k)}</div>
                    {isSt(k) ? <Badge v={v} /> :
                     isMon(k) ? <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">{fmt(v)}</div> :
                     <div className="text-sm font-semibold ${T.textNormal}">{fmt(v)}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {MF.length > 0 && (
            <div className="w-80 overflow-y-auto p-6 pt-8 pr-8 bg-[#080B14] border-l ${T.border} flex flex-col gap-6 shrink-0">
              <div className="bg-gradient-to-br from-[#131B2B] to-[#0B0F19] border ${T.border} rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-black/20">
                <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={80} /></div>
                <div className="text-[10px] font-black ${T.textSub} uppercase tracking-widest mb-6 relative z-10">Financial Summary</div>
                <div className="space-y-5 relative z-10">
                  {MF.map(f => (
                    <div key={f} className="flex flex-col gap-1 border-b ${T.border}/50 pb-3 last:border-0 last:pb-0">
                      <span className="text-xs ${T.textMuted} font-bold uppercase tracking-wider">{fk(f)}</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{fmt(sel[f])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="${T.cardBg} border ${T.border} rounded-3xl p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black ${T.textMain} tracking-tight">{form.id ? 'Edit Record' : 'New Record'}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 ${T.textMuted} hover:${T.textMain} rounded-xl ${T.hoverBg} transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
                {FF.map((f: any) => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold ${T.textMuted} uppercase tracking-widest mb-2">{fk(f.key)}</label>
                    {f.type === 'select' ? (
                      <select value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors">
                        {(f.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} rows={3} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                    ) : (
                      <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t ${T.border}">
                <button onClick={() => setShowForm(false)} className="px-6 py-3 text-sm font-bold ${T.textMuted} hover:${T.textMain} transition-colors">Cancel</button>
                <button onClick={save} className="px-6 py-3 ${T.accentBg} ${T.accentHover} ${T.textMain} text-sm font-bold rounded-2xl shadow-lg ${T.shadow} transition-all">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (IS_DASH) {
    return (
      <div className="flex flex-col h-full ${T.bg} ${T.textNormal} overflow-y-auto p-6 md:p-10 space-y-10 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black ${T.textMain} tracking-tight mb-2">{PAGE}</h2>
            <p className="text-sm font-medium ${T.textSub}">Welcome back. Here is your personalized overview.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s: any, i: number) => (
            <div key={i} className="bg-gradient-to-br from-[#131B2B] to-[#0B0F19] border ${T.border} rounded-3xl p-6 relative overflow-hidden group hover:border-[#334155] transition-colors shadow-xl shadow-black/20">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity"><TrendingUp size={64} /></div>
              <div className="text-[11px] font-black ${T.textSub} uppercase tracking-widest mb-4 relative z-10">{s.label}</div>
              <div className="text-4xl font-black ${T.textMain} tracking-tight relative z-10">{s.value}</div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="${T.cardBg} border ${T.border} rounded-3xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b ${T.border} flex items-center justify-between ${T.navBg}">
              <h3 className="text-lg font-black ${T.textMain} tracking-tight">Recent Activity</h3>
              <button className="text-xs font-bold ${T.accentText} hover:text-blue-300 flex items-center gap-1.5 transition-colors uppercase tracking-widest">View All <ExternalLink size={14} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="${T.inputBg}/30">
                    {FIELDS.slice(0, 5).map((f: string) => (
                      <th key={f} className="px-8 py-5 text-[10px] font-black ${T.textSub} uppercase tracking-widest border-b ${T.border}">{fk(f)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {items.slice(0, 8).map((row: any, i: number) => (
                    <tr key={i} onClick={() => setSel(row)} className="hover:${T.inputBg}/50 cursor-pointer transition-colors group">
                      {FIELDS.slice(0, 5).map((f: string, j: number) => (
                        <td key={f} className="px-8 py-5">
                          {isSt(f) ? <Badge v={row[f]} /> :
                           isMon(f) ? <span className="font-mono text-sm font-black text-emerald-400 tracking-tight">{fmt(row[f])}</span> :
                           <span className={"text-sm font-semibold " + (j === 0 ? "${T.textMain}" : "${T.textMuted}")}>{fmt(row[f])}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full ${T.bg} ${T.textNormal} font-sans">
      {STATS.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-b ${T.border} ${T.navBg} shrink-0">
          {STATS.map((s: any, i: number) => (
            <div key={i} className="px-8 py-6 border-r ${T.border} last:border-r-0 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 text-[#1E293B] opacity-20 group-hover:opacity-40 transition-opacity"><TrendingUp size={80} /></div>
              <div className="text-[10px] font-black ${T.textSub} uppercase tracking-widest mb-2 relative z-10">{s.label}</div>
              <div className="text-3xl font-black ${T.textMain} tracking-tight relative z-10">{s.value}</div>
            </div>
          ))}
        </div>
      )}
      
      <div className="px-8 py-5 ${T.cardBg} border-b ${T.border} flex items-center justify-between shrink-0 gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 ${T.textSub}" size={16} />
          <input 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            placeholder={"Search " + PAGE.toLowerCase() + "..."} 
            className="w-full pl-11 pr-4 py-3 ${T.inputBg} border ${T.border} rounded-2xl text-sm font-medium ${T.textNormal} placeholder:${T.textSub} focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-widest ${T.textSub}">{rows.length} records</div>
          <button className="p-3 ${T.inputBg} border ${T.border} ${T.textMuted} hover:${T.textMain} rounded-2xl transition-colors shadow-sm"><Filter size={16} /></button>
          <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 ${T.accentBg} ${T.accentHover} ${T.textMain} text-sm font-black uppercase tracking-wider rounded-2xl shadow-lg ${T.shadow} transition-all">
            <Plus size={16} strokeWidth={3} /> <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8 ${T.bg}">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl ${T.inputBg} border ${T.border} flex items-center justify-center mb-6 shadow-xl"><Search size={32} className="${T.textSub}" /></div>
            <h3 className="text-2xl font-black ${T.textMain} tracking-tight mb-3">No records found</h3>
            <p className="${T.textSub} text-sm font-medium max-w-md">We could not find anything matching your search. Try adjusting your filters or create a new record.</p>
          </div>
        ) : (
          <div className="${T.cardBg} border ${T.border} rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="${T.navBg} border-b ${T.border}">
                  <th className="px-8 py-5 text-[10px] font-black ${T.textSub} uppercase tracking-widest">{fk(PF)}</th>
                  {FIELDS.filter(f => f !== PF).slice(0, 4).map((f: string) => (
                    <th key={f} className="px-8 py-5 text-[10px] font-black ${T.textSub} uppercase tracking-widest">{fk(f)}</th>
                  ))}
                  <th className="px-8 py-5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {rows.map((row: any, idx: number) => {
                  const sv = SF ? fmt(row[SF]) : '';
                  const c = sc(sv);
                  const borderColor = c.split(' ').find(x => x.startsWith('border-'))?.replace('border-', 'bg-') || 'bg-blue-500';
                  return (
                    <tr key={row.id || idx} onClick={() => setSel(row)} className="cursor-pointer group transition-colors hover:${T.inputBg}/80 bg-transparent">
                      <td className="px-8 py-5 relative">
                        <div className={"absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity " + borderColor} />
                        <div className="text-sm font-black ${T.textMain}">{fmt(row[PF])}</div>
                        {DF && row[DF] && <div className="text-[11px] font-bold ${T.textSub} mt-1">{fmt(row[DF])}</div>}
                      </td>
                      {FIELDS.filter(f => f !== PF).slice(0, 4).map((f: string) => (
                        <td key={f} className="px-8 py-5">
                          {isSt(f) ? <Badge v={row[f]} /> :
                           isMon(f) ? <span className="font-mono text-sm font-black text-emerald-400 tracking-tight">{fmt(row[f])}</span> :
                           <span className="text-sm font-semibold ${T.textMuted}">{fmt(row[f])}</span>}
                        </td>
                      ))}
                      <td className="px-8 py-5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); setForm({ ...row }); setShowForm(true); }} className="opacity-0 group-hover:opacity-100 p-2.5 ${T.textMuted} hover:${T.textMain} ${T.hoverBg} rounded-xl transition-all">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="${T.cardBg} border ${T.border} rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black ${T.textMain} tracking-tight">{form.id ? 'Edit Record' : 'New ' + PAGE.replace(/s$/, '')}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 ${T.textMuted} hover:${T.textMain} rounded-xl ${T.hoverBg} transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {FF.map((f: any) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold ${T.textMuted} uppercase tracking-widest mb-2">{fk(f.key)}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors">
                      {(f.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} rows={3} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                  ) : (
                    <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t ${T.border}">
              <button onClick={() => setShowForm(false)} className="px-6 py-3 text-sm font-bold ${T.textMuted} hover:${T.textMain} transition-colors">Cancel</button>
              <button onClick={save} className="px-6 py-3 ${T.accentBg} ${T.accentHover} ${T.textMain} text-sm font-bold rounded-2xl shadow-lg ${T.shadow} transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
}

export function buildCalendarPage(pageName: string, _route: string, data: PageData, projectName?: string): string {
  const T = getTheme(projectName);
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const dateField = fields.find(f => /date|time|start/i.test(f)) || fields[1] || 'date'
  const primaryField = fields[0] || 'name'
  const statusField = fields.find(f => /status|state|stage/i.test(f)) || ''

  const dataJson = JSON.stringify(data.records).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  const formJson = JSON.stringify(data.formFields || [])
  const emptyForm = '{' + (data.formFields || []).map(f => '"' + f.key + '":""').join(',') + '}'

  return `import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronLeft, X, Calendar, Clock, MapPin, User, Edit2 } from 'lucide-react';

const DATA = ${dataJson} || [];
const FF = ${formJson} || [];

const PAGE = '${pageName}';
const PF = '${primaryField}';
const SF = '${statusField}';
const DF = '${dateField}';
const EMPTY = ${emptyForm};

const MO = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const SC: Record<string, string> = { active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', confirmed: 'bg-blue-500/10 ${T.accentText} border-blue-500/20', completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20', cancelled: 'bg-red-500/10 text-red-400 border-red-500/20', 'no-show': 'bg-red-500/10 text-red-400 border-red-500/20', scheduled: 'bg-blue-500/10 ${T.accentText} border-blue-500/20', paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', overdue: 'bg-red-500/10 text-red-400 border-red-500/20', delinquent: 'bg-red-500/10 text-red-400 border-red-500/20' };
const sc = (v: any) => SC[String(v || '').toLowerCase()] || 'bg-purple-500/10 text-purple-400 border-purple-500/20';
const fk = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
const fmt = (v: any) => v === null || v === undefined ? '-' : String(v);

export default function ${safe}() {
  const [items, setItems] = useState<any[]>(DATA);
  const [view, setView] = useState('month');
  const [cur, setCur] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [sel, setSel] = useState<any|null>(null);

  const y = cur.getFullYear(), mo = cur.getMonth();
  
  const save = () => {
    if (form.id) setItems(it => it.map(i => i.id === form.id ? { ...i, ...form } : i));
    else setItems(it => [...it, { ...form, id: Date.now() }]);
    setShowForm(false); setForm(EMPTY);
  };

  const nav = (d: number) => {
    const n = new Date(cur);
    if (view === 'month') n.setMonth(mo + d);
    else if (view === 'week') n.setDate(cur.getDate() + d * 7);
    else n.setDate(cur.getDate() + d);
    setCur(n);
  };

  const evOn = (d: Date) => items.filter(r => {
    try { return new Date(r[DF]).toDateString() === d.toDateString(); }
    catch { return false; }
  });

  const fd = new Date(y, mo, 1).getDay();
  const dim = new Date(y, mo + 1, 0).getDate();
  const cells = [...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => new Date(y, mo, i + 1))];
  
  const ws = new Date(cur); ws.setDate(cur.getDate() - cur.getDay());
  const wk = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });

  const hdr = view === 'month' ? MO[mo] + ' ' + y : view === 'week' ? 'Week of ' + wk[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : cur.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col h-full ${T.bg} ${T.textNormal} font-sans">
      <div className="px-8 py-6 ${T.cardBg} border-b ${T.border} flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <div className="text-3xl font-black ${T.textMain} tracking-tight">{hdr}</div>
          <div className="flex items-center ${T.inputBg} rounded-2xl border ${T.border} p-1.5 shadow-inner">
            <button onClick={() => nav(-1)} className="p-2 ${T.hoverBg} ${T.textMuted} hover:${T.textMain} rounded-xl transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={() => setCur(new Date())} className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-300 hover:${T.textMain} transition-colors">Today</button>
            <button onClick={() => nav(1)} className="p-2 ${T.hoverBg} ${T.textMuted} hover:${T.textMain} rounded-xl transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center ${T.inputBg} rounded-2xl border ${T.border} p-1.5 shadow-inner">
            {['month', 'week', 'day'].map(v => (
              <button 
                key={v} 
                onClick={() => setView(v)} 
                className={"px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all " + (view === v ? "bg-[#1E293B] ${T.textMain} shadow-md" : "${T.textSub} hover:text-slate-300")}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 ${T.accentBg} ${T.accentHover} ${T.textMain} text-sm font-black uppercase tracking-wider rounded-2xl shadow-lg ${T.shadow} transition-all">
            <Plus size={16} strokeWidth={3} /> New Event
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6 md:p-8 ${T.bg}">
        {view === 'month' && (
          <div className="${T.cardBg} border ${T.border} rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="grid grid-cols-7 border-b ${T.border} ${T.navBg}">
              {WD.map(d => <div key={d} className="py-4 text-center text-[10px] font-black ${T.textSub} uppercase tracking-widest">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 auto-rows-[minmax(140px,auto)] bg-[#1E293B] gap-px">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="${T.navBg}"></div>;
                const isT = d.toDateString() === new Date().toDateString();
                const evs = evOn(d);
                return (
                  <div key={i} className={"p-3 min-h-[140px] transition-colors hover:${T.inputBg} " + (isT ? "${T.cardBg}" : "${T.cardBg}")}>
                    <div className={"w-8 h-8 flex items-center justify-center rounded-2xl text-sm font-black mb-3 " + (isT ? "${T.accentBg} ${T.textMain} shadow-lg shadow-blue-500/20" : "${T.textMuted}")}>
                      {d.getDate()}
                    </div>
                    <div className="flex flex-col gap-2">
                      {evs.map(e => (
                        <div key={e.id} onClick={() => setSel(e)} className="px-3 py-2 ${T.inputBg} border ${T.border} rounded-xl text-xs font-bold text-slate-300 truncate cursor-pointer hover:border-blue-500 hover:${T.textMain} transition-all shadow-sm">
                          {fmt(e[PF])}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="${T.cardBg} border ${T.border} rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-8 border-b ${T.border} relative ${T.navBg}">
              <button onClick={() => setSel(null)} className="absolute top-6 right-6 p-2 ${T.textSub} hover:${T.textMain} rounded-xl ${T.hoverBg} transition-colors"><X size={18} /></button>
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 ${T.accentText} shadow-lg shadow-blue-500/10">
                <Calendar size={28} />
              </div>
              <h3 className="text-2xl font-black ${T.textMain} mb-2 tracking-tight">{fmt(sel[PF])}</h3>
              <p className="text-[11px] font-bold uppercase tracking-widest ${T.textSub}">{new Date(sel[DF]).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="p-8 space-y-6">
              {Object.entries(sel).filter(([k]) => k !== 'id' && k !== PF && k !== DF).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold ${T.textSub} uppercase tracking-widest">{fk(k)}</span>
                  {k === SF ? (
                    <div><span className={"inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border " + sc(v)}>{fmt(v)}</span></div>
                  ) : (
                    <span className="text-sm font-semibold ${T.textNormal}">{fmt(v)}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 border-t ${T.border} ${T.navBg} flex gap-3">
              <button onClick={() => { setForm(sel); setShowForm(true); setSel(null); }} className="flex-1 flex justify-center items-center gap-2 py-3 ${T.inputBg} ${T.hoverBg} border ${T.border} ${T.textMain} text-sm font-bold rounded-2xl transition-colors"><Edit2 size={16} /> Edit Event</button>
              <button onClick={() => { setItems(it => it.filter(i => i.id !== sel.id)); setSel(null); }} className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-2xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="${T.cardBg} border ${T.border} rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black ${T.textMain} tracking-tight">{form.id ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 ${T.textMuted} hover:${T.textMain} rounded-xl ${T.hoverBg} transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {FF.map((f: any) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold ${T.textMuted} uppercase tracking-widest mb-2">{fk(f.key)}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors">
                      {(f.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} rows={3} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                  ) : (
                    <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-4 py-3.5 ${T.inputBg} border ${T.border} rounded-2xl ${T.textNormal} text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t ${T.border}">
              <button onClick={() => setShowForm(false)} className="px-6 py-3 text-sm font-bold ${T.textMuted} hover:${T.textMain} transition-colors">Cancel</button>
              <button onClick={save} className="px-6 py-3 ${T.accentBg} ${T.accentHover} ${T.textMain} text-sm font-bold rounded-2xl shadow-lg ${T.shadow} transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
}
