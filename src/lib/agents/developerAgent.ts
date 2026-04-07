/**
 * Developer Agent
 * Converts TechnicalSpec + DesignSystem → complete set of source files
 */

import { TechnicalSpec } from './architectAgent'
import { DesignSystem } from './designerAgent'

export interface GeneratedFile {
  path: string
  content: string
  language: 'typescript' | 'tsx' | 'css' | 'json' | 'sql' | 'html' | 'javascript'
}

export interface GenerationProgress {
  agent: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
  file?: string
}

type ProgressCallback = (progress: GenerationProgress) => void

const emit = (cb: ProgressCallback, file: string, message: string, level: GenerationProgress['level'] = 'info') =>
  cb({ agent: 'Developer', message, level, file })

async function callClaude(system: string, user: string, maxTokens = 8192): Promise<string> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── Base file generation ─────────────────────────────────────────────────────

async function generateComponent(
  spec: TechnicalSpec,
  design: DesignSystem,
  componentName: string,
  componentType: string,
  route?: string
): Promise<string> {
  const system = `You are an expert React/TypeScript developer. Generate production-ready React components.

Rules:
- Use React 18 + TypeScript (strict mode)
- Tailwind CSS for all styling using the design system palette
- Use Supabase client from '../lib/supabase'
- Named exports for sub-components, default export for main component
- Full CRUD operations where appropriate (fetch data on mount, loading/error states)
- No TODO comments, no placeholder data — all logic must be functional
- Lucide React for icons
- Return ONLY the TypeScript/TSX code, no markdown fence`

  const user = `Generate a complete ${componentType} React component named "${componentName}" (route: ${route ?? 'N/A'}).

App: ${spec.appName} — ${spec.description}
Industry: ${spec.industry}
Primary color: ${design.palette.primary}
Background: ${design.palette.background}
Surface: ${design.palette.surface}

Available tables: ${spec.database.map((t) => t.name).join(', ')}
User roles: ${spec.userRoles.map((r) => r.name).join(', ')}
Integrations: ${spec.integrations.join(', ')}

Generate the full component code.`

  return callClaude(system, user)
}

// ─── Static file generators ──────────────────────────────────────────────────

function generatePackageJson(spec: TechnicalSpec): string {
  return JSON.stringify(
    {
      name: spec.appName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        'type-check': 'tsc --noEmit',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0',
        '@supabase/supabase-js': '^2.38.0',
        'lucide-react': '^0.292.0',
        recharts: '^2.10.0',
        zustand: '^4.4.7',
        '@dnd-kit/core': '^6.1.0',
        '@dnd-kit/sortable': '^8.0.0',
        'date-fns': '^2.30.0',
        ...(spec.integrations.includes('Stripe') ? { '@stripe/stripe-js': '^2.2.0' } : {}),
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.2.0',
        tailwindcss: '^3.3.0',
        autoprefixer: '^10.4.0',
        postcss: '^8.4.0',
        typescript: '^5.2.0',
        vite: '^5.0.0',
      },
    },
    null,
    2
  )
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
  },
})`
}

function generateEnvExample(spec: TechnicalSpec): string {
  const lines = [
    '# Supabase',
    'VITE_SUPABASE_URL=https://your-project.supabase.co',
    'VITE_SUPABASE_ANON_KEY=your-anon-key',
    '',
  ]
  if (spec.integrations.some((i) => i.toLowerCase().includes('stripe'))) {
    lines.push('# Stripe', 'VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...', '')
  }
  if (spec.integrations.some((i) => i.toLowerCase().includes('twilio'))) {
    lines.push('# Twilio (via Edge Function)', 'TWILIO_ACCOUNT_SID=AC...', 'TWILIO_AUTH_TOKEN=...', '')
  }
  return lines.join('\n')
}

function generateSupabaseClient(): string {
  return `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type { Database } from './database.types'
`
}

function generateTailwindConfig(design: DesignSystem): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${design.palette.primary}',
        'primary-light': '${design.palette.primaryLight}',
        'primary-dark': '${design.palette.primaryDark}',
        accent: '${design.palette.accent}',
        surface: '${design.palette.surface}',
        'surface-alt': '${design.palette.surfaceAlt}',
        border: '${design.palette.border}',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
`
}

function generateIndexHtml(spec: TechnicalSpec): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${spec.description}" />
    <title>${spec.appName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export async function runDeveloperAgent(
  spec: TechnicalSpec,
  design: DesignSystem,
  onProgress: ProgressCallback
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = []
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Static/config files
  emit(onProgress, 'package.json', 'Generating project scaffold files...', 'info')
  files.push({ path: 'package.json', content: generatePackageJson(spec), language: 'json' })
  files.push({ path: 'vite.config.ts', content: generateViteConfig(), language: 'typescript' })
  files.push({ path: '.env.example', content: generateEnvExample(spec), language: 'javascript' })
  files.push({ path: 'tailwind.config.js', content: generateTailwindConfig(design), language: 'javascript' })
  files.push({ path: 'index.html', content: generateIndexHtml(spec), language: 'html' })
  files.push({ path: 'src/lib/supabase.ts', content: generateSupabaseClient(), language: 'typescript' })

  emit(onProgress, 'config', 'Scaffold complete. Generating components with AI...', 'success')
  await sleep(300)

  // AI-generated components (limit to avoid rate limits — top 5)
  const keyComponents = spec.components.filter((c) => c.type === 'page').slice(0, 5)

  for (const component of keyComponents) {
    emit(onProgress, `${component.name}.tsx`, `Generating ${component.name}...`, 'info')
    try {
      const content = await generateComponent(spec, design, component.name, component.type, component.route)
      files.push({
        path: `src/pages/${component.name}.tsx`,
        content,
        language: 'tsx',
      })
      emit(onProgress, `${component.name}.tsx`, `✅ ${component.name} complete`, 'success')
    } catch (err) {
      emit(onProgress, `${component.name}.tsx`, `⚠️ ${component.name}: ${(err as Error).message}`, 'warning')
      // Provide a minimal stub
      files.push({
        path: `src/pages/${component.name}.tsx`,
        content: `// Auto-generated stub for ${component.name}\nexport default function ${component.name}() {\n  return <div className="p-8 text-white">${component.name}</div>\n}`,
        language: 'tsx',
      })
    }
    await sleep(200)
  }

  emit(onProgress, 'All files', `✅ Generated ${files.length} files total`, 'success')
  return files
}
