/**
 * Designer Agent
 * Converts TechnicalSpec → DesignSystem (CSS tokens, screen layouts, color palette)
 */

import { TechnicalSpec } from './architectAgent'

export interface ColorPalette {
  primary: string
  primaryLight: string
  primaryDark: string
  accent: string
  background: string
  surface: string
  surfaceAlt: string
  border: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  success: string
  warning: string
  error: string
}

export interface Typography {
  fontFamily: string
  fontFamilyMono: string
  scaleBase: number
  lineHeightBase: number
}

export interface ScreenLayout {
  name: string
  route?: string
  layout: 'full' | 'sidebar-main' | 'two-column' | 'centered' | 'dashboard'
  sections: Array<{
    id: string
    type: 'header' | 'sidebar' | 'main' | 'footer' | 'modal' | 'table' | 'form' | 'cards' | 'chart'
    description: string
  }>
}

export interface DesignSystem {
  theme: 'dark' | 'light' | 'system'
  palette: ColorPalette
  typography: Typography
  borderRadius: { sm: string; md: string; lg: string; xl: string; full: string }
  shadows: { sm: string; md: string; lg: string }
  screens: ScreenLayout[]
  cssVariables: string // full :root { ... } CSS block
}

const INDUSTRY_PALETTES: Record<string, Partial<ColorPalette>> = {
  Healthcare: { primary: '#0891b2', primaryLight: '#22d3ee', accent: '#10b981' },
  Law: { primary: '#7c3aed', primaryLight: '#a78bfa', accent: '#f59e0b' },
  Finance: { primary: '#1d4ed8', primaryLight: '#60a5fa', accent: '#10b981' },
  Retail: { primary: '#db2777', primaryLight: '#f472b6', accent: '#f59e0b' },
  Construction: { primary: '#d97706', primaryLight: '#fbbf24', accent: '#2563eb' },
  Restaurant: { primary: '#dc2626', primaryLight: '#f87171', accent: '#f59e0b' },
  Default: { primary: '#2563eb', primaryLight: '#60a5fa', accent: '#7c3aed' },
}

const DESIGNER_SYSTEM = `You are a senior UI/UX designer specializing in enterprise SaaS applications.

Given a technical specification, produce a DesignSystem JSON object that includes:
- theme: always "dark" for B2B SaaS
- palette: colors based on the industry vertical, use hex colors
- typography: use Inter as the primary font
- screens: ALL screens from the component list with appropriate layout types and sections

Map each screen to the most fitting layout:
- Dashboard pages → "dashboard"
- Data-heavy pages (tables, lists) → "sidebar-main"  
- Forms, settings → "centered"
- Detail views → "two-column"
- Landing/auth → "full"

Respond with ONLY the JSON. No markdown, no explanation.`

async function callClaude(system: string, user: string): Promise<string> {
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
      max_tokens: 6144,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

function buildFallbackPalette(industry: string): ColorPalette {
  const overrides = INDUSTRY_PALETTES[industry] ?? INDUSTRY_PALETTES.Default
  return {
    primary: '#2563eb',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',
    accent: '#7c3aed',
    background: '#0B0F19',
    surface: '#0D1526',
    surfaceAlt: '#131B2B',
    border: '#1E293B',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#475569',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    ...overrides,
  }
}

function buildCssVariables(palette: ColorPalette, typography: Typography): string {
  return `:root {
  --color-primary: ${palette.primary};
  --color-primary-light: ${palette.primaryLight};
  --color-primary-dark: ${palette.primaryDark};
  --color-accent: ${palette.accent};
  --color-bg: ${palette.background};
  --color-surface: ${palette.surface};
  --color-surface-alt: ${palette.surfaceAlt};
  --color-border: ${palette.border};
  --color-text: ${palette.textPrimary};
  --color-text-secondary: ${palette.textSecondary};
  --color-text-muted: ${palette.textMuted};
  --color-success: ${palette.success};
  --color-warning: ${palette.warning};
  --color-error: ${palette.error};
  --font-sans: ${typography.fontFamily};
  --font-mono: ${typography.fontFamilyMono};
  --text-base: ${typography.scaleBase}px;
  --leading-base: ${typography.lineHeightBase};
}`
}

export async function runDesignerAgent(spec: TechnicalSpec): Promise<DesignSystem> {
  const prompt = `Technical Specification:
${JSON.stringify({ appName: spec.appName, industry: spec.industry, components: spec.components, userRoles: spec.userRoles }, null, 2)}

Generate the complete DesignSystem JSON.`

  let parsed: Partial<DesignSystem> = {}
  try {
    const raw = await callClaude(DESIGNER_SYSTEM, prompt)
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    // Use defaults
  }

  const palette = { ...buildFallbackPalette(spec.industry), ...(parsed.palette ?? {}) }
  const typography: Typography = parsed.typography ?? {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",
    scaleBase: 14,
    lineHeightBase: 1.5,
  }

  return {
    theme: 'dark',
    palette,
    typography,
    borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '18px', full: '9999px' },
    shadows: {
      sm: '0 1px 4px rgba(0,0,0,0.3)',
      md: '0 4px 16px rgba(0,0,0,0.4)',
      lg: '0 12px 40px rgba(0,0,0,0.5)',
    },
    screens: parsed.screens ?? spec.components.map((c) => ({
      name: c.name,
      route: c.route,
      layout: c.type === 'page' ? 'sidebar-main' as const : 'centered' as const,
      sections: [],
    })),
    cssVariables: buildCssVariables(palette, typography),
  }
}
