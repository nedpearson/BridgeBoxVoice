/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  SUPER AGENT ORCHESTRATOR                                            ║
 * ║  Coordinates all agents through the full build pipeline:            ║
 * ║                                                                      ║
 * ║  [SkeletonAgent] → [PageAgent] → [FileInjector] → [SanitizerAgent] ║
 * ║       → [BuildAgent] → [Deploy] → Live App with Error Boundaries    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { runSkeletonAgent } from './skeletonAgent'
import { runPageAgent } from './pageAgent'
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

// ── Generate the injected boilerplate files ───────────────────────────────────
function generateInjectedFiles(
  projectName: string,
  pages: { path: string; name: string; route: string }[]
): { path: string; content: string }[] {
  const folderName = projectName.replace(/\s+/g, '-').toLowerCase()
  const navLinks = pages.map(p => `  { path: '${p.route}', label: '${p.name}' }`).join(',\n')
  const pageImports = pages.map((p, i) => `import Page${i} from './${p.path.replace(/^src\//, '').replace(/\.tsx$/, '')}';`).join('\n')
  const pageRoutes = pages.map((p, i) =>
    `          <Route path="${p.route}" element={<ErrorBoundary name="${p.name}"><Page${i} /></ErrorBoundary>} />`
  ).join('\n')

  const appTsx = `import React, { Component, ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

  const layoutTsx = `import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
${navLinks}
];

const Layout: React.FC = () => (
  <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <aside style={{ width: '240px', background: '#1e293b', padding: '24px 0', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: 0 }}>${projectName}</h1>
      </div>
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'block', padding: '10px 12px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '14px', fontWeight: 500,
              color: isActive ? '#fff' : '#94a3b8',
              background: isActive ? '#7c3aed' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
    <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
      <Outlet />
    </main>
  </div>
);

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
  const indexCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;`
  const indexHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${projectName}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`
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

// ── File merge: agent files override AI files ─────────────────────────────────
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

// ── Main Orchestrator ─────────────────────────────────────────────────────────
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

  // ── AGENT 1: Skeleton ─────────────────────────────────────────────────────
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

  // ── AGENT 2: Pages ────────────────────────────────────────────────────────
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
    // Don't abort — use stubs for all pages
    pageFiles = skeleton.pages.map(p => ({
      path: p.path,
      content: generateSafeStub(p.name, p.route)
    }))
  }

  // ── AGENT 3: File Injector ────────────────────────────────────────────────
  setAgent('injector', { status: 'running', message: 'Injecting infrastructure files...' })
  onStatus('injector', 'Injecting App.tsx, Layout, package.json...', 70)
  const injectedFiles = generateInjectedFiles(projectName, skeleton.pages)
  const mergedFiles = mergeFiles(skeleton.files, injectedFiles, pageFiles)
  setAgent('injector', { status: 'done', message: `${mergedFiles.length} total files ready` })
  onStatus('injector', `${mergedFiles.length} files ready`, 75)

  // ── AGENT 4: Sanitizer ────────────────────────────────────────────────────
  setAgent('sanitizer', { status: 'running', message: 'Sanitizing all files...' })
  onStatus('sanitizer', 'Sanitizing imports, icons, and UI stubs...', 78)
  const sanitizerRepairs: string[] = []
  let sanitized = mergedFiles.map(file => {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) return file

    // Run sanitizer
    const cleaned = sanitizeFileContent(file.path, file.content)

    // Run corruption detector on page files only
    if (file.path.startsWith('src/pages/')) {
      const { broken, reason } = detectCorruption(cleaned)
      if (broken) {
        sanitizerRepairs.push(`${file.path.split('/').pop()}: ${reason}`)
        const pageName = file.path.split('/').pop()?.replace(/\.tsx$/, '') || 'Page'
        const route = skeleton.pages.find(p => p.path === file.path)?.route || '/'
        return { path: file.path, content: generateSafeStub(pageName, route) }
      }
    }
    return { path: file.path, content: cleaned }
  })

  setAgent('sanitizer', {
    status: sanitizerRepairs.length > 0 ? 'repaired' : 'done',
    message: sanitizerRepairs.length > 0
      ? `${sanitizerRepairs.length} files auto-fixed`
      : 'All files clean',
    repairs: sanitizerRepairs
  })
  onStatus('sanitizer', 'Sanitization complete', 82)

  // ── AGENT 5: Build ────────────────────────────────────────────────────────
  setAgent('build', { status: 'running', message: 'Deploying to Vercel...' })
  onStatus('build', 'Self-healing deploy starting...', 85)
  const buildResult = await runBuildAgent(projectName, sanitized, (msg) => {
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
