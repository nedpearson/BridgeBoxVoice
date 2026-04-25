import { supabase } from './supabase'

const CLAUDE_MODEL = 'claude-sonnet-4-5'
const OPENAI_MODEL = 'gpt-4o'

export interface AIAnalysis {
  businessType: string
  industry: string
  features: string[]
  integrations: string[]
  dataModels: Array<{ name: string; fields: string[] }>
  userRoles: string[]
  deploymentTargets: string[]
  clarifyingQuestions: string[]
  summary: string
  confidence: number
}

export interface ClarifyMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: ClarifyMessage[] = [],
  maxTokens = 4096,
  imageUrl?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: {
        model: CLAUDE_MODEL,
        systemPrompt,
        userMessage,
        history,
        maxTokens,
        imageUrl
      }
    })

    if (error) throw new Error(error.message || 'Unknown Edge Function Error')
    if (data?.error) throw new Error(data.error)

    return data?.content ?? ''
  } catch (e: any) {
    console.warn('Claude API failed (token/rate limit or error). Falling back to OpenAI chat gpt...', e)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-fallback'))
      import('posthog-js').then(({ default: posthog }) => {
        posthog.capture('llm-fallback-triggered', {
          original_model: CLAUDE_MODEL,
          fallback_model: OPENAI_MODEL,
          error_message: e.message,
        })
      }).catch(() => { })
    }

    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: {
        model: OPENAI_MODEL,
        systemPrompt,
        userMessage,
        history,
        maxTokens,
        imageUrl
      }
    })

    if (error) throw new Error(error.message || 'Unknown Edge Function Error')
    if (data?.error) throw new Error(data.error)

    return data?.content ?? ''
  }
}

// ─── Intent Extraction ────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are an expert software architect who converts voice descriptions of business software into structured specifications.

Given a voice transcript of someone describing the software application they want built, extract:
- businessType: what type of business this is for
- industry: the industry vertical (e.g. "Law", "Healthcare", "Retail", "Finance")
- features: list of specific features to build (5-15 items)
- integrations: third-party services to integrate (e.g. "Stripe", "QuickBooks", "Salesforce")
- dataModels: key data entities with their fields
- userRoles: the different types of users in the system
- deploymentTargets: platforms to deploy to ("web", "ios", "android", "windows", "mac")
- clarifyingQuestions: 3-5 follow-up questions to clarify ambiguities
- summary: a 2-3 sentence executive summary of the software
- confidence: your overall confidence in the extraction (0-1)

Respond ONLY with valid JSON in this exact structure. No markdown, no explanation.`

export async function extractIntent(transcript: string): Promise<AIAnalysis> {
  const raw = await callClaude(EXTRACTION_SYSTEM, `Voice transcript:\n\n${transcript}`)
  return JSON.parse(raw) as AIAnalysis
}

// ─── Clarifying Q&A ───────────────────────────────────────────────────────────

const CLARIFY_SYSTEM = `You are an expert software architect helping refine requirements for a custom business software project.
The user has described their software via voice, and you are helping clarify requirements through follow-up questions.
Be concise, professional, and focused on extracting information that will improve the software specification.
Ask one focused question at a time. Keep responses under 150 words.`

export async function askClarifying(
  question: string,
  history: ClarifyMessage[],
  analysis: AIAnalysis
): Promise<string> {
  const context = `Original software analysis:\n${JSON.stringify(analysis, null, 2)}\n\nUser's response: ${question}`
  return callClaude(CLARIFY_SYSTEM, context, history)
}

// ─── Spec Generation ──────────────────────────────────────────────────────────

const SPEC_SYSTEM = `You are a senior software architect. Given a structured analysis of a business software request, generate a detailed technical specification.

Return JSON with:
- title: project title
- description: full description
- techStack: { frontend, backend, database, hosting }
- features: detailed feature list with { name, description, priority: "high"|"medium"|"low", complexity: "simple"|"moderate"|"complex" }
- dataModels: { name, fields: [{ name, type, required }][] }[]
- apiEndpoints: { method, path, description }[]
- uiScreens: { name, description, components: string[] }[]
- timeline: { phase, description, estimatedDays }[]

Respond only with valid JSON.`

export async function generateSpec(analysis: AIAnalysis): Promise<Record<string, unknown>> {
  const raw = await callClaude(SPEC_SYSTEM, JSON.stringify(analysis, null, 2))
  return JSON.parse(raw) as Record<string, unknown>
}

// ─── Prompt Enhancement ───────────────────────────────────────────────────────

const ENHANCE_SYSTEM = `You are an expert product manager and software architect. A user has provided a rough draft or voice transcript of an application they want to build.
Your task is to rewrite it into a clear, comprehensive, and professional software requirement description that fully captures their intent.
Expand on implicit requirements, organize it logically, use clear terminology, and ensure it's easily actionable by a development team.
Do NOT just summarize; build upon their idea to make it a robust software description.
Respond ONLY with the rewritten description. Do not add any conversational filler like "Here is the rewritten description:".`

export async function enhancePrompt(roughPrompt: string): Promise<string> {
  return await callClaude(ENHANCE_SYSTEM, `Original prompt:\n\n${roughPrompt}`)
}

// ─── App Preview Generation ────────────────────────────────────────────────────

