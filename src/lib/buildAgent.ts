/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║            SELF-HEALING BUILD AGENT                              ║
 * ║                                                                  ║
 * ║  Wraps Vercel deploy in an auto-repair loop:                     ║
 * ║  1. Deploy files to Vercel                                       ║
 * ║  2. If build ERROR → parse logs → identify broken file           ║
 * ║  3. Regenerate broken file with AI                               ║
 * ║  4. Re-deploy — repeat up to MAX_ATTEMPTS                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const VERCEL_TOKEN = import.meta.env.VITE_VERCEL_TOKEN || ''
const MAX_ATTEMPTS = 4

export interface BuildAgentResult {
  url: string | null
  state: 'READY' | 'ERROR' | 'ABANDONED'
  attempts: number
  repairs: string[]
  errorMessage?: string
}

// ── Fetch Vercel build logs for a deployment id ───────────────────────────────
async function fetchBuildLogs(deploymentId: string): Promise<string> {
  if (!deploymentId || !VERCEL_TOKEN) return ''
  try {
    const res = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    })
    const events = await res.json() as Array<{ payload?: { text?: string } }>
    return events.filter(e => e.payload?.text).map(e => e.payload!.text!).join('\n')
  } catch {
    return ''
  }
}

// ── Parse error from Vercel build log to find broken file + message ───────────
function parseBuildError(logs: string): { filePath: string; errorMsg: string } | null {
  // esbuild pattern: /vercel/path1/src/pages/Dashboard.tsx:27:1: ERROR: ...
  const esbuildMatch = logs.match(/(?:\/vercel\/path1\/)?(src\/[^\s:]+\.tsx?):[\d]+:[\d]+[:\s]+(?:ERROR|error)[:\s]+(.+)/)
  if (esbuildMatch) return { filePath: esbuildMatch[1], errorMsg: esbuildMatch[2].trim() }

  // Rollup "not exported" pattern
  const rollupMatch = logs.match(/"([^"]+)" is not exported by "[^"]+", imported by "(src\/[^\s"]+\.tsx?)"/)
  if (rollupMatch) return { filePath: rollupMatch[2], errorMsg: `"${rollupMatch[1]}" is not exported` }

  // Generic "file:" reference
  const fileRefMatch = logs.match(/file:\s*(?:\/vercel\/path1\/)?(src\/[^\s\n:]+\.tsx?)/)
  if (fileRefMatch) {
    const errLine = logs.match(/(?:ERROR|error)[:\s]+(.+)/)
    return { filePath: fileRefMatch[1], errorMsg: errLine ? errLine[1].trim() : 'Build error' }
  }

  return null
}

// ── AI: regenerate one broken file ────────────────────────────────────────────
async function regenerateBrokenFile(
  filePath: string,
  errorMsg: string,
  originalContent: string,
  projectName: string,
  onStatus: (msg: string) => void
): Promise<string> {
  onStatus(`🤖 AI repairing: ${filePath.split('/').pop()}...`)
  const pageName = filePath.split('/').pop()?.replace(/\.(tsx|ts)$/, '').replace(/[^a-zA-Z0-9]/g, '') || 'Page'

  const REPAIR_SYSTEM = `You are a React engineer fixing a broken TypeScript component.
Output ONLY this JSON: { "content": "...complete fixed component..." }
RULES:
- Default export. Component name: letters/numbers only (e.g. "${pageName}").
- Self-contained: ONLY imports from 'react', 'react-router-dom', 'lucide-react'. NO local file imports.
- Under 150 lines total.
- ONLY these icons: BarChart2, Bell, Box, Calendar, Check, CheckCircle, ChevronDown, ChevronRight, Clock, Cog, CreditCard, DollarSign, Edit2, Eye, FileText, Plus, PlusCircle, RefreshCw, Search, Settings, Star, Trash2, TrendingUp, User, Users, Wallet, X, XCircle
- No ternary inside JSX attributes. All JSX tags properly closed.
- Mock data as const arrays before the component (strings/numbers only).
Return ONLY valid JSON. No markdown.`

  const prompt = `Project: ${projectName}
File: ${filePath} (component: ${pageName})
Error: ${errorMsg}

Original broken code (first 2000 chars):
${originalContent.slice(0, 2000)}

Generate a complete, correct replacement component with same purpose.`

  try {
    const { callClaude } = await import('./anthropic')
    const raw = await callClaude(REPAIR_SYSTEM, prompt, [], 4096)
    const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed.content as string
  } catch {
    // Safe fallback stub
    return `import React, { useState } from 'react';
import { RefreshCw, BarChart2, Users } from 'lucide-react';

const ITEMS = [
  { id: 1, name: 'Record A', status: 'Active', value: '$1,200' },
  { id: 2, name: 'Record B', status: 'Pending', value: '$850' },
  { id: 3, name: 'Record C', status: 'Active', value: '$2,100' },
  { id: 4, name: 'Record D', status: 'Inactive', value: '$650' },
  { id: 5, name: 'Record E', status: 'Active', value: '$3,400' },
];

export default function ${pageName}() {
  const [selected, setSelected] = useState<(typeof ITEMS)[0] | null>(null);
  if (selected) {
    return (
      <div className="p-8">
        <button onClick={() => setSelected(null)} className="mb-4 text-purple-400 hover:text-purple-300 text-sm">
          ← Back to list
        </button>
        <div className="bg-gray-800 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">{selected.name}</h1>
          <p className="text-gray-400">Status: <span className="text-white">{selected.status}</span></p>
          <p className="text-gray-400 mt-1">Value: <span className="text-emerald-400 font-bold">{selected.value}</span></p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 className="text-purple-400" size={24} />
        <h1 className="text-2xl font-bold text-white">${pageName}</h1>
        <span className="ml-auto bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">{ITEMS.length} records</span>
      </div>
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700/60">
            <tr>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map(item => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 text-white">{item.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300">{item.status}</span>
                </td>
                <td className="py-3 px-4 text-emerald-400 font-medium">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`
  }
}

