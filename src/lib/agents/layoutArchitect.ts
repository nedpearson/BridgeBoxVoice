/* eslint-disable */
/**
 * AI Layout Architect Agent
 * Generates, redesigns, and audits UI pages using Claude.
 * Stack: React + TypeScript + Tailwind CSS
 */

const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022'

async function callClaude(system: string, user: string, maxTokens = 8000): Promise<string> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY not configured')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── Design system context injected into every prompt ──────────────────────
const DESIGN_SYSTEM = `
DESIGN SYSTEM (BridgeBox Voice — Premium Dark SaaS):
- Background: #0B0F19 (deep navy)
- Surface: #0C1322, Surface-alt: #131B2B  
- Border: #1E293B, Subtle border: rgba(30,41,59,0.5)
- Text Primary: #F8FAFC, Text Secondary: #94A3B8, Text Muted: #475569
- Accent Blue: #60A5FA / #3B82F6, Accent Purple: #A78BFA / #7C3AED
- Success: #34D399, Warning: #FBBF24, Error: #F87171
- Font: Inter (system-ui fallback)
- Border radius: xl=12px, 2xl=16px, 3xl=24px
- Spacing: 4px grid system
- Tailwind CSS v3 classes only
- Lucide-react icons (import specifically)
- React 18 functional components with TypeScript
- No external UI libraries except what's already installed
`

const ARCHITECT_SYSTEM = `You are an elite Senior UI/UX Engineer & Design Architect specializing in premium SaaS interfaces.
Your design quality MUST match or exceed: Stripe, Linear, Vercel, Arc Browser, Ramp, Notion.

${DESIGN_SYSTEM}

RULES:
1. Output ONLY complete, production-ready React TypeScript code — no explanation, no markdown fences.
2. Import only from: react, react-router-dom, lucide-react, date-fns, recharts, react-hot-toast.
3. Use Tailwind CSS exclusively for styling.
4. Every component must be fully typed.
5. Include real interactivity (state, handlers, transitions).
6. No placeholder text like "Lorem ipsum" — use realistic domain-specific copy.
7. Loading states, empty states, and error states required.
8. Mobile-first responsive design.
9. Micro-animations via Tailwind transition utilities.
10. Default export the main page component.`

const AUDIT_SYSTEM = `You are an elite UI/UX Auditor scoring React/Tailwind interfaces.
Evaluate each category 0–100. Be precise and actionable.
Respond with ONLY valid JSON — no markdown.`

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ArchitectResult {
  code: string
  title: string
  description: string
}

export interface PageAudit {
  overall: number
  beauty: number
  consistency: number
  mobileQuality: number
  uxFriction: number
  conversionReadiness: number
  hierarchy: number
  accessibility: number
  issues: string[]
  recommendations: string[]
}

export interface DesignTokens {
  colors: Record<string, string>
  spacing: Record<string, string>
  borderRadius: Record<string, string>
  shadows: Record<string, string>
  typography: Record<string, string>
}

export type ArchitectMode =
  | 'generate'
  | 'redesign'
  | 'beautify'
  | 'mobile'
  | 'brand'
  | 'conversion'

// ─── Generate new page from prompt ──────────────────────────────────────────

export async function generatePage(
  prompt: string,
  context?: string
): Promise<ArchitectResult> {
  const user = `User request: "${prompt}"
${context ? `\nContext about this app:\n${context}` : ''}

Generate a complete, production-ready React TypeScript page component.
The component must be visually stunning, with the design quality of a $100M SaaS product.
Include: proper imports, TypeScript types, real state management, realistic data, charts/tables if appropriate, 
empty states, loading skeletons, and full interactivity.`

  const code = await callClaude(ARCHITECT_SYSTEM, user, 8000)
  
  // Extract title from code
  const titleMatch = code.match(/(?:function|const)\s+(\w+Page|\w+Dashboard|\w+View|\w+Screen)/)
  const title = titleMatch?.[1]?.replace(/([A-Z])/g, ' $1').trim() ?? 'Generated Page'

  return {
    code: cleanCode(code),
    title,
    description: `AI-generated ${prompt} — production-ready React component`
  }
}

// ─── Redesign existing page ──────────────────────────────────────────────────

export async function redesignPage(
  pageName: string,
  existingCode: string,
  instruction: string = 'Make this world-class'
): Promise<ArchitectResult> {
  const user = `Page name: ${pageName}
Instruction: "${instruction}"

EXISTING CODE TO REDESIGN:
\`\`\`tsx
${existingCode.slice(0, 6000)}
\`\`\`

Completely redesign this page to be world-class. Keep all the logic and data fetching intact.
Only transform the visual design. The result must be dramatically more beautiful, professional, and premium.`

  const code = await callClaude(ARCHITECT_SYSTEM, user, 8000)
  return {
    code: cleanCode(code),
    title: `Redesigned ${pageName}`,
    description: `AI-redesigned ${pageName} — premium upgrade applied`
  }
}

// ─── Audit a page ────────────────────────────────────────────────────────────

