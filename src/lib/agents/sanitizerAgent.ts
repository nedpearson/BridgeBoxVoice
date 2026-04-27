/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  SANITIZER AGENT — Shared code sanitization pipeline     ║
 * ║  Used by both the main build AND the self-healing agent  ║
 * ╚══════════════════════════════════════════════════════════╝
 */

export interface SanitizeOptions {
  filePath: string
  content: string
  projectName?: string
}

// ── Icon allowlist (lucide-react v0.344) ─────────────────────────────────────
const VALID_LUCIDE_ICONS = new Set([
  'Activity','AlertCircle','AlertTriangle','Archive','ArrowDown','ArrowLeft','ArrowRight','ArrowUp',
  'Award','BarChart','BarChart2','Bell','BellOff','BookOpen','Bookmark','Box','Briefcase',
  'Building','Building2','Calendar','Camera','ChevronDown','ChevronLeft','ChevronRight','ChevronUp',
  'Check','CheckCircle','CheckSquare','Circle','Clock','Cloud','Code','Cog','Copy',
  'CreditCard','Database','DollarSign','Download','Edit','Edit2','Edit3','ExternalLink',
  'Eye','EyeOff','File','FileText','Filter','Flag','Folder','Globe','Grid',
  'Hash','Heart','HelpCircle','Home','Image','Inbox','Info','Key','Layout',
  'Link','List','Lock','LogIn','LogOut','Mail','Map','MapPin','Menu',
  'MessageCircle','MessageSquare','Minus','Monitor','Moon','MoreHorizontal','MoreVertical',
  'Package','Paperclip','Pause','Percent','Phone','PieChart','Play','Plus','PlusCircle','Power',
  'Printer','Receipt','RefreshCw','Save','Search','Send','Settings','Share','Shield','ShoppingCart','Star',
  'Store','Sun','Table','Tag','Trash','Trash2','TrendingDown','TrendingUp','Type','Upload',
  'User','UserCheck','UserMinus','UserPlus','Users','Video','Wallet','X','XCircle','ZoomIn','ZoomOut'
])

// ── Approved npm packages ─────────────────────────────────────────────────────
const APPROVED_PACKAGES = new Set([
  'react','react-dom','react-dom/client','react-router-dom',
  'lucide-react','zustand','clsx','tailwind-merge',
  'date-fns','recharts','react-hook-form',
  '@headlessui/react','@heroicons/react',
  'react-big-calendar','moment',
  'react/jsx-runtime','react/jsx-dev-runtime',
])

function isApprovedPackage(src: string): boolean {
  if (src.startsWith('.') || src.startsWith('/')) return true
  if (APPROVED_PACKAGES.has(src)) return true
  for (const pkg of APPROVED_PACKAGES) if (src.startsWith(pkg + '/')) return true
  return false
}

