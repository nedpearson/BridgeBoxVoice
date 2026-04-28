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
  rawPages: { path: string; name: string; route: string }[],
  spec: Record<string, unknown>
): { path: string; content: string }[] {
  const pages = rawPages.map(p => ({ ...p, route: '/' + p.name.toLowerCase().replace(/[^a-z0-9]/g, '-') }))
  const folderName = projectName.replace(/\s+/g, '-').toLowerCase()
  const industry = (spec.industry as string || spec.title as string || '').toLowerCase()
  
  // Theme Generator
  let theme = {
    bg: '#0d1117',
    surface: '#161b26',
    surfaceAlt: '#111827',
    border: '#21283a',
    text: '#e2e8f0',
    textMuted: '#64748b',
    primary: '#7c3aed',
    primaryLight: '#a855f7',
    headerBg: '#161b26',
    sidebarBg: '#161b26',
    cardBg: 'linear-gradient(145deg, #0f1a35, #080d1c)'
  }

  if (industry.includes('bridal') || industry.includes('salon') || industry.includes('spa')) {
    theme = {
      bg: '#fdfbf7',
      surface: '#ffffff',
      surfaceAlt: '#faf9f6',
      border: '#e5e0d8',
      text: '#2d3748',
      textMuted: '#718096',
      primary: '#d53f8c',
      primaryLight: '#ed64a6',
      headerBg: '#ffffff',
      sidebarBg: '#faf9f6',
      cardBg: '#ffffff'
    }
  } else if (industry.includes('law') || industry.includes('legal') || industry.includes('finance') || industry.includes('accounting')) {
    theme = {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceAlt: '#f1f5f9',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b',
      primary: '#0ea5e9',
      primaryLight: '#38bdf8',
      headerBg: '#ffffff',
      sidebarBg: '#0f172a',
      cardBg: '#ffffff'
    }
  } else if (industry.includes('restaurant') || industry.includes('cafe') || industry.includes('food')) {
    theme = {
      bg: '#fffbeb',
      surface: '#ffffff',
      surfaceAlt: '#fef3c7',
      border: '#fde68a',
      text: '#451a03',
      textMuted: '#78350f',
      primary: '#dc2626',
      primaryLight: '#ef4444',
      headerBg: '#ffffff',
      sidebarBg: '#ffffff',
      cardBg: '#ffffff'
    }
  }

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

function categorize(pages: any[]) {
  const ops: any[] = [], inv: any[] = [], fin: any[] = [], staff: any[] = [], insights: any[] = [];
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
const navItems = NAV_GROUPS.flatMap(g => g.items);

const Layout: React.FC = () => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);

  const today = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const clock = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--color-bg)', color:'var(--color-text)', fontFamily:"'Inter', system-ui, -apple-system, sans-serif", overflow:'hidden' }}>

      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'48px', background:'var(--color-header-bg)', borderBottom:'1px solid var(--color-border)', padding:'0 20px', flexShrink:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ fontWeight:800, fontSize:'15px', color:'var(--color-primary-light)', letterSpacing:'-0.3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'200px' }}>${projectName}</span>
          <span style={{ width:'1px', height:'20px', background:'var(--color-border)' }} />
          <span style={{ fontSize:'12px', color:'var(--color-text-muted)', fontWeight:500 }}>Back Office</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>{today}</span>
          <span style={{ fontSize:'12px', color:'var(--color-text-muted)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{clock}</span>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', borderLeft:'1px solid var(--color-border)', paddingLeft:'16px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'white' }}>M</div>
            <span style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>Manager</span>
          </div>
        </div>
      </header>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <aside style={{ width:'196px', background:'var(--color-sidebar-bg)', borderRight:'1px solid var(--color-border)', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto', overflowX:'hidden' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.group} style={{ marginBottom:'4px' }}>
              <div style={{ padding:'10px 14px 4px', fontSize:'10px', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{group.group}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:'9px',
                    padding:'7px 12px', margin:'1px 6px', borderRadius:'6px',
                    textDecoration:'none', fontSize:'13px', fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'white' : 'var(--color-text-muted)',
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                    transition:'all 0.12s',
                  })}
                >
                  <span style={{ fontSize:'14px', lineHeight:1, flexShrink:0 }}>{item.icon}</span>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </aside>

        <main style={{ flex:1, overflow:'auto', background:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
          <div style={{ height:'38px', background:'var(--color-surface-alt)', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', padding:'0 20px', flexShrink:0 }}>
            <span style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>
              {navItems.find(n => n.path !== '/' && location.pathname.startsWith(n.path))?.label
                ?? navItems.find(n => n.path === '/')?.label ?? 'Dashboard'}
            </span>
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <div style={{ height:'24px', background:'var(--color-header-bg)', borderTop:'1px solid var(--color-border)', display:'flex', alignItems:'center', padding:'0 16px', gap:'24px', flexShrink:0 }}>
        <span style={{ fontSize:'11px', color:'#22c55e', display:'flex', alignItems:'center', gap:'5px' }}><span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />Online</span>
        <span style={{ fontSize:'11px', color:'var(--color-text-muted)' }}>v1.0.0</span>
        <span style={{ fontSize:'11px', color:'var(--color-text-muted)', marginLeft:'auto' }}>${projectName} POS &amp; Back Office</span>
      </div>
    </div>
  );
}

export default Layout;`

  const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`

  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'recharts', 'date-fns', 'react-big-calendar']
        }
      }
    }
  }
});`

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`

  const postcssConfig = `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`

  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: ${theme.bg};
  --color-surface: ${theme.surface};
  --color-surface-alt: ${theme.surfaceAlt};
  --color-border: ${theme.border};
  --color-text: ${theme.text};
  --color-text-muted: ${theme.textMuted};
  --color-primary: ${theme.primary};
  --color-primary-light: ${theme.primaryLight};
  --color-header-bg: ${theme.headerBg};
  --color-sidebar-bg: ${theme.sidebarBg};
  --color-card-bg: ${theme.cardBg};
}

*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; padding: 0; background: var(--color-bg); color: var(--color-text); font-family: 'Inter', system-ui, -apple-system, sans-serif; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }`

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
  onAgentState: AgentCallback
): Promise<OrchestratorResult> {
  const agents: AgentState[] = [
    { name: 'skeleton', label: 'Skeleton Agent', status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'pages',    label: 'Page Agent',     status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'injector', label: 'File Injector',  status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'sanitizer',label: 'Sanitizer Agent',status: 'idle', message: 'Waiting...', repairs: [] },
    { name: 'build',    label: 'Build Agent',    status: 'idle', message: 'Waiting...', repairs: [] },
  ]
  const emit = () => onAgentState([...agents])
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
      onStatus('pages', 'pages', 60)
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
  const injectedFiles = generateInjectedFiles(projectName, skeleton.pages, spec)
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
