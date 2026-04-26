/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  BUILD AGENT — Self-healing Vercel deploy with AI repair loop    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'
import { sanitizeFileContent, generateSafeStub } from './sanitizerAgent'

const MAX_ATTEMPTS = 4

export interface BuildAgentResult {
  url: string | null
  state: 'READY' | 'ERROR' | 'ABANDONED'
  attempts: number
  repairs: string[]
  errorMessage?: string
}

// Fetch Vercel build event logs for a deployment
async function fetchBuildLogs(deploymentId: string): Promise<string> {
  if (!deploymentId) return ''
  try {
    const token = import.meta.env.VITE_VERCEL_TOKEN
    const res = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const events = await res.json() as Array<{ payload?: { text?: string } }>
    return events.filter(e => e.payload?.text).map(e => e.payload!.text!).join('\n')
  } catch {
    return ''
  }
}

// Parse Vercel error log to identify broken file + message
function parseBuildError(logs: string): { filePath: string; errorMsg: string } | null {
  // esbuild pattern
  const esbuild = logs.match(/(?:\/vercel\/path1\/)?(src\/[^\s:]+\.tsx?):[\d]+:[\d]+[:\s]+(?:ERROR|error)[:\s]+(.+)/)
  if (esbuild) return { filePath: esbuild[1], errorMsg: esbuild[2].trim() }

  // Rollup "not exported" pattern
  const rollup = logs.match(/"([^"]+)" is not exported by "[^"]+", imported by "(src\/[^\s"]+\.tsx?)"/)
  if (rollup) return { filePath: rollup[2], errorMsg: `"${rollup[1]}" is not exported` }

  // Generic file reference
  const fileRef = logs.match(/file:\s*(?:\/vercel\/path1\/)?(src\/[^\s\n:]+\.tsx?)/)
  if (fileRef) {
    const errLine = logs.match(/(?:ERROR|error)[:\s]+(.+)/)
    return { filePath: fileRef[1], errorMsg: errLine ? errLine[1].trim() : 'Build error' }
  }

  // Module resolution failure
  const modFail = logs.match(/Cannot find module '([^']+)' from '(src\/[^']+\.tsx?)'/)
  if (modFail) return { filePath: modFail[2], errorMsg: `Cannot find module '${modFail[1]}'` }

  return null
}

// AI-powered file repair
async function repairFile(
  filePath: string,
  errorMsg: string,
  originalContent: string,
  projectName: string,
  pageName: string,
  onStatus: (msg: string) => void
): Promise<string> {
  onStatus(`🤖 Build Agent: Repairing ${filePath.split('/').pop()}...`)
  const REPAIR_SYSTEM = `You are a React engineer fixing a broken TypeScript component.
Output ONLY: { "content": "...complete fixed component..." }
Fix the error completely. Rules:
- Default export, component name letters/numbers only (${pageName})
- Only import from react, react-router-dom, lucide-react. NO local imports.
- Under 150 lines. Simple const data arrays before component.
- Only icons: BarChart2, Check, DollarSign, Edit2, Eye, Plus, RefreshCw, Search, Settings, Star, Trash2, User, Users, X
Return ONLY valid JSON. No markdown.`

  const prompt = `Project: ${projectName}\nFile: ${filePath}\nError: ${errorMsg}\n\nOriginal code:\n${originalContent.slice(0, 2500)}\n\nGenerate a COMPLETE fixed replacement.`

  try {
    const raw = await callClaude(REPAIR_SYSTEM, prompt, [], 4096)
    const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return sanitizeFileContent(filePath, parsed.content as string)
  } catch {
    return generateSafeStub(pageName, '/')
  }
}

// ── Main: Self-healing deploy loop ────────────────────────────────────────────
export async function runBuildAgent(
  projectName: string,
  files: { path: string; content: string }[],
  onStatus: (msg: string) => void
): Promise<BuildAgentResult> {
  const { deployFullReactAppToVercel } = await import('../deploy/vercel')
  const repairs: string[] = []
  let currentFiles = files.map(f => ({ ...f }))

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onStatus(attempt === 1
      ? '🚀 Build Agent: Deploying to Vercel...'
      : `🔁 Build Agent: Retry ${attempt}/${MAX_ATTEMPTS} with repaired files...`)

    const result = await deployFullReactAppToVercel(projectName, currentFiles, onStatus)

    if (result.state === 'READY' && result.url) {
      const msg = repairs.length > 0
        ? `Build Agent: Deployed after ${repairs.length} auto-repair(s)!`
        : 'Build Agent: Deployed on first attempt!'
      onStatus(msg)
      return { url: result.url, state: 'READY', attempts: attempt, repairs }
    }

    // If no deployment ID, the upload itself failed — don't retry the same broken upload
    if (!result.id || result.id === '') {
      onStatus(`Build Agent: Upload failed - ${result.errorMessage || 'unknown error'}`)
      return { url: null, state: 'ERROR', attempts: attempt, repairs, errorMessage: result.errorMessage || 'File upload to Vercel failed' }
    }

    // Build failed — analyze Vercel build logs
    onStatus('Build Agent: Build failed. Analyzing error...')
    const logs = await fetchBuildLogs(result.id)
    const error = parseBuildError(logs)

    if (!error) {
      onStatus('⚠️ Build Agent: Cannot identify broken file. Will retry as-is.')
      if (attempt >= MAX_ATTEMPTS) {
        return { url: null, state: 'ERROR', attempts: attempt, repairs, errorMessage: result.errorMessage || 'Build failed, logs unclear' }
      }
      continue
    }

    onStatus(`🔍 Build Agent: Error in ${error.filePath.split('/').pop()}: ${error.errorMsg.slice(0, 70)}`)

    const fileIdx = currentFiles.findIndex(f =>
      f.path === error.filePath ||
      f.path.endsWith('/' + error.filePath) ||
      error.filePath.endsWith('/' + f.path)
    )
    const originalContent = fileIdx >= 0 ? currentFiles[fileIdx].content : ''
    const pageName = error.filePath.split('/').pop()?.replace(/\.(tsx|ts)$/, '').replace(/[^a-zA-Z0-9]/g, '') || 'Page'

    const fixed = await repairFile(error.filePath, error.errorMsg, originalContent, projectName, pageName, onStatus)

    if (fileIdx >= 0) {
      currentFiles[fileIdx] = { path: currentFiles[fileIdx].path, content: fixed }
    } else {
      currentFiles.push({ path: error.filePath, content: fixed })
    }

    const repairSummary = `${error.filePath.split('/').pop()}: ${error.errorMsg.slice(0, 50)}`
    repairs.push(repairSummary)
    onStatus(`✅ Build Agent: Repaired ${error.filePath.split('/').pop()}`)
  }

  return {
    url: null,
    state: 'ABANDONED',
    attempts: MAX_ATTEMPTS,
    repairs,
    errorMessage: `Exhausted ${MAX_ATTEMPTS} repair attempts. Repairs: ${repairs.join(' | ')}`
  }
}