export async function auditPage(
  pageName: string,
  code: string
): Promise<PageAudit> {
  const user = `Audit this React page named "${pageName}":
\`\`\`tsx
${code.slice(0, 4000)}
\`\`\`

Score each dimension 0-100 and list specific issues and recommendations.
Return ONLY this JSON structure:
{
  "overall": 0,
  "beauty": 0,
  "consistency": 0,
  "mobileQuality": 0,
  "uxFriction": 0,
  "conversionReadiness": 0,
  "hierarchy": 0,
  "accessibility": 0,
  "issues": ["..."],
  "recommendations": ["..."]
}`

  try {
    const raw = await callClaude(AUDIT_SYSTEM, user, 2000)
    const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      overall: 65, beauty: 60, consistency: 65, mobileQuality: 55,
      uxFriction: 70, conversionReadiness: 60, hierarchy: 65, accessibility: 60,
      issues: ['Could not fully analyze — manual review recommended'],
      recommendations: ['Apply consistent spacing', 'Improve typography hierarchy', 'Add loading states']
    }
  }
}

// ─── Auto-beautify improvements ──────────────────────────────────────────────

export async function beautifyInstruction(pageName: string): Promise<string[]> {
  const user = `List 5 specific, actionable UI improvements for a page called "${pageName}" in a dark-themed SaaS app.
Focus on: spacing, typography, colors, components, animations.
Return ONLY a JSON array of strings: ["improvement 1", "improvement 2", ...]`

  try {
    const raw = await callClaude(AUDIT_SYSTEM, user, 1000)
    const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return [
      'Increase card padding to 24px for breathing room',
      'Add subtle gradient to header section',
      'Apply consistent 8px gap between action buttons',
      'Use skeleton loaders instead of blank states',
      'Add hover micro-animations to interactive elements'
    ]
  }
}

// ─── Generate design tokens ──────────────────────────────────────────────────

export async function generateDesignTokens(
  brandDescription: string
): Promise<DesignTokens> {
  const user = `Generate a complete design token set for: "${brandDescription}"
Return ONLY valid JSON with this structure:
{
  "colors": { "primary": "#...", "primaryLight": "#...", "background": "#...", "surface": "#...", "border": "#...", "text": "#...", "textMuted": "#..." },
  "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px", "2xl": "48px" },
  "borderRadius": { "sm": "6px", "md": "10px", "lg": "14px", "xl": "18px", "2xl": "24px", "full": "9999px" },
  "shadows": { "sm": "...", "md": "...", "lg": "..." },
  "typography": { "fontFamily": "...", "scaleBase": "14px", "headingWeight": "700", "bodyWeight": "400" }
}`

  try {
    const raw = await callClaude(AUDIT_SYSTEM, user, 1500)
    const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      colors: {
        primary: '#60A5FA', primaryLight: '#93C5FD',
        background: '#0B0F19', surface: '#0C1322',
        border: '#1E293B', text: '#F8FAFC', textMuted: '#94A3B8'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px' },
      borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '18px', '2xl': '24px', full: '9999px' },
      shadows: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        md: '0 4px 16px rgba(0,0,0,0.5)',
        lg: '0 12px 40px rgba(0,0,0,0.6)'
      },
      typography: {
        fontFamily: "'Inter', system-ui, sans-serif",
        scaleBase: '14px', headingWeight: '700', bodyWeight: '400'
      }
    }
  }
}

// ─── Mode-specific prompts ────────────────────────────────────────────────────

export function getModePrompt(mode: ArchitectMode): string {
  const prompts: Record<ArchitectMode, string> = {
    generate: 'Create a new world-class page component',
    redesign: 'Redesign this page to be dramatically more beautiful and premium',
    beautify: 'Apply comprehensive visual polish — better spacing, typography, colors, and micro-animations',
    mobile: 'Optimize this page for perfect mobile responsiveness — touch targets, stacked layouts, thumb zones',
    brand: 'Apply unified brand consistency — consistent color palette, typography scale, spacing rhythm, and component patterns throughout',
    conversion: 'Optimize for conversion — clear CTAs, reduced friction, better hierarchy, social proof, urgency signals'
  }
  return prompts[mode]
}

// ─── Predefined prompt library ────────────────────────────────────────────────

export const PROMPT_LIBRARY = [
  { category: 'Dashboards', prompts: [
    'Build an executive analytics dashboard with KPI cards, revenue charts, and activity feed',
    'Create a real-time operations dashboard with live metrics and status indicators',
    'Design a sales pipeline dashboard with funnel charts and deal tracking',
    'Build a project management overview with team velocity and sprint progress',
  ]},
  { category: 'Data Views', prompts: [
    'Create a premium sortable data table with filters, bulk actions, and row expansion',
    'Build a CRM contacts page with search, filters, tags, and contact cards',
    'Design an inventory management list with stock levels and reorder alerts',
    'Create a transaction history with export, date range, and status filters',
  ]},
  { category: 'Forms & Flows', prompts: [
    'Build a multi-step onboarding wizard with progress tracking and validation',
    'Create a luxury checkout flow with payment method selection and order summary',
    'Design a legal intake form with conditional fields and document upload',
    'Build a settings page with tabbed sections, toggles, and live preview',
  ]},
  { category: 'Landing & Marketing', prompts: [
    'Create a premium SaaS landing page hero with gradient animations',
    'Build a features comparison table with tier highlights and CTAs',
    'Design a pricing page with annual/monthly toggle and feature matrix',
    'Create a testimonials and social proof section with avatar cards',
  ]},
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanCode(raw: string): string {
  return raw
    .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()
}
