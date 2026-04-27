/**
 * Vercel Deployment Automation
 * Primary strategy: deploy the self-contained HTML preview as a static site.
 * This requires NO build step and succeeds instantly every time.
 */



export interface VercelDeployment {
  id: string
  url: string
  readyState: 'QUEUED' | 'INITIALIZING' | 'BUILDING' | 'ERROR' | 'CANCELED' | 'READY'
  name: string
  createdAt: number
}

export interface DeploymentStatus {
  id: string
  state: VercelDeployment['readyState'] | 'ERROR'
  url: string | null
  buildDuration?: number
  errorMessage?: string
}

type ProgressFn = (msg: string) => void

const VERCEL_API = 'https://api.vercel.com'

function getToken(): string {
  const token = import.meta.env.VITE_VERCEL_TOKEN
  if (!token) throw new Error('VITE_VERCEL_TOKEN not set.')
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


// ─── Static HTML Deploy (PRIMARY — no build step) ─────────────────────────────

/** Compute SHA1 hash using Web Crypto (returns hex string) */
async function sha1Hex(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Deploys a single self-contained HTML file to Vercel as a static site.
 * Uses the correct Vercel v13 two-step process:
 *   1. Pre-upload file via POST /v2/files (with x-now-digest SHA1 header)
 *   2. Create deployment referencing file by SHA
 */
export async function deployHtmlToVercel(
  projectName: string,
  htmlContent: string,
  onProgress?: ProgressFn
): Promise<DeploymentStatus> {
  const token = import.meta.env.VITE_VERCEL_TOKEN

  if (!token) {
    onProgress?.('⚡ Demo mode: simulating deployment...')
    await new Promise((r) => setTimeout(r, 1500))
    const demoUrl = `https://bb-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.vercel.app`
    onProgress?.(`✅ Demo URL: ${demoUrl}`)
    return { id: `demo-${Date.now()}`, state: 'READY', url: demoUrl }
  }

  // Sanitize name: lowercase, only hyphens/alphanumeric, max 50 chars
  const safeName = `bb-${projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 46)}`

  try {
    onProgress?.(`📦 Preparing: ${safeName}`)

    // ── Step 1: Compute SHA1 of the HTML content ────────────────────────────
    const contentBytes = new TextEncoder().encode(htmlContent)
    const sha = await sha1Hex(htmlContent)
    const size = contentBytes.length

    onProgress?.('🔐 Uploading file...')

    // ── Step 2: Pre-upload the file via /v2/files ───────────────────────────
    const uploadRes = await fetch(`${VERCEL_API}/v2/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': sha,
      },
      body: contentBytes,
    })

    // 200 = uploaded, 409 = already exists (both are OK)
    if (!uploadRes.ok && uploadRes.status !== 409) {
      const errBody = await uploadRes.text()
      throw new Error(`File upload failed (${uploadRes.status}): ${errBody}`)
    }

    onProgress?.('🚀 Creating deployment...')

    // ── Step 3: Create deployment referencing file by SHA ───────────────────
    const deployBody = {
      name: safeName,
      target: 'production',
      files: [
        { file: 'index.html', sha, size },
      ],
      projectSettings: {
        framework: null,
      },
    }

    const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployBody),
    })

    const deployData = await deployRes.json()
    if (!deployRes.ok) {
      throw new Error(`Deployment create failed (${deployRes.status}): ${deployData?.error?.message ?? JSON.stringify(deployData)}`)
    }

    onProgress?.(`⏳ Deploying... (id: ${deployData.id})`)
    return await pollDeploymentStatus(deployData.id, onProgress)

  } catch (err) {
    const msg = (err as Error).message
    console.error('[Vercel Deploy]', msg)
    onProgress?.(`❌ ${msg}`)
    return { id: '', state: 'ERROR', url: null, errorMessage: msg }
  }
}

// ─── Status Polling ───────────────────────────────────────────────────────────

export async function pollDeploymentStatus(
  deploymentId: string,
  onProgress?: ProgressFn,
  maxWaitMs = 120_000
): Promise<DeploymentStatus> {
  const start = Date.now()
  let lastState = ''
  while (Date.now() - start < maxWaitMs) {
    const deployment = await vercelFetch<VercelDeployment & { errorMessage?: string }>(
      `/v13/deployments/${deploymentId}`
    )

    if (deployment.readyState !== lastState) {
      lastState = deployment.readyState
      onProgress?.(`🔄 Status: ${deployment.readyState}`)
    }

    if (deployment.readyState === 'READY') {
      const liveUrl = `https://${deployment.url}`
      onProgress?.(`✅ Live at: ${liveUrl}`)
      return { id: deployment.id, state: 'READY', url: liveUrl }
    }
    if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
      return { id: deployment.id, state: deployment.readyState, url: null, errorMessage: deployment.errorMessage }
    }

    await new Promise((r) => setTimeout(r, 2000))
  }
  return { id: deploymentId, state: 'ERROR', url: null, errorMessage: 'Timeout waiting for deployment' }
}

// ─── Full React/Vite Deployer ────────────────────────────────────────────────

export async function deployFullReactAppToVercel(
  projectName: string,
  files: { path: string, content: string }[],
  onProgress?: ProgressFn
): Promise<DeploymentStatus> {
  const token = import.meta.env.VITE_VERCEL_TOKEN

  if (!token) {
    onProgress?.('⚡ Demo mode: simulating Vercel deployment...')
    await new Promise((r) => setTimeout(r, 2000))
    onProgress?.('✅ Demo deployment complete!')
    return {
      id: `demo-${Date.now()}`,
      state: 'READY',
      url: `https://bridgebox-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${Math.random().toString(36).slice(2, 7)}.vercel.app`,
    }
  }

  const safeName = `bb-${projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 46)}-full`

  try {
    onProgress?.(`📦 Preparing codebase for Vercel...`)
    const uploadedFiles = []

    let i = 0
    for (const f of files) {
      i++
      if (i % 5 === 0) onProgress?.(`🔐 Uploading files to Vercel (${i}/${files.length})...`)
      
      // Sanitize path (remove leading slashes or ./)
      let safePath = f.path.replace(/^(\.\/|\/)+/, '')
      
      const contentBytes = new TextEncoder().encode(f.content)
      const sha = await sha1Hex(f.content)
      const size = contentBytes.length

      const uploadRes = await fetch(`${VERCEL_API}/v2/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': sha,
        },
        body: contentBytes,
      })

      if (!uploadRes.ok && uploadRes.status !== 409) {
        const errBody = await uploadRes.text()
        throw new Error(`File upload failed (${safePath}): ${errBody}`)
      }
      uploadedFiles.push({ file: safePath, sha, size })
    }

    onProgress?.('🚀 Sending to Vercel (this takes 1-3 mins)...')

    const deployBody: Record<string, unknown> = {
      name: safeName,
      target: 'production',
      files: uploadedFiles,
      projectSettings: {
        installCommand: 'npm install --legacy-peer-deps',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        devCommand: null,
      },
    }

    const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployBody),
    })

    const deployData = await deployRes.json()
    if (!deployRes.ok) {
      const errMsg = deployData?.error?.message ?? deployData?.message ?? JSON.stringify(deployData).slice(0, 200)
      throw new Error(`Vercel API error (${deployRes.status}): ${errMsg}`)
    }
    if (!deployData.id) {
      throw new Error(`Vercel returned no deployment ID: ${JSON.stringify(deployData).slice(0, 200)}`)
    }

    onProgress?.(`⏳ Waiting for Vercel Build... (id: ${deployData.id})`)
    return await pollDeploymentStatus(deployData.id, onProgress, 300_000)

  } catch (err) {
    const msg = (err as Error).message
    console.error('[Vercel Deploy Full]', msg)
    onProgress?.(`❌ Deploy error: ${msg}`)
    return { id: '', state: 'ERROR', url: null, errorMessage: msg }
  }
}

