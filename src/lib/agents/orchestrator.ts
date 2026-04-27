/**
 * ΓòöΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòù
 * Γòæ  SUPER AGENT ORCHESTRATOR                                            Γòæ
 * Γòæ  Coordinates all agents through the full build pipeline:            Γòæ
 * Γòæ                                                                      Γòæ
 * Γòæ  [SkeletonAgent] ΓåÆ [PageAgent] ΓåÆ [FileInjector] ΓåÆ [SanitizerAgent] Γòæ
 * Γòæ       ΓåÆ [BuildAgent] ΓåÆ [Deploy] ΓåÆ Live App with Error Boundaries    Γòæ
 * ΓòÜΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓò¥
 */

import { runSkeletonAgent } from './skeletonAgent'
import { runPageAgent } from './pageAgent'
import { runSuperAgent } from './superAgent'
import { sanitizeFileContent, detectCorruption, generateSafeStub } from './sanitizerAgent'
import { runBuildAgent } from './buildAgent'

export type AgentName = 'skeleton' | 'pages' | 'sanitizer' | 'injector' | 'build'
export type AgentStatus = 'idle' | 'running' | 'done' | 'repaired' | 'error'

export interface AgentState {
  name: AgentName
  label: string
  status: AgentStatus
  message: string
  repairs: string[]
}

export interface OrchestratorResult {
  url: string | null
  state: 'READY' | 'ERROR'
  agents: AgentState[]
  totalRepairs: number
}

export type StatusCallback = (stage: string, message: string, pct: number) => void
export type AgentCallback = (agents: AgentState[]) => void