// ── UI Component Stubs (inline definitions for commonly hallucinated components)
const UI_STUBS: Record<string, string> = {
  Button: `const Button=({onClick,children,className='',variant='primary',type='button',...r}:any)=>{const v:any={primary:'bg-purple-600 hover:bg-purple-700 text-white',secondary:'bg-gray-700 hover:bg-gray-600 text-white',danger:'bg-red-600 hover:bg-red-700 text-white',ghost:'text-gray-300 hover:text-white hover:bg-gray-700',outline:'border border-gray-600 text-gray-300 hover:bg-gray-700'};return <button type={type} onClick={onClick} className={'px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none '+(v[variant]||v.primary)+' '+className} {...r}>{children}</button>;};`,
  Modal: `const Modal=({open,onClose,title,children}:any)=>!open?null:(<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/60" onClick={onClose}/><div className="relative bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">{title&&<h2 className="text-lg font-bold text-white mb-4">{title}</h2>}{children}</div></div>);`,
  Dialog: `const Dialog=({open,onClose,title,children}:any)=>!open?null:(<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/60" onClick={onClose}/><div className="relative bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">{title&&<h2 className="text-lg font-bold text-white mb-4">{title}</h2>}{children}</div></div>);`,
  Card: `const Card=({children,className=''}:any)=><div className={'bg-gray-800 rounded-xl p-6 '+className}>{children}</div>;`,
  Badge: `const Badge=({children,color='purple'}:any)=>{const c:any={purple:'bg-purple-500/20 text-purple-300',green:'bg-emerald-500/20 text-emerald-300',red:'bg-red-500/20 text-red-300',yellow:'bg-yellow-500/20 text-yellow-300',blue:'bg-blue-500/20 text-blue-300',gray:'bg-gray-500/20 text-gray-300'};return <span className={'px-2 py-1 rounded-full text-xs font-medium '+(c[color]||c.purple)}>{children}</span>;};`,
  Input: `const Input=({label,value,onChange,placeholder='',type='text',className=''}:any)=>(<div className="flex flex-col gap-1">{label&&<label className="text-sm text-gray-400">{label}</label>}<input type={type} value={value??''} onChange={onChange} placeholder={placeholder} className={'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 '+className}/></div>);`,
  Textarea: `const Textarea=({label,value,onChange,placeholder='',rows=3,className=''}:any)=>(<div className="flex flex-col gap-1">{label&&<label className="text-sm text-gray-400">{label}</label>}<textarea value={value??''} onChange={onChange} placeholder={placeholder} rows={rows} className={'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none '+className}/></div>);`,
  Select: `const Select=({label,value,onChange,options=[],className=''}:any)=>(<div className="flex flex-col gap-1">{label&&<label className="text-sm text-gray-400">{label}</label>}<select value={value??''} onChange={onChange} className={'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 '+className}>{(options as any[]).map((o:any)=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select></div>);`,
  Table: `const Table=({columns=[],data=[],onRowClick}:any)=>(<div className="bg-gray-800 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-700/60"><tr>{(columns as any[]).map((c:any)=><th key={c.key||c} className="text-left py-3 px-4 text-gray-400 font-medium">{c.label||c}</th>)}</tr></thead><tbody>{(data as any[]).map((row:any,i:number)=><tr key={i} onClick={()=>onRowClick?.(row)} className={'border-t border-gray-700 '+(onRowClick?'hover:bg-gray-700/50 cursor-pointer ':'')}>{(columns as any[]).map((c:any)=><td key={c.key||c} className="py-3 px-4 text-gray-300">{row[c.key||c]}</td>)}</tr>)}</tbody></table></div>);`,
  Spinner: `const Spinner=({size=5}:any)=><div style={{width:size*4+'px',height:size*4+'px'}} className="border-2 border-purple-400 border-t-transparent rounded-full animate-spin"/>;`,
  Avatar: `const Avatar=({name='?'}:any)=><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">{String(name||'?')[0]?.toUpperCase()}</div>;`,
  Checkbox: `const Checkbox=({checked,onChange,label}:any)=>(<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!checked} onChange={onChange} className="w-4 h-4 rounded accent-purple-500"/>{label&&<span className="text-sm text-gray-300">{label}</span>}</label>);`,
  Switch: `const Switch=({checked,onChange,label}:any)=>(<label className="flex items-center gap-2 cursor-pointer"><div onClick={()=>onChange?.(!checked)} className={'relative w-10 h-6 rounded-full transition-colors '+(checked?'bg-purple-600':'bg-gray-600')}><div className={'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform '+(checked?'translate-x-4':'')}/></div>{label&&<span className="text-sm text-gray-300">{label}</span>}</label>);`,
  Dropdown: `const Dropdown=({label,items=[],onSelect}:any)=>{const[open,setOpen]=React.useState(false);return(<div className="relative"><button onClick={()=>setOpen(!open)} className="px-3 py-2 bg-gray-700 rounded-lg text-sm text-white flex items-center gap-2">{label}<span>{open?'▲':'▼'}</span></button>{open&&<div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 min-w-[140px]">{(items as any[]).map((item:any,i:number)=><button key={i} onClick={()=>{onSelect?.(item);setOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">{item.label||item}</button>)}</div>}</div>);};`,
}