export const hasAnthropicKey = true // Handled by edge function now

const PREVIEW_SYSTEM = `You are a world-class frontend engineer who builds real, production-quality web applications. 
Given a detailed software specification, generate a COMPLETE, fully functional, self-contained HTML application.

CRITICAL RULES:
1. Build the EXACT app described in the spec — NOT a generic template. Use the real project name, real industry terms, real feature names.
2. If the spec is for a packaging/shipping e-commerce store, build THAT. If it's for HVAC dispatch, build THAT. Read the spec carefully.
3. The app must have ALL screens listed in the spec's uiScreens section, plus any additional screens implied by the features.
4. Sidebar/nav must list the REAL screen names from the spec.
5. Every screen must contain REAL, domain-appropriate content with realistic sample data matching the industry.
6. Interactive elements MUST work: forms submit and show success, tables are searchable, modals open/close, sidebar navigates between screens.
7. Use a professional, modern dark theme (not generic). Choose accent colors that fit the industry.
8. Typography: Google Fonts Inter. Icons: use Unicode emoji or CSS shapes — NO external icon libraries.
9. Vanilla JS only — no React, no jQuery, no external libraries except Google Fonts.
10. Do NOT use placeholder text like "Lorem ipsum" or fake records called "Alpha Record". Use domain-specific realistic data.
11. Every feature from the spec should be REPRESENTED in at least one screen.
12. Make it look like a real $10M SaaS product. Shadows, transitions, hover states, micro-animations.
13. The HTML file must be self-contained — all CSS and JS inline.
14. AUTHENTICATION BYPASS: The app is a demo. For any login, sign-up, or authentication screen, the 'Sign In' button MUST actively bypass credentials (accept any input) and immediately route the user into the main dashboard of the app without errors. Do not trap the user.
15. NO PAGE RELOADS: NEVER use <form action="..."> or allow forms to submit natively. ALWAYS use \`event.preventDefault()\` on form submissions. The preview runs in an iframe; a native form submission will wipe the preview entirely.

Return ONLY the raw HTML starting with <!DOCTYPE html>. No markdown. No code fences. No explanation.`

export async function generateAppPreview(spec: Record<string, unknown>): Promise<string> {
  const raw = await callClaude(PREVIEW_SYSTEM, `Build a complete, fully functional web application for this specification:\n\n${JSON.stringify(spec, null, 2)}`, [], 16000)
  return raw.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim()
}

// ─── Full Application Code Generation ─────────────────────────────────────────

const FULL_APP_SYSTEM = `You are a senior full-stack engineer. Given a software specification, generate a complete, production-ready React + TypeScript + Tailwind CSS web application.

Output a JSON object with this EXACT structure:
{
  "files": [
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/main.tsx", "content": "..." },
    { "path": "src/index.css", "content": "..." },
    { "path": "package.json", "content": "..." },
    { "path": "index.html", "content": "..." },
    { "path": "vite.config.ts", "content": "..." },
    { "path": "tsconfig.json", "content": "..." },
    { "path": "tailwind.config.js", "content": "..." },
    { "path": "src/pages/Dashboard.tsx", "content": "..." },
    ... (one file per page and component)
  ],
  "readme": "## Setup\n\nnpm install\nnpm run dev\n\n..."
}

Rules:
- Generate ALL the pages described in the spec's uiScreens
- Use React Router for navigation
- Use Zustand for state management (include in package.json)  
- Use Tailwind CSS for styling (dark theme)
- Use lucide-react for icons
- Include realistic mock data in a src/data/ folder
- Each page must be fully implemented with real UI elements
- package.json must include all dependencies with correct versions
- The app must actually run with npm install && npm run dev
- Use TypeScript throughout
- Include a complete README with setup instructions
- AUTHENTICATION BYPASS: Any authentication flows (Sign In / Register) MUST be fully mocked so that clicking 'Sign In' with ANY credentials immediately authenticates the user in Zustand, uses React Router to redirect to the main app dashboard, and grants full access. Do NOT trap the user on a non-functional login screen.

Return ONLY valid JSON. No markdown. No explanation.`

export async function generateFullApplication(spec: Record<string, unknown>, projectName: string, retries = 2): Promise<{ files: { path: string, content: string }[], readme: string }> {
  let attempts = 0
  let promptContext = `Project Name: ${projectName}\n\nSpecification:\n${JSON.stringify(spec, null, 2)}`
  let history: ClarifyMessage[] = []

  while (attempts <= retries) {
    try {
      const raw = await callClaude(FULL_APP_SYSTEM, promptContext, history, 16000)
      const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
      return JSON.parse(cleaned)
    } catch (e: any) {
      if (attempts === retries) throw new Error(`Agentic loop failed to correct code after ${retries} attempts: ${e.message}`)

      console.warn(`[Agentic Validator] Generation failed on attempt ${attempts + 1}. Auto-correcting syntax error:`, e.message)
      history.push({ role: 'assistant', content: "Failed compilation output" })
      history.push({ role: 'user', content: `CRITICAL ERROR: Your last output crashed the parser with this syntax error: ${e.message}. Please thoroughly check your JSON formatting (missing commas, unescaped quotes) and try regenerating the FULL payload again.` })
      attempts++
    }
  }
  throw new Error("Generation loop exhausted.")
}

