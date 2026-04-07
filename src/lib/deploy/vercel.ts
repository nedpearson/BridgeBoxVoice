/**
 * Vercel Deployment Automation
 * Creates projects and deploys file trees via Vercel API v9/v13
 */

import { GeneratedFile } from '../agents/developerAgent'

export interface VercelDeployment {
  id: string
  url: string
  readyState: 'QUEUED' | 'INITIALIZING' | 'BUILDING' | 'ERROR' | 'CANCELED' | 'READY'
  name: string
  createdAt: number
}

export interface DeploymentStatus {
  id: string
  state: VercelDeployment['readyState']
  url: string | null
  buildDuration?: number
  errorMessage?: string
}

type ProgressFn = (msg: string) => void

const VERCEL_API = 'https://api.vercel.com'

function getToken(): string {
  const token = import.meta.env.VITE_VERCEL_TOKEN
  if (!token) throw new Error('VITE_VERCEL_TOKEN not set. Add it to your .env file.')
  return token
}

async function vercelFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`)
  return data as T
}

// ─── Project Management ───────────────────────────────────────────────────────

async function ensureProject(name: string, onProgress?: ProgressFn): Promise<string> {
  const projectName = `bridgebox-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
  onProgress?.(`Creating Vercel project: ${projectName}`)

  try {
    const project = await vercelFetch<{ id: string }>('/v9/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        framework: 'vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        installCommand: 'npm install',
      }),
    })
    return project.id
  } catch (err) {
    // Project may already exist — try to find it
    const projects = await vercelFetch<{ projects: Array<{ id: string; name: string }> }>(`/v9/projects?search=${projectName}`)
    const existing = projects.projects.find((p) => p.name === projectName)
    if (existing) return existing.id
    throw err
  }
}

// ─── File Deployment ─────────────────────────────────────────────────────────

function encodeFile(content: string): { data: string; encoding: 'utf8' | 'base64' } {
  return { data: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }
}

async function createDeployment(
  projectName: string,
  files: GeneratedFile[],
  envVars: Record<string, string>,
  onProgress?: ProgressFn
): Promise<VercelDeployment> {
  onProgress?.(`Uploading ${files.length} files to Vercel...`)

  const vercelFiles = files.map((f) => ({
    file: f.path,
    ...encodeFile(f.content),
  }))

  const env = Object.entries(envVars).map(([key, value]) => ({ key, value, type: 'plain' }))

  const deployment = await vercelFetch<VercelDeployment>('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: `bridgebox-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      files: vercelFiles,
      target: 'production',
      env,
      projectSettings: {
        framework: 'vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
      },
    }),
  })

  return deployment
}

// ─── Status Polling ───────────────────────────────────────────────────────────

export async function pollDeploymentStatus(deploymentId: string, maxWaitMs = 300_000): Promise<DeploymentStatus> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const deployment = await vercelFetch<VercelDeployment & { errorMessage?: string; buildingAt?: number; ready?: number }>(
      `/v13/deployments/${deploymentId}`
    )

    if (deployment.readyState === 'READY') {
      return { id: deployment.id, state: 'READY', url: `https://${deployment.url}` }
    }
    if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
      return { id: deployment.id, state: deployment.readyState, url: null, errorMessage: deployment.errorMessage }
    }

    await new Promise((r) => setTimeout(r, 3000))
  }
  return { id: deploymentId, state: 'BUILDING', url: null, errorMessage: 'Timeout waiting for deployment' }
}

// ─── Main Deployer ────────────────────────────────────────────────────────────

export async function deployToVercel(
  projectName: string,
  files: GeneratedFile[],
  envVars: Record<string, string> = {},
  onProgress?: ProgressFn
): Promise<DeploymentStatus> {
  const hasToken = !!import.meta.env.VITE_VERCEL_TOKEN

  if (!hasToken) {
    // Simulate deployment for demo mode
    onProgress?.('⚡ Demo mode: simulating Vercel deployment...')
    await new Promise((r) => setTimeout(r, 2000))
    onProgress?.('✅ Demo deployment complete!')
    return {
      id: `demo-${Date.now()}`,
      state: 'READY',
      url: `https://bridgebox-${projectName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}.vercel.app`,
    }
  }

  try {
    await ensureProject(projectName, onProgress)
    const deployment = await createDeployment(projectName, files, envVars, onProgress)
    onProgress?.(`⏳ Build started: ${deployment.id}`)

    const status = await pollDeploymentStatus(deployment.id)
    if (status.state === 'READY') {
      onProgress?.(`✅ Live at: ${status.url}`)
    } else {
      onProgress?.(`❌ Deployment ${status.state}: ${status.errorMessage}`)
    }
    return status
  } catch (err) {
    const msg = (err as Error).message
    onProgress?.(`❌ Deployment failed: ${msg}`)
    return { id: '', state: 'ERROR', url: null, errorMessage: msg }
  }
}
