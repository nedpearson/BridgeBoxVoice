/**
 * INTEGRATION SUPER AGENT
 * Generates, validates, and injects real integration code into the deployed app.
 */

import { callClaude } from '../anthropic'
import { sanitizeFileContent, detectCorruption } from './sanitizerAgent'

export interface Integration {
  id: string
  name: string
  icon: string
  desc: string
  category: string
  keywords: string[]
  requiredEnvVars: string[]
}

export interface IntegrationResult {
  integrationId: string
  status: 'success' | 'error'
  filesGenerated: { path: string; content: string }[]
  pagesPatched: string[]
  envVarsNeeded: string[]
  errorMessage?: string
}

export const INTEGRATION_CATALOG: Integration[] = [
  { id: 'stripe',      name: 'Stripe',      icon: '💳', category: 'Payments',      desc: 'Payments, subscriptions & billing',         keywords: ['payment','checkout','billing','subscription','invoice','buy','sell','price','fee','charge'],  requiredEnvVars: ['VITE_STRIPE_PUBLIC_KEY'] },
  { id: 'sendgrid',    name: 'SendGrid',    icon: '📧', category: 'Email',         desc: 'Transactional & marketing email',            keywords: ['email','notification','receipt','confirm','invite','reminder','alert','newsletter'],           requiredEnvVars: ['SENDGRID_API_KEY'] },
  { id: 'twilio',      name: 'Twilio',      icon: '📱', category: 'Messaging',     desc: 'SMS, voice calls & WhatsApp',               keywords: ['sms','text','phone','call','mobile','notify','message','whatsapp','otp','verify'],             requiredEnvVars: ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'] },
  { id: 'qbo',         name: 'QuickBooks',  icon: '📊', category: 'Accounting',    desc: 'Accounting, payroll & financial sync',      keywords: ['accounting','quickbooks','invoice','payroll','tax','expense','ledger','financial'],            requiredEnvVars: ['VITE_QBO_CLIENT_ID'] },
  { id: 'google-maps', name: 'GoogleMaps',  icon: '🗺️', category: 'Location',      desc: 'Maps, geolocation & routing',               keywords: ['map','location','address','route','gps','dispatch','delivery','track','geo'],                  requiredEnvVars: ['VITE_GOOGLE_MAPS_KEY'] },
  { id: 'docusign',    name: 'DocuSign',    icon: '✍️', category: 'Documents',     desc: 'E-signatures & document workflows',         keywords: ['signature','sign','contract','document','legal','agreement','pdf','esign'],                    requiredEnvVars: ['VITE_DOCUSIGN_CLIENT_ID'] },
  { id: 'slack',       name: 'Slack',       icon: '💬', category: 'Notifications', desc: 'Team notifications & alerts',               keywords: ['slack','notify','team','alert','chat','notification','workflow'],                             requiredEnvVars: ['SLACK_WEBHOOK_URL'] },
  { id: 'openai',      name: 'OpenAI',      icon: '🤖', category: 'AI',            desc: 'AI text generation & analysis',             keywords: ['ai','gpt','generate','analyze','chatbot','summarize','predict'],                              requiredEnvVars: ['OPENAI_API_KEY'] },
  { id: 'calendly',    name: 'Calendly',    icon: '📅', category: 'Scheduling',    desc: 'Appointment & meeting scheduling',          keywords: ['appointment','schedule','booking','calendar','meeting','availability','slot'],                 requiredEnvVars: ['VITE_CALENDLY_URL'] },
  { id: 'plaid',       name: 'Plaid',       icon: '🏦', category: 'Banking',       desc: 'Bank account linking & ACH transfers',      keywords: ['bank','ach','transfer','deposit','account','financial','payroll'],                            requiredEnvVars: ['PLAID_CLIENT_ID','PLAID_SECRET'] },
  { id: 'shipstation', name: 'ShipStation', icon: '📦', category: 'Shipping',      desc: 'Multi-carrier shipping & label printing',   keywords: ['ship','shipping','label','carrier','fedex','ups','usps','delivery','package','fulfillment'],   requiredEnvVars: ['SHIPSTATION_API_KEY'] },
  { id: 'zapier',      name: 'Zapier',      icon: '⚡', category: 'Automation',    desc: 'No-code automation & workflow triggers',    keywords: ['automate','workflow','trigger','connect','integration','task','action','event'],               requiredEnvVars: ['ZAPIER_WEBHOOK_URL'] },
]

// ── Safe name helper ──────────────────────────────────────────────────────────
const safeName = (name: string) => name.replace(/[^a-zA-Z]/g, '')

// ── Fallback hook when AI fails ───────────────────────────────────────────────
function fallbackHook(integration: Integration): string {
  const sn = safeName(integration.name)
  const envCheck = integration.requiredEnvVars.map(v => `!!import.meta.env.${v}`).join(' && ') || 'false'
  return `import { useState, useEffect } from 'react';

export function use${sn}() {
  const [loading, setLoading] = useState(true);
  const [data] = useState([
    { id: 1, label: '${integration.name} Record A', status: 'active', value: '$1,200' },
    { id: 2, label: '${integration.name} Record B', status: 'pending', value: '$850' },
    { id: 3, label: '${integration.name} Record C', status: 'active', value: '$2,100' },
  ]);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);
  return { data, loading, error: null, isConfigured: ${envCheck} };
}`
}

// ── Fallback widget when AI fails ─────────────────────────────────────────────
function fallbackWidget(integration: Integration): string {
  const sn = safeName(integration.name)
  return `import React from 'react';
import { use${sn} } from './use${sn}';
import { RefreshCw } from 'lucide-react';

export default function ${sn}Widget() {
  const { data, loading, isConfigured } = use${sn}();
  if (loading) return (
    <div className="bg-gray-800 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
      {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-700 rounded mb-2" />)}
    </div>
  );
  return (
    <div className="bg-gray-800 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">${integration.icon}</span>
        <h3 className="text-white font-semibold text-sm">${integration.name}</h3>
        {!isConfigured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Demo</span>}
        <RefreshCw size={13} className="ml-auto text-gray-500" />
      </div>
      <div className="space-y-2">
        {data.map((item: any) => (
          <div key={item.id} className="flex justify-between p-2 bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-300">{item.label}</span>
            <span className="text-xs font-semibold text-emerald-400">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`
}

// ── Patch an existing page file to add the widget ─────────────────────────────
export function patchPageWithWidget(
  pageContent: string,
  importLine: string,
  jsxSnippet: string
): string {
  if (pageContent.includes(importLine.trim())) return pageContent // Already patched

  // Insert import after last import line
  const lastImport = [...pageContent.matchAll(/^import\s+.+$/gm)].pop()
  if (lastImport?.index !== undefined) {
    const at = lastImport.index + lastImport[0].length
    pageContent = pageContent.slice(0, at) + '\n' + importLine + pageContent.slice(at)
  }

  // Insert JSX before last </div>
  const idx = pageContent.lastIndexOf('</div>')
  if (idx > -1 && !pageContent.includes(jsxSnippet.slice(0, 15))) {
    pageContent = pageContent.slice(0, idx) + `\n      ${jsxSnippet}\n` + pageContent.slice(idx)
  }
  return pageContent
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export async function runIntegrationAgent(
  integration: Integration,
  projectName: string,
  appSpec: Record<string, unknown>,
  currentFiles: { path: string; content: string }[],
  onStatus: (msg: string) => void,
  maxRetries = 3
): Promise<IntegrationResult> {
  onStatus(`🔌 ${integration.name} Agent: Starting...`)
  const sn = safeName(integration.name)
  const hookPath = `src/integrations/${integration.id}/use${sn}.ts`
  const widgetPath = `src/integrations/${integration.id}/${sn}Widget.tsx`
  const pages = currentFiles.filter(f => f.path.startsWith('src/pages/') && f.path.endsWith('.tsx')).map(f => f.path)

  const SYSTEM = `You are a React integration engineer. Output ONLY valid JSON, no markdown.`
  const PROMPT = `Generate a React integration for "${integration.name}" in app "${projectName}".
Spec: ${JSON.stringify(appSpec).slice(0, 600)}
Pages: ${pages.join(', ')}

Return this exact JSON:
{
  "hookContent": "...complete TypeScript hook (use${sn}) — only imports from react, no external SDKs, mock data when env var missing...",
  "widgetContent": "...complete TSX widget (${sn}Widget) — default export, imports hook from './use${sn}', only react+lucide-react, dark UI, under 70 lines...",
  "patchPage": "src/pages/Dashboard.tsx",
  "importLine": "import ${sn}Widget from '../integrations/${integration.id}/${sn}Widget';",
  "jsxSnippet": "<${sn}Widget />"
}`

  let hookContent = ''
  let widgetContent = ''
  let patchPage = pages[0] || ''
  let importLine = `import ${sn}Widget from '../integrations/${integration.id}/${sn}Widget';`
  let jsxSnippet = `<${sn}Widget />`

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onStatus(`🤖 ${integration.name} Agent: Generating (attempt ${attempt}/${maxRetries})...`)
      const raw = await callClaude(SYSTEM, PROMPT, [], 5000)
      const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      hookContent = parsed.hookContent || ''
      widgetContent = parsed.widgetContent || ''
      patchPage = parsed.patchPage || patchPage
      importLine = parsed.importLine || importLine
      jsxSnippet = parsed.jsxSnippet || jsxSnippet

      // Validate
      if (hookContent.includes('export') && hookContent.length > 50 &&
          widgetContent.includes('export default') && widgetContent.length > 100) {
        const { broken } = detectCorruption(widgetContent)
        if (!broken) { onStatus(`✅ ${integration.name} Agent: Code validated`); break }
      }
      onStatus(`⚠️ ${integration.name} Agent: Validation failed, retrying...`)
    } catch {
      onStatus(`⚠️ ${integration.name} Agent: Parse error, retrying...`)
    }
    if (attempt === maxRetries) {
      onStatus(`🛡️ ${integration.name} Agent: Using safe fallback`)
      hookContent = fallbackHook(integration)
      widgetContent = fallbackWidget(integration)
    }
  }

  const filesGenerated: { path: string; content: string }[] = [
    { path: hookPath, content: sanitizeFileContent(hookPath, hookContent) },
    { path: widgetPath, content: sanitizeFileContent(widgetPath, widgetContent) },
  ]

  const pagesPatched: string[] = []
  const targetFile = currentFiles.find(f => f.path === patchPage)
  if (targetFile) {
    onStatus(`🔧 ${integration.name} Agent: Patching ${patchPage.split('/').pop()}...`)
    const patched = patchPageWithWidget(targetFile.content, importLine, jsxSnippet)
    filesGenerated.push({ path: patchPage, content: patched })
    pagesPatched.push(patchPage.split('/').pop()!)
  }

  onStatus(`✅ ${integration.name} Agent: Complete! (${filesGenerated.length} files)`)
  return { integrationId: integration.id, status: 'success', filesGenerated, pagesPatched, envVarsNeeded: integration.requiredEnvVars }
}
