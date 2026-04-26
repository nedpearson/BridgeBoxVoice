/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  SKELETON AGENT — Validates and heals skeleton output    ║
 * ║  Ensures pages list is complete before page generation   ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'

export interface SkeletonPage {
  path: string
  name: string
  route: string
}

export interface SkeletonOutput {
  files: { path: string; content: string }[]
  pages: SkeletonPage[]
  readme: string
}

const SKELETON_SYSTEM = `You are a React architect. Generate a JSON skeleton for a React application.
Output ONLY valid JSON in this exact structure:
{
  "files": [
    { "path": "src/store/index.ts", "content": "...complete zustand store..." },
    { "path": "src/App.tsx", "content": "...complete App.tsx with react-router-dom v6 routes..." }
  ],
  "pages": [
    { "path": "src/pages/Dashboard.tsx", "name": "Dashboard", "route": "/" },
    ...one entry per page...
  ],
  "readme": "Brief description of the app"
}
Rules:
- "files" must include src/store/index.ts (self-contained, with types and mock data inline) and src/App.tsx
- "pages" must list EVERY feature the spec mentions — aim for 8-12 pages. Think comprehensively:
  * Always include: Dashboard, Settings, Reports
  * Include ALL domain-specific modules from the spec (e.g. for a boutique: Appointments, Customers, Inventory, Alterations, Pickups, Staff, Sales, Vendors)
  * Include ALL sub-features (e.g. Invoices, Payments, Scheduling, Analytics)
  * MINIMUM 8 pages. Use your judgment to cover the full business workflow end-to-end.
- Each page entry: path = src/pages/ComponentName.tsx (no spaces/hyphens in name), name = display name, route = /path
- Component names: PascalCase, letters and numbers only. e.g. "GownInventory" not "Gown-Inventory"
- The store must use: import { create } from 'zustand' (NOT default import)
- App.tsx must use React Router v6 with <BrowserRouter>, <Routes>, <Route> and import Layout from './components/Layout'
- ONLY use useNavigate, NOT useHistory.
- Return ONLY valid JSON. No markdown. No explanation.`

// Validate skeleton has all required fields and reasonable pages
function validateSkeleton(raw: unknown): { valid: boolean; reason: string; skeleton: SkeletonOutput | null } {
  if (!raw || typeof raw !== 'object') return { valid: false, reason: 'not an object', skeleton: null }
  const s = raw as Record<string, unknown>

  if (!Array.isArray(s.files)) return { valid: false, reason: 'missing files array', skeleton: null }
  if (!Array.isArray(s.pages)) return { valid: false, reason: 'missing pages array', skeleton: null }
  if (s.pages.length === 0) return { valid: false, reason: 'pages array is empty', skeleton: null }

  // Validate each page entry
  for (const p of s.pages as unknown[]) {
    if (!p || typeof p !== 'object') return { valid: false, reason: 'invalid page entry', skeleton: null }
    const page = p as Record<string, unknown>
    if (!page.path || !page.name || !page.route)
      return { valid: false, reason: `page missing path/name/route: ${JSON.stringify(p)}`, skeleton: null }
  }

  // Check store and App.tsx are present
  const files = s.files as { path: string; content: string }[]
  const hasStore = files.some(f => f.path.includes('store'))
  const hasApp = files.some(f => f.path.includes('App'))
  if (!hasStore) return { valid: false, reason: 'missing store file', skeleton: null }
  if (!hasApp) return { valid: false, reason: 'missing App.tsx file', skeleton: null }

  return {
    valid: true,
    reason: '',
    skeleton: {
      files,
      pages: s.pages as SkeletonPage[],
      readme: typeof s.readme === 'string' ? s.readme : ''
    }
  }
}

// Derive a default pages list from spec if AI fails completely
function deriveDefaultPages(spec: Record<string, unknown>): SkeletonPage[] {
  const pages: SkeletonPage[] = [{ path: 'src/pages/Dashboard.tsx', name: 'Dashboard', route: '/' }]

  // Try to extract page names from spec features/modules
  const features = (spec.features || spec.modules || spec.pages || []) as unknown[]
  const seen = new Set<string>(['dashboard'])

  for (const f of features) {
    const name = typeof f === 'string' ? f : (f as any)?.name || ''
    if (!name) continue
    const safe = name.trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/\b\w/g, (c: string) => c.toUpperCase()).replace(/\s+/g, '')
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
    if (!seen.has(slug) && safe.length > 1) {
      seen.add(slug)
      pages.push({ path: `src/pages/${safe}.tsx`, name: safe.replace(/([A-Z])/g, ' $1').trim(), route: `/${slug}` })
    }
  }

  // Ensure at least 5 pages
  const defaults = [
    { path: 'src/pages/Customers.tsx', name: 'Customers', route: '/customers' },
    { path: 'src/pages/Reports.tsx', name: 'Reports', route: '/reports' },
    { path: 'src/pages/Settings.tsx', name: 'Settings', route: '/settings' },
    { path: 'src/pages/Calendar.tsx', name: 'Calendar', route: '/calendar' },
  ]
  for (const d of defaults) {
    if (pages.length >= 8) break
    if (!pages.find(p => p.route === d.route)) pages.push(d)
  }

  return pages
}

// Generate minimal safe store and App.tsx as fallback
function generateFallbackFiles(pages: SkeletonPage[], projectName: string): { path: string; content: string }[] {
  const pageImports = pages.map((p, i) => `const Page${i} = React.lazy(() => import('./${p.path.replace('src/', '').replace('.tsx', '')}'));`).join('\n')
  const routes = pages.map((p, i) => `          <Route path="${p.route}" element={<Page${i} />} />`).join('\n')

  return [
    {
      path: 'src/store/index.ts',
      content: `import { create } from 'zustand'

interface AppState {
  projectName: string
  setProjectName: (name: string) => void
}

export const useStore = create<AppState>((set) => ({
  projectName: '${projectName}',
  setProjectName: (name) => set({ projectName: name }),
}))`
    },
    {
      path: 'src/App.tsx',
      content: `import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
${pageImports}

export default function App() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
        <Routes>
          <Route element={<Layout />}>
${routes}
          </Route>
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  )
}`
    }
  ]
}

// ── Main: Generate skeleton with validation + healing ─────────────────────────
export async function runSkeletonAgent(
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: (msg: string) => void,
  maxRetries = 3
): Promise<SkeletonOutput> {
  onStatus('🦴 Skeleton Agent: Generating app structure...')
  const specJson = JSON.stringify(spec, null, 2)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callClaude(SKELETON_SYSTEM, `Project Name: ${projectName}\n\nSpecification:\n${specJson}`, [], 4096)
      const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      const { valid, reason, skeleton } = validateSkeleton(parsed)

      if (valid && skeleton) {
        onStatus(`✅ Skeleton Agent: ${skeleton.pages.length} pages planned`)
        return skeleton
      }

      onStatus(`⚠️ Skeleton Agent: Invalid response (${reason}). Attempt ${attempt}/${maxRetries}...`)
    } catch (e: any) {
      onStatus(`⚠️ Skeleton Agent: Parse error (${e.message?.slice(0, 60)}). Attempt ${attempt}/${maxRetries}...`)
    }
  }

  // All retries failed — generate safe fallback
  onStatus(`🔧 Skeleton Agent: Using fallback structure (AI retries exhausted)`)
  const pages = deriveDefaultPages(spec)
  const files = generateFallbackFiles(pages, projectName)
  return { files, pages, readme: `${projectName} — AI-generated business application` }
}