// ΓöÇΓöÇ Generate the injected boilerplate files ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function generateInjectedFiles(
  projectName: string,
  pages: { path: string; name: string; route: string }[]
): { path: string; content: string }[] {
  const folderName = projectName.replace(/\s+/g, '-').toLowerCase()
  const getIcon = (n: string) => n.includes('dashboard')?'📊':n.includes('appointment')||n.includes('booking')?'📅':n.includes('customer')||n.includes('client')||n.includes('bride')?'👤':n.includes('sale')||n.includes('pos')?'💰':n.includes('gown')||n.includes('inventory')?'📦':n.includes('alteration')?'✂':n.includes('pickup')?'🚚':n.includes('vendor')||n.includes('order')?'🏪':n.includes('invoice')||n.includes('payment')||n.includes('layaway')?'🧾':n.includes('staff')||n.includes('employee')?'👥':n.includes('payroll')||n.includes('commission')?'💵':n.includes('schedule')||n.includes('shift')?'🕐':n.includes('report')||n.includes('analytic')?'📈':n.includes('setting')?'⚙':'📄'
  const navLinks = pages.map(p => `  { path: '${p.route}', label: '${p.name}', icon: '${getIcon(p.name.toLowerCase())}' }`).join(',\n')
  const pageImports = pages.map((p, i) => `import Page${i} from './${p.path.replace(/^src\//, '').replace(/\.tsx$/, '')}';`).join('\n')
  const firstRoute = pages[0]?.route ?? '/dashboard'
  const pageRoutes = [
    ...pages.map((p, i) =>
      `          <Route path="${p.route}" element={<ErrorBoundary name="${p.name}"><Page${i} /></ErrorBoundary>} />`
    ),
    `          <Route index element={<Navigate to="${firstRoute}" replace />} />`,
    `          <Route path="*" element={<Navigate to="${firstRoute}" replace />} />`,
  ].join('\n')

  const appTsx = `import React, { Component, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
${pageImports}

class ErrorBoundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  constructor(props: { name: string; children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '32px', color: '#ef4444' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Error in {this.props.name}</h2>
          <pre style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
${pageRoutes}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}`

  const layoutTsx = `import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const ALL_PAGES = [
${navLinks}
];

// Categorize pages into sidebar groups based on their names
function categorize(pages) {
  const ops = [], inv = [], fin = [], staff = [], insights = [];
  for (const p of pages) {
    const n = (p.label || '').toLowerCase();
    if (n.includes('dashboard') || n.includes('appointment') || n.includes('booking') || n.includes('customer') || n.includes('client') || n.includes('sale') || n.includes('pos') || n.includes('bride') || n.includes('transaction')) ops.push(p);
    else if (n.includes('gown') || n.includes('inventory') || n.includes('product') || n.includes('alteration') || n.includes('pickup') || n.includes('vendor') || n.includes('order') || n.includes('merchandise') || n.includes('stock')) inv.push(p);
    else if (n.includes('invoice') || n.includes('layaway') || n.includes('payment') || n.includes('finance') || n.includes('billing') || n.includes('receivable') || n.includes('installment')) fin.push(p);
    else if (n.includes('staff') || n.includes('employee') || n.includes('payroll') || n.includes('schedule') || n.includes('commission') || n.includes('team') || n.includes('hr')) staff.push(p);
    else insights.push(p);
  }
  return [
    { group: 'Operations', items: ops },
    { group: 'Inventory', items: inv },
    { group: 'Finance', items: fin },
    { group: 'Staff', items: staff },
    { group: 'Insights', items: insights },
  ].filter(g => g.items.length > 0);
}

const NAV_GROUPS = categorize(ALL_PAGES);

// Match any nav item path against current route
const navItems = NAV_GROUPS.flatMap(g => g.items);

const Layout: React.FC = () => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);

  const today = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const clock = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#0d1117', color:'#e2e8f0', fontFamily:"'Inter', system-ui, -apple-system, sans-serif", overflow:'hidden' }}>

      {/* ΓöÇΓöÇ Top Header Bar ΓöÇΓöÇ */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'48px', background:'#161b26', borderBottom:'1px solid #21283a', padding:'0 20px', flexShrink:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ fontWeight:800, fontSize:'15px', color:'#a855f7', letterSpacing:'-0.3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'200px' }}>${projectName}</span>
          <span style={{ width:'1px', height:'20px', background:'#21283a' }} />
          <span style={{ fontSize:'12px', color:'#64748b', fontWeight:500 }}>Back Office</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ fontSize:'12px', color:'#94a3b8' }}>{today}</span>
          <span style={{ fontSize:'12px', color:'#64748b', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{clock}</span>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', borderLeft:'1px solid #21283a', paddingLeft:'16px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'white' }}>M</div>
            <span style={{ fontSize:'12px', color:'#94a3b8' }}>Manager</span>
          </div>
        </div>
      </header>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* ΓöÇΓöÇ Sidebar ΓöÇΓöÇ */}
        <aside style={{ width:'196px', background:'#161b26', borderRight:'1px solid #21283a', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto', overflowX:'hidden' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.group} style={{ marginBottom:'4px' }}>
              <div style={{ padding:'10px 14px 4px', fontSize:'10px', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>{group.group}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:'9px',
                    padding:'7px 12px', margin:'1px 6px', borderRadius:'6px',
                    textDecoration:'none', fontSize:'13px', fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : '#94a3b8',
                    background: isActive ? '#7c3aed' : 'transparent',
                    transition:'all 0.12s',
                  })}
                  onMouseEnter={e => { if (!(e.currentTarget as any)._active) (e.currentTarget as HTMLElement).style.background = '#1e293b'; }}
                  onMouseLeave={e => { if (!(e.currentTarget as any)._active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize:'14px', lineHeight:1, flexShrink:0 }}>{item.icon}</span>
                  <span style={{ truncate:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </aside>

        {/* ΓöÇΓöÇ Main Content ΓöÇΓöÇ */}
        <main style={{ flex:1, overflow:'auto', background:'#0d1117', display:'flex', flexDirection:'column' }}>
          {/* Sub-header breadcrumb bar */}
          <div style={{ height:'38px', background:'#111827', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', padding:'0 20px', flexShrink:0 }}>
            <span style={{ fontSize:'12px', color:'#475569' }}>
              {navItems.find(n => n.path !== '/' && location.pathname.startsWith(n.path))?.label
                ?? navItems.find(n => n.path === '/')?.label ?? 'Dashboard'}
            </span>
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* ΓöÇΓöÇ Status Bar ΓöÇΓöÇ */}
      <div style={{ height:'24px', background:'#161b26', borderTop:'1px solid #21283a', display:'flex', alignItems:'center', padding:'0 16px', gap:'24px', flexShrink:0 }}>
        <span style={{ fontSize:'11px', color:'#22c55e', display:'flex', alignItems:'center', gap:'5px' }}><span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />Online</span>
        <span style={{ fontSize:'11px', color:'#475569' }}>v1.0.0</span>
        <span style={{ fontSize:'11px', color:'#475569', marginLeft:'auto' }}>${projectName} POS &amp; Back Office</span>
      </div>
    </div>
  );
};

export default Layout;`

  const mainTsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`

  const viteConfig = `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()] })`
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */\nexport default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [] }`
  const postcssConfig = `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`
  const indexCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n*, *::before, *::after { box-sizing: border-box; }\nhtml, body, #root { height: 100%; margin: 0; padding: 0; background: #0d1117; color: #e2e8f0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }\n::-webkit-scrollbar { width: 6px; height: 6px; }\n::-webkit-scrollbar-track { background: #0d1117; }\n::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }\n::-webkit-scrollbar-thumb:hover { background: #475569; }`
  const indexHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${projectName}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`
  const vercelJson = JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/index.html' }] }, null, 2)
  const packageJson = JSON.stringify({
    name: folderName, private: true, version: '0.0.0', type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: {
      react: '^18.2.0', 'react-dom': '^18.2.0', 'react-router-dom': '^6.22.0',
      'lucide-react': '^0.344.0', zustand: '^4.5.0', clsx: '^2.1.0',
      'tailwind-merge': '^2.2.1', 'date-fns': '^3.3.1', recharts: '^2.12.0',
      'react-hook-form': '^7.51.0', '@headlessui/react': '^2.0.0',
      '@heroicons/react': '^2.1.1', 'react-big-calendar': '^1.11.3', moment: '^2.30.1'
    },
    devDependencies: {
      '@types/react': '^18.2.55', '@types/react-dom': '^18.2.19',
      '@vitejs/plugin-react': '^4.2.1', autoprefixer: '^10.4.17',
      postcss: '^8.4.35', tailwindcss: '^3.4.1', typescript: '^5.3.3', vite: '^5.1.0'
    }
  }, null, 2)

  const tsconfigJson = JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }]
  }, null, 2)

  const tsconfigNodeJson = JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
      strict: false
    },
    include: ['vite.config.ts']
  }, null, 2)

  return [
    { path: 'src/App.tsx', content: appTsx },
    { path: 'src/components/Layout.tsx', content: layoutTsx },
    { path: 'src/main.tsx', content: mainTsx },
    { path: 'vite.config.ts', content: viteConfig },
    { path: 'tailwind.config.js', content: tailwindConfig },
    { path: 'postcss.config.js', content: postcssConfig },
    { path: 'src/index.css', content: indexCss },
    { path: 'index.html', content: indexHtml },
    { path: 'vercel.json', content: vercelJson },
    { path: 'package.json', content: packageJson },
    { path: 'tsconfig.json', content: tsconfigJson },
    { path: 'tsconfig.node.json', content: tsconfigNodeJson },
  ]
}

// ΓöÇΓöÇ File merge: agent files override AI files ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function mergeFiles(
  aiFiles: { path: string; content: string }[],
  injectedFiles: { path: string; content: string }[],
  pageFiles: { path: string; content: string }[]
): { path: string; content: string }[] {
  const map = new Map<string, string>()
  // AI files as base
  for (const f of aiFiles) map.set(f.path, f.content)
  // Page files override
  for (const f of pageFiles) map.set(f.path, f.content)
  // Injected infrastructure always wins
  for (const f of injectedFiles) map.set(f.path, f.content)
  return [...map.entries()].map(([path, content]) => ({ path, content }))
}

// ΓöÇΓöÇ Main Orchestrator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function runOrchestrator(
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: StatusCallback,
  onAgents: AgentCallback
): Promise<OrchestratorResult> {
  const agents: AgentState[] = [
    { name: 'skeleton', label: 'Skeleton Agent', status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'pages',    label: 'Page Agent',     status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'injector', label: 'File Injector',  status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'sanitizer',label: 'Sanitizer Agent',status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'build',    label: 'Build Agent',    status: 'idle', message: 'Waiting...', repairs: [] },
  ]
  const emit = () => onAgents([...agents])
  const setAgent = (name: AgentName, updates: Partial<AgentState>) => {
    const idx = agents.findIndex(a => a.name === name)
    if (idx >= 0) { agents[idx] = { ...agents[idx], ...updates }; emit() }
  }

  // ΓöÇΓöÇ AGENT 1: Skeleton ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setAgent('skeleton', { status: 'running', message: 'Generating app structure...' })
  onStatus('skeleton', 'Generating app structure...', 10)
  let skeleton
  try {
    skeleton = await runSkeletonAgent(spec, projectName, (msg) => {
      setAgent('skeleton', { message: msg })
      onStatus('skeleton', msg, 15)
    })
    setAgent('skeleton', { status: 'done', message: `${skeleton.pages.length} pages planned` })
    onStatus('skeleton', `${skeleton.pages.length} pages planned`, 20)
  } catch (e: any) {
    setAgent('skeleton', { status: 'error', message: e.message })
    return { url: null, state: 'ERROR', agents, totalRepairs: 0 }
  }

  // ΓöÇΓöÇ AGENT 2: Pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setAgent('pages', { status: 'running', message: `Generating ${skeleton.pages.length} pages...` })
  onStatus('pages', `Generating ${skeleton.pages.length} pages in parallel...`, 25)
  let pageFiles: { path: string; content: string }[] = []
  try {
    pageFiles = await runPageAgent(skeleton.pages, spec, projectName, (msg) => {
      setAgent('pages', { message: msg })
      onStatus('pages', msg, 60)
    })
    const stubCount = pageFiles.filter(f => f.content.includes('Record A')).length
    setAgent('pages', {
      status: stubCount > 0 ? 'repaired' : 'done',
      message: `${pageFiles.length - stubCount} full pages, ${stubCount} stubs`,
      repairs: stubCount > 0 ? [`${stubCount} pages used safe stubs`] : []
    })
    onStatus('pages', `${pageFiles.length} pages generated`, 65)
  } catch (e: any) {
    setAgent('pages', { status: 'error', message: e.message })
    // Don't abort ΓÇö use stubs for all pages
    pageFiles = skeleton.pages.map(p => ({
      path: p.path,
      content: generateSafeStub(p.name, p.route)
    }))
  }

  // ΓöÇΓöÇ AGENT 3: File Injector ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setAgent('injector', { status: 'running', message: 'Injecting infrastructure files...' })
  onStatus('injector', 'Injecting App.tsx, Layout, package.json...', 70)
  const injectedFiles = generateInjectedFiles(projectName, skeleton.pages)
  const mergedFiles = mergeFiles(skeleton.files, injectedFiles, pageFiles)
  setAgent('injector', { status: 'done', message: `${mergedFiles.length} total files ready` })
  onStatus('injector', `${mergedFiles.length} files ready`, 75)

  // ΓöÇΓöÇ AGENT 4: Sanitizer + Pre-flight Validator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setAgent('sanitizer', { status: 'running', message: 'Sanitizing all files...' })
  onStatus('sanitizer', 'Sanitizing imports, icons, stubs, and syntax...', 78)
  const sanitizerRepairs: string[] = []

  // Pass 1: sanitize imports/icons/stubs
  let sanitized = mergedFiles.map(file => {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) return file
    const cleaned = sanitizeFileContent(file.path, file.content)
    return { path: file.path, content: cleaned }
  })

  // Pass 2: pre-flight corruption check on ALL tsx/ts files
  sanitized = sanitized.map(file => {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) return file
    // Skip infrastructure files
    if (file.path.includes('config') || file.path.includes('tsconfig') ||
        file.path.endsWith('main.tsx') || file.path.endsWith('App.tsx') ||
        file.path.includes('Layout')) return file

    const { broken, reason } = detectCorruption(file.content)
    if (broken) {
      sanitizerRepairs.push(`${file.path.split('/').pop()}: ${reason}`)
      const pageName = file.path.split('/').pop()?.replace(/\.(tsx|ts)$/, '') || 'Page'
      const route = skeleton.pages.find(p => p.path === file.path)?.route || '/'
      return { path: file.path, content: generateSafeStub(pageName, route) }
    }
    return file
  })

  setAgent('sanitizer', {
    status: sanitizerRepairs.length > 0 ? 'repaired' : 'done',
    message: sanitizerRepairs.length > 0
      ? `${sanitizerRepairs.length} files auto-fixed before deploy`
      : 'All files passed pre-flight checks',
    repairs: sanitizerRepairs
  })
  onStatus('sanitizer', 'Pre-flight validation complete', 82)

  // ΓöÇΓöÇ AGENT 5: SuperAgent Validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setAgent('superAgent' as any, { status: 'running', message: 'SuperAgent validating all files...' })
  const { files: validatedFiles, result: superResult } = await runSuperAgent(
    sanitized,
    (msg) => onStatus('superAgent', msg, 84)
  )
  setAgent('superAgent' as any, {
    status: superResult.passed ? 'done' : 'repaired',
    message: superResult.summary,
    repairs: superResult.errors.map(e => `${e.file.split('/').pop()}: ${e.issue}`)
  })
  onStatus('superAgent', superResult.summary, 86)

  // ΓöÇΓöÇ AGENT 6: Build ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setAgent('build', { status: 'running', message: 'Deploying to Vercel...' })
  onStatus('build', 'Self-healing deploy starting...', 88)
  const buildResult = await runBuildAgent(projectName, validatedFiles, (msg) => {
    setAgent('build', { message: msg })
    onStatus('build', msg, 90)
  })

  setAgent('build', {
    status: buildResult.state === 'READY' ? 'done' : 'error',
    message: buildResult.state === 'READY'
      ? `Live at ${buildResult.url}`
      : buildResult.errorMessage || 'Deploy failed',
    repairs: buildResult.repairs
  })

  const totalRepairs =
    (agents.find(a => a.name === 'pages')?.repairs.length || 0) +
    sanitizerRepairs.length +
    buildResult.repairs.length

  onStatus('build', buildResult.state === 'READY' ? 'Deployed!' : 'Failed', 100)

  return {
    url: buildResult.url,
    state: buildResult.state === 'READY' ? 'READY' : 'ERROR',
    agents,
    totalRepairs
  }
}