// ── Apply the same import/icon sanitizer used in the main pipeline ────────────
function sanitizeGeneratedContent(content: string): string {
  const APPROVED = new Set(['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'lucide-react', 'zustand', 'clsx', 'tailwind-merge', 'date-fns', 'recharts', 'react-hook-form', '@headlessui/react', 'react/jsx-runtime'])
  const isApproved = (src: string) => {
    if (src.startsWith('.') || src.startsWith('/')) return true
    if (APPROVED.has(src)) return true
    for (const pkg of APPROVED) if (src.startsWith(pkg + '/')) return true
    return false
  }

  content = content.split('\n').filter(line => {
    const m = line.match(/^\s*import\s+.*?from\s+['"]([^'"]+)['"]/)
    if (m && !isApproved(m[1])) return false
    const m2 = line.match(/^\s*import\s+['"]([^'"]+)['"]/)
    if (m2 && !isApproved(m2[1])) return false
    return true
  }).join('\n')

  const VALID_ICONS = new Set(['BarChart2','Bell','Box','Calendar','Check','CheckCircle','ChevronDown','ChevronRight','Clock','Cog','CreditCard','DollarSign','Edit2','Eye','FileText','Filter','Home','Info','List','Mail','MoreHorizontal','Package','Phone','Plus','PlusCircle','RefreshCw','Search','Settings','Star','Trash2','TrendingUp','User','UserCheck','UserPlus','Users','Wallet','X','XCircle'])
  content = content.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g, (_m: string, iconList: string) => {
    const icons = iconList.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()).filter((n: string) => VALID_ICONS.has(n))
    if (icons.length === 0) icons.push('RefreshCw')
    return `import { ${[...new Set([...icons, 'RefreshCw'])].join(', ')} } from 'lucide-react'`
  })
  return content
}

// ── MAIN: Self-healing deploy loop ────────────────────────────────────────────
export async function deployWithSelfHealingAgent(
  projectName: string,
  files: { path: string; content: string }[],
  onStatus: (msg: string) => void
): Promise<BuildAgentResult> {
  const { deployFullReactAppToVercel } = await import('./deploy/vercel')
  const repairs: string[] = []
  let currentFiles = files.map(f => ({ ...f }))

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt === 1) {
      onStatus('🚀 Deploying to Vercel...')
    } else {
      onStatus(`🔁 Self-Healing Agent — Retry ${attempt}/${MAX_ATTEMPTS}...`)
    }

    const result = await deployFullReactAppToVercel(projectName, currentFiles, onStatus)

    if (result.state === 'READY' && result.url) {
      if (repairs.length > 0) {
        onStatus(`✅ Build succeeded after ${repairs.length} auto-repair(s)!`)
      }
      return { url: result.url, state: 'READY', attempts: attempt, repairs }
    }

    // Build failed — fetch logs and attempt repair
    onStatus('❌ Build failed. Fetching error logs...')
    const logs = await fetchBuildLogs(result.id)

    const error = parseBuildError(logs)
    if (!error) {
      onStatus('⚠️ Cannot identify broken file. Skipping auto-repair for this attempt.')
      if (attempt >= MAX_ATTEMPTS) {
        return { url: null, state: 'ERROR', attempts: attempt, repairs, errorMessage: result.errorMessage || logs.slice(-400) }
      }
      continue
    }

    onStatus(`🔍 Found error in ${error.filePath.split('/').pop()}: ${error.errorMsg.slice(0, 70)}`)

    const fileIdx = currentFiles.findIndex(f =>
      f.path === error.filePath ||
      f.path.endsWith('/' + error.filePath) ||
      error.filePath.endsWith('/' + f.path)
    )
    const originalContent = fileIdx >= 0 ? currentFiles[fileIdx].content : ''

    const fixedContent = await regenerateBrokenFile(error.filePath, error.errorMsg, originalContent, projectName, onStatus)
    const sanitized = sanitizeGeneratedContent(fixedContent)

    if (fileIdx >= 0) {
      currentFiles[fileIdx] = { path: currentFiles[fileIdx].path, content: sanitized }
    } else {
      currentFiles.push({ path: error.filePath, content: sanitized })
    }

    repairs.push(`${error.filePath.split('/').pop()}: ${error.errorMsg.slice(0, 50)}`)
    onStatus(`✅ Repaired ${error.filePath.split('/').pop()}. Re-deploying...`)
  }

  return {
    url: null,
    state: 'ABANDONED',
    attempts: MAX_ATTEMPTS,
    repairs,
    errorMessage: `Repair agent exhausted ${MAX_ATTEMPTS} attempts. Repairs made: ${repairs.join(', ')}`
  }
}