// ── Syntax corruption detector ────────────────────────────────────────────────
export function detectCorruption(content: string): { broken: boolean; reason: string } {
  // Truncation markers
  if (content.includes('... +') || content.includes('**import*') || content.includes('// rest of'))
    return { broken: true, reason: 'truncation marker detected' }
  if (/^\s*\.\.\.\s*[^{[(]/m.test(content))
    return { broken: true, reason: 'dangling spread operator' }

  // Data corruption
  if (/:\s*\d+\s+[a-z]{2,}/i.test(content) && /value|price|amount|total|count/i.test(content))
    return { broken: true, reason: 'numeric data corruption' }

  // Broken JSX
  if (/<[a-zA-Z][^>]{0,200}[^=!<>"'\s]\)\s*>/m.test(content))
    return { broken: true, reason: 'broken JSX attribute with dangling )' }

  // File too short
  if (content.trim().length < 50)
    return { broken: true, reason: 'file too short (likely truncated)' }

  // Unbalanced braces
  const opens = (content.match(/\{/g) || []).length
  const closes = (content.match(/\}/g) || []).length
  if (Math.abs(opens - closes) > 10)
    return { broken: true, reason: `unbalanced braces (${opens} open, ${closes} close)` }

  // Unbalanced parens (catches missing opening paren bugs like the ico() issue)
  const parensOpen = (content.match(/\(/g) || []).length
  const parensClose = (content.match(/\)/g) || []).length
  if (Math.abs(parensOpen - parensClose) > 5)
    return { broken: true, reason: `unbalanced parentheses (${parensOpen} open, ${parensClose} close)` }

  // Unbalanced brackets
  const brackOpen = (content.match(/\[/g) || []).length
  const brackClose = (content.match(/\]/g) || []).length
  if (Math.abs(brackOpen - brackClose) > 5)
    return { broken: true, reason: `unbalanced brackets (${brackOpen} open, ${brackClose} close)` }

  // Unclosed template literals (odd number of backticks outside strings is a red flag)
  const backticks = (content.match(/`/g) || []).length
  if (backticks % 2 !== 0)
    return { broken: true, reason: 'unclosed template literal (odd number of backticks)' }

  // Duplicate export default
  const exportDefaults = (content.match(/\bexport\s+default\s+/g) || []).length
  if (exportDefaults > 1)
    return { broken: true, reason: `multiple export default declarations (${exportDefaults})` }

  // Missing default export
  const hasDefaultExport = /export\s+default\s+(function|class|const|\w)/.test(content)
  if (!hasDefaultExport && content.length > 100)
    return { broken: true, reason: 'no default export found' }

  // ANSI escape codes leaked into source (build log contamination)
  if (/\x1b\[\d+m/.test(content) || /\[3[12]m/.test(content))
    return { broken: true, reason: 'ANSI escape codes detected in source (log contamination)' }

  return { broken: false, reason: '' }
}

// ── Main sanitizer ────────────────────────────────────────────────────────────
export function sanitizeFileContent(filePath: string, content: string): string {
  if (filePath.includes('config') || filePath.includes('tsconfig') ||
      filePath.includes('store/') || filePath.endsWith('main.tsx') ||
      filePath.endsWith('App.tsx') || filePath.includes('Layout')) {
    return content
  }

  // 1. Strip unapproved imports
  content = content.split('\n').filter(line => {
    const m = line.match(/^\s*import\s+.*?from\s+['"]([^'"]+)['"]/)
    if (m && !isApprovedPackage(m[1])) return false
    const m2 = line.match(/^\s*import\s+['"]([^'"]+)['"]/)
    if (m2 && !isApprovedPackage(m2[1])) return false
    return true
  }).join('\n')

  // 2. Strip require() and dynamic import() of unapproved packages
  content = content.replace(/const\s+\w+\s*=\s*require\(['"][^'"]+['"]\);?\n?/g, '')
  content = content.replace(/import\(['"][^.][^'"]*['"]\)/g, 'Promise.resolve({})')

  // 3. Sanitize lucide-react icon names
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g,
    (_m, iconList: string) => {
      const requested = iconList.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim())
      const removed = requested.filter(n => n && !VALID_LUCIDE_ICONS.has(n))
      const valid = requested.filter(n => VALID_LUCIDE_ICONS.has(n))
      if (valid.length === 0) valid.push('BarChart2')
      // Replace removed icon usages in JSX with BarChart2
      for (const bad of removed) {
        if (!bad) continue
        content = content.replace(new RegExp(`<${bad}(\\s[^>]*)?\\s*/>`, 'g'), '<BarChart2 />')
        content = content.replace(new RegExp(`<${bad}(\\s[^>]*)?>`, 'g'), '<BarChart2>')
      }
      const uniqueValid = [...new Set([...valid, 'BarChart2'])]
      return `import { ${uniqueValid.join(', ')} } from 'lucide-react'`
    }
  )

  // 4. Inject UI component stubs for any used-but-undefined components
  const stubsNeeded: string[] = []
  for (const [name, stub] of Object.entries(UI_STUBS)) {
    const usedAsJSX = new RegExp(`<${name}[\\s/>]`).test(content)
    const alreadyDefined = new RegExp(`(const|function|class)\\s+${name}\\s*[=(]`).test(content)
    if (usedAsJSX && !alreadyDefined) stubsNeeded.push(stub)
  }
  if (stubsNeeded.length > 0) {
    const lastImport = [...content.matchAll(/^import\s+.+$/gm)].pop()
    if (lastImport && lastImport.index !== undefined) {
      const at = lastImport.index + lastImport[0].length
      content = content.slice(0, at) + '\n\n' + stubsNeeded.join('\n') + '\n' + content.slice(at)
    } else {
      content = stubsNeeded.join('\n') + '\n' + content
    }
  }

  return content
}

// ── Generate a guaranteed-safe stub for any page ──────────────────────────────
export function generateSafeStub(pageName: string, _route: string): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const MOCK_ITEMS = [
    `{ id: 1, name: 'Record A', status: 'Active', date: '2024-01-15', value: '$1,200' }`,
    `{ id: 2, name: 'Record B', status: 'Pending', date: '2024-01-18', value: '$850' }`,
    `{ id: 3, name: 'Record C', status: 'Complete', date: '2024-01-20', value: '$2,100' }`,
    `{ id: 4, name: 'Record D', status: 'Active', date: '2024-01-22', value: '$650' }`,
    `{ id: 5, name: 'Record E', status: 'Pending', date: '2024-01-25', value: '$3,400' }`,
  ]
  return `import React, { useState } from 'react';
import { BarChart2, Plus, Search, RefreshCw } from 'lucide-react';

const ITEMS = [
  ${MOCK_ITEMS.join(',\n  ')},
];

type Item = typeof ITEMS[0];

export default function ${safe}() {
  const [items] = useState<Item[]>(ITEMS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.status.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="p-8">
        <button onClick={() => setSelected(null)} className="mb-6 flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
          ← Back to ${pageName}
        </button>
        <div className="bg-gray-800 rounded-xl p-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">{selected.name}</h1>
          <p className="text-gray-400 text-sm mb-6">{selected.date}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Status</div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">{selected.status}</span>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Value</div>
              <div className="text-lg font-bold text-emerald-400">{selected.value}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="text-purple-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">${pageName}</h1>
            <p className="text-gray-400 text-sm">{filtered.length} records</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add New
        </button>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ${pageName.toLowerCase()}..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <button onClick={() => setSearch('')} className="p-2 text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700/60">
            <tr>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 text-white font-medium">{item.name}</td>
                <td className="py-3 px-4 text-gray-400">{item.date}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">{item.status}</span>
                </td>
                <td className="py-3 px-4 text-emerald-400 font-medium">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No records found</div>
        )}
      </div>
    </div>
  );
}`
}
