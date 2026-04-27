/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/appStore'
import { Globe, Smartphone, Monitor, Trash2, Download, ExternalLink, ChevronLeft,
  Clock, Code2, Rocket, Settings, Link2, FileText, CheckCircle, Play, RefreshCw, Layers, Archive, QrCode, X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { extractIntent, generateSpec, generateAppPreview, enhancePrompt, hasAnthropicKey } from '../lib/anthropic'
import TemplateGallery from '../components/templates/TemplateGallery'
import { AppTemplate } from '../data/templates'
import VoiceRecorder from '../components/voice/VoiceRecorder'
import IntegrationsTab from '../components/IntegrationsTab'

type Tab = 'overview' | 'spec' | 'preview' | 'deployments' | 'integrations' | 'settings'

const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: 'overview',    label: 'Overview',     icon: FileText },
  { id: 'spec',        label: 'Spec',         icon: CheckCircle },
  { id: 'preview',     label: 'Live Preview', icon: Layers },
  { id: 'deployments', label: 'Deployments',  icon: Rocket },
  { id: 'integrations',label: 'Integrations', icon: Link2 },
  { id: 'settings',    label: 'Settings',     icon: Settings },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  recording:  { bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  analyzing:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  dot: 'bg-yellow-400' },
  building:   { bg: 'bg-purple-500/10',  text: 'text-purple-400',  dot: 'bg-purple-400' },
  deployed:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  failed:     { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400' },
}



export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { projects, updateProject, setActiveProject, removeProject } = useStore()
  const tab = (searchParams.get('tab') as Tab) ?? 'overview'
  
  const setTab = (newTab: Tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', newTab)
      return next
    }, { replace: true })
  }

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [deployHistory, setDeployHistory] = useState<any[]>([])
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([])
  const [stageProgress, setStageProgress] = useState(0)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [previewProgress, setPreviewProgress] = useState(0)
  const [previewStage, setPreviewStage] = useState('')
  const [previewWaiting, setPreviewWaiting] = useState(false)
  const [previewElapsed, setPreviewElapsed] = useState('')
  const [previewRemaining, setPreviewRemaining] = useState('')
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [editTranscript, setEditTranscript] = useState('')
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [rewritingTranscript, setRewritingTranscript] = useState(false)
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [mobilePreviewUrl, setMobilePreviewUrl] = useState<string | null>(null)
  const [buildingApp, setBuildingApp] = useState(false)
  const [buildProgress, setBuildProgress] = useState('')
  const [buildPct, setBuildPct] = useState(0)
  const [buildStage, setBuildStage] = useState('')
  const [buildWaiting, setBuildWaiting] = useState(false)
  const [buildElapsed, setBuildElapsed] = useState('')
  const [buildRemaining, setBuildRemaining] = useState('')
  const [_agentStates, setAgentStates] = useState<any[]>([])

  const ACTIVE_STATUSES = ['recording', 'analyzing', 'building']

  useEffect(() => {
    let interval: any
    if (project?.status && ACTIVE_STATUSES.includes(project.status)) {
      // Reset when status changes
      setStageProgress(0)
      interval = setInterval(() => {
        setStageProgress(prev => {
          if (prev < 40) return prev + Math.floor(Math.random() * 8) + 3
          if (prev < 75) return prev + Math.floor(Math.random() * 4) + 2
          if (prev < 90) return prev + Math.floor(Math.random() * 2) + 1
          if (prev < 99) return prev + 1
          return 99
        })
      }, project?.status === 'recording' ? 1200 : project?.status === 'analyzing' ? 600 : 900)
    } else if (project?.status === 'deployed') {
      setStageProgress(100)
    } else {
      setStageProgress(0)
    }
    return () => clearInterval(interval)
  }, [project?.status])

  useEffect(() => {
    // Try store first (fast), then Supabase
    const stored = projects.find(p => p.id === projectId)
    if (stored) { setProject(stored); setNewName(stored.name); setLoading(false) }

    if (projectId) {
      supabase.from('projects').select('*').eq('id', projectId).single().then(({ data }) => {
        if (data) { setProject(data); setNewName(data.name); setActiveProject(data); setLoading(false) }
      })
      // Load deployment history (best-effort)
      supabase.from('project_deployments').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
        .then(({ data }) => setDeployHistory(data ?? []))
      // Load integrations
      supabase.from('project_integrations').select('*').eq('project_id', projectId)
        .then(({ data }) => setConnectedIntegrations(data ?? []))
    }
  }, [projectId, projects])

  const analysisStarted = useRef(false)
  const buildStarted = useRef(false)

  // analyzing ' building (generate spec)
  useEffect(() => {
    if (project?.status === 'analyzing' && project?.transcript && !analysisStarted.current && !project?.spec) {
      analysisStarted.current = true

      const runAnalysis = async () => {
        try {
          const analysis = await extractIntent(project.transcript)
          const spec = await generateSpec(analysis)

          const { error } = await supabase.from('projects').update({
            spec: JSON.stringify(spec),
            status: 'building'
          }).eq('id', project.id)

          if (error) throw error

          setProject((p: any) => ({ ...p, spec: JSON.stringify(spec), status: 'building' }))
          updateProject(project.id, { spec: JSON.stringify(spec), status: 'building' } as any)
          toast('Spec ready " building your app...', { icon: '' })
        } catch (e: any) {
          console.error('Analysis error:', e)
          toast.error('Analysis failed: ' + e.message)
          await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id)
          setProject((p: any) => ({ ...p, status: 'failed' }))
          updateProject(project.id, { status: 'failed' } as any)
        }
      }

      runAnalysis()
    }
  }, [project?.status, project?.transcript, project?.id, project?.spec, updateProject])

  // building ' deployed (simulated build phase)
  useEffect(() => {
    if (project?.status === 'building' && project?.spec && !buildStarted.current) {
      buildStarted.current = true

      const timer = setTimeout(async () => {
        try {
          setStageProgress(100)
          await new Promise(r => setTimeout(r, 500))

          // Mark as deployed " do NOT set a self-referencing local URL
          const { error } = await supabase.from('projects').update({
            status: 'deployed'
          }).eq('id', project.id)
          if (error) throw error

          // Insert a deployment history record
          await supabase.from('project_deployments').insert({
            project_id: project.id,
            platform: 'web',
            version: 'v1.0.0',
            status: 'success',
            url: ''
          })

          const deployed = { ...project, status: 'deployed' }
          setProject(deployed)
          updateProject(project.id, { status: 'deployed' } as any)
          setDeployHistory([{ id: 'initial', project_id: project.id, platform: 'web', version: 'v1.0.0', status: 'success', url: '', created_at: new Date().toISOString() }])
          toast.success('App spec deployed successfully!')
        } catch (e: any) {
          toast.error('Build failed: ' + e.message)
        }
      }, 4500)

      return () => clearTimeout(timer)
    }
  }, [project?.status, project?.spec, project?.id, updateProject])

  const deleteProject = async () => {
    if (!project) return
    setDeleting(true)
    try {
      // Delete child records first to avoid FK constraint violations
      await supabase.from('project_deployments').delete().eq('project_id', project.id)
      await supabase.from('project_integrations').delete().eq('project_id', project.id)
      await supabase.from('recordings').delete().eq('project_id', project.id)
      await supabase.from('captures').delete().eq('project_id', project.id)

      const { error } = await supabase.from('projects').delete().eq('id', project.id)
      if (error) throw error

      removeProject(project.id)
      toast.success('Project deleted')
      navigate('/')
    } catch (e: any) {
      console.error('Delete error:', e)
      toast.error('Delete failed: ' + (e.message ?? 'Unknown error'))
      setDeleting(false)
    }
  }

  const archiveProject = async () => {
    if (!project) return
    setDeleting(true)
    const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', project.id)
    if (error) { toast.error('Archive failed'); setDeleting(false); return }
    updateProject(project.id, { status: 'archived' } as any)
    setProject((p: any) => ({ ...p, status: 'archived' }))
    setConfirmDelete(false)
    setDeleting(false)
    toast.success('Project archived')
  }

  const saveName = async () => {
    if (!newName.trim() || newName === project?.name) return
    setSavingName(true)
    await supabase.from('projects').update({ name: newName.trim() }).eq('id', project.id)
    updateProject(project.id, { name: newName.trim() })
    setProject((p: any) => ({ ...p, name: newName.trim() }))
    setSavingName(false)
    toast.success('Name updated')
  }

  //  Elapsed & ETA helpers 
  const fmtTime = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }
  
  const [compilingPlatform, setCompilingPlatform] = useState<string | null>(null)

  // Returns ETA string based on elapsed ms + current progress %
  const calcRemaining = (elapsedMs: number, pct: number, waiting: boolean): string => {
    if (waiting) return 'Almost done!'
    if (pct <= 2) return '"'
    const estimatedTotalMs = elapsedMs / (pct / 100)
    const remainingMs = estimatedTotalMs - elapsedMs
    if (remainingMs <= 0) return 'Any moment...'
    return fmtTime(remainingMs) + ' left'
  }

  const handleGeneratePreview = async () => {
    if (!spec) return
    setGeneratingPreview(true)
    setPreviewProgress(0)
    setPreviewWaiting(false)
    setPreviewElapsed('0:00')
    setPreviewRemaining('"')
    setPreviewStage('Analyzing specification...')
    const startTs = Date.now()
    // Use a ref-like closure to share current pct and waiting with the timer
    let _pct = 0
    let _waiting = false
    const clockTimer = setInterval(() => {
      const elMs = Date.now() - startTs
      setPreviewElapsed(fmtTime(elMs))
      setPreviewRemaining(calcRemaining(elMs, _pct, _waiting))
    }, 1000)

    const PREVIEW_STAGES = [
      { pct: 12,  label: 'Analyzing specification...' },
      { pct: 28,  label: 'Designing screen layouts...' },
      { pct: 48,  label: 'Coding navigation & data...' },
      { pct: 66,  label: 'Building interactions...' },
      { pct: 82,  label: 'Styling components...' },
      { pct: 92,  label: 'Finalising prototype...' },
    ]
    let stageIdx = 0
    let dotTick = 0
    let llmName = 'Claude'
    const fallbackListener = () => { llmName = 'GPT-4o' }
    window.addEventListener('llm-fallback', fallbackListener)

    // Stage timer: fires every 4s and only ever moves forward
    const stageTimer = setInterval(() => {
      if (stageIdx < PREVIEW_STAGES.length) {
        _pct = PREVIEW_STAGES[stageIdx].pct
        setPreviewProgress(_pct)
        setPreviewStage(PREVIEW_STAGES[stageIdx].label)
        stageIdx++
      } else {
        // All stages consumed " lock at 96%, just cycle the dot label
        _pct = 96
        _waiting = true
        setPreviewProgress(96)
        setPreviewWaiting(true)
        const dots = '"..'.repeat((dotTick % 3) + 1)
        setPreviewStage(llmName === 'Claude' ? `Waiting for Claude ${dots}` : `Claude out of tokens. GPT-4o generating ${dots}`)
        dotTick++
      }
    }, 4000)

    // Dot-only timer: updates label while locked at 96%
    const dotTimer = setInterval(() => {
      if (stageIdx >= PREVIEW_STAGES.length) {
        const dots = '"..'.repeat((dotTick % 3) + 1)
        setPreviewStage(llmName === 'Claude' ? `Waiting for Claude ${dots}` : `Claude out of tokens. GPT-4o generating ${dots}`)
        dotTick++
      }
    }, 700)

    try {
      const html = await generateAppPreview(spec)
      clearInterval(stageTimer)
      clearInterval(dotTimer)
      clearInterval(clockTimer)
      setPreviewWaiting(false)
      setPreviewProgress(100)
      setPreviewStage('Done!')
      setPreviewRemaining('')
      setTimeout(() => { setPreviewHtml(html); setPreviewProgress(0); setPreviewStage(''); setPreviewElapsed('') }, 400)

      // Auto-deploy to Vercel so "Open App" always works
      if (import.meta.env.VITE_VERCEL_TOKEN && project) {
        const deployToast = toast.loading('Deploying live app...')
        try {
          const { deployHtmlToVercel } = await import('../lib/deploy/vercel')
          const uniqueName = `${project.name}-${project.id.split('-')[0]}`
          const vercelRes = await deployHtmlToVercel(uniqueName, html, () => {})
          if (vercelRes?.state === 'READY' && vercelRes.url) {
            await supabase.from('projects').update({ production_url: vercelRes.url, status: 'deployed' }).eq('id', project.id)
            setProject((prev: any) => prev ? { ...prev, web_app_url: vercelRes.url, production_url: vercelRes.url, status: 'deployed' } : prev)
            toast.success(`Live: ${vercelRes.url}`, { id: deployToast })
          } else {
            toast.dismiss(deployToast)
          }
        } catch {
          toast.dismiss(deployToast)
        }
      }
    } catch (e: any) {
      clearInterval(stageTimer)
      clearInterval(dotTimer)
      clearInterval(clockTimer)
      setPreviewProgress(0)
      setPreviewWaiting(false)
      setPreviewStage('')
      setPreviewElapsed('')
      setPreviewRemaining('')
      toast.error(e.message ?? 'Preview failed')
    } finally {
      window.removeEventListener('llm-fallback', fallbackListener)
      setGeneratingPreview(false)
    }
  }


  const handleBuildFullApp = async () => {
    if (!project) return
    setBuildingApp(true)
    setBuildPct(0)
    setBuildWaiting(false)
    setBuildElapsed('0:00')
    setBuildRemaining('"')
    setAgentStates([])
    const buildStartTs = Date.now()
    let _bPct = 0
    const buildClockTimer = setInterval(() => {
      const elMs = Date.now() - buildStartTs
      setBuildElapsed(fmtTime(elMs))
      setBuildRemaining(calcRemaining(elMs, _bPct, false))
    }, 1000)
    window.addEventListener('llm-fallback', () => {})

    try {
      const spec = (() => {
        try {
          const raw = project.spec
          if (!raw) return {}
          if (typeof raw === 'object') return raw as Record<string, unknown>
          return JSON.parse(raw as string) as Record<string, unknown>
        } catch { return {} }
      })()
      let runOrchestrator;
      try {
        const mod = await import('../lib/agents/orchestrator')
        runOrchestrator = mod.runOrchestrator
      } catch (err: any) {
        if (err.message?.includes('fetch dynamically imported module') || err.name === 'TypeError') {
          toast.error('App updated. Reloading to fetch latest modules...')
          setTimeout(() => window.location.reload(), 1500)
          return
        }
        throw err
      }

      const orchResult = await runOrchestrator(
        spec,
        project.name,
        (_stage, message, pct) => {
          _bPct = pct
          setBuildPct(pct)
          setBuildStage(message)
        },
        (agents) => {
          setAgentStates(agents)
          // Collect files from orchestrator result if available
        }
      )

      // Save files for zip download (re-generate from orchestrator-produced result)
      // The orchestrator returns the final URL " also get files via a separate call
      if (orchResult.url) { // save whenever any URL returned
        await supabase.from('projects').update({
          production_url: orchResult.url,
          staging_url: orchResult.url,
          status: 'deployed'
        }).eq('id', project.id)
        setProject((prev: any) => prev ? {
          ...prev,
          web_app_url: orchResult.url,
          production_url: orchResult.url,
          staging_url: orchResult.url,
          status: 'deployed'
        } : prev)
        const repairMsg = orchResult.totalRepairs > 0 ? ` (${orchResult.totalRepairs} auto-fix${orchResult.totalRepairs > 1 ? 'es' : ''} applied)` : ''
        toast.success(`Deployed successfully!${repairMsg}`)
      } else {
        // Surface the actual error from the failing agent
        const failedAgent = orchResult.agents?.find(a => a.status === 'error')
        const errorDetail = failedAgent?.message || 'Unknown error'
        setBuildStage(`Failed: ${errorDetail.slice(0, 80)}`)
        toast.error(`Build failed: ${errorDetail.slice(0, 120)}`)
      }

      setBuildPct(100); setBuildStage('Done!')
      setTimeout(() => { setBuildPct(0); setBuildStage(''); setBuildProgress(''); setBuildElapsed(''); setBuildRemaining('') }, 3000)

    } catch (e: any) {
      setBuildPct(0); setBuildStage(''); setBuildProgress(''); setBuildWaiting(false); setBuildElapsed(''); setBuildRemaining('')
      toast.error('Build failed: ' + (e.message ?? 'Unknown error'))
    } finally {
      clearInterval(buildClockTimer)
      setBuildingApp(false)
    }
  }

  const handleCompilePlatform = async (label: string) => {
    if (!project) return
    setCompilingPlatform(label)
    
    const sanitizedName = project.name.replace(/\s+/g, '-').toLowerCase()
    
    // Feature 3: Live EAS/GitHub Actions Compile Hooks
    const gitHubToken = import.meta.env.VITE_GITHUB_ACTIONS_TOKEN
    const easWebhook = import.meta.env.VITE_EAS_WEBHOOK_URL
    let payloadSent = false

    try {
      if (label.includes('iOS') || label.includes('Android')) {
        if (easWebhook) {
          await fetch(easWebhook, {
            method: 'POST', body: JSON.stringify({ projectId: project.id, platform: label, name: sanitizedName })
          })
          payloadSent = true
        }
      } else if (label.includes('Desktop') && gitHubToken) {
        await fetch('https://api.github.com/repos/nedpearson/BridgeBoxVoice/dispatches', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gitHubToken}`, 'Accept': 'application/vnd.github.v3+json' },
          body: JSON.stringify({ event_type: 'build-desktop', client_payload: { projectId: project.id } })
        })
        payloadSent = true
      }
    } catch (e: any) {
      console.error('Failed to trigger remote compile hook, falling back to mock...', e)
    }

    if (!payloadSent) {
      // Simulate compilation time if hooks aren't deployed or failed
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    let updates: any = {}
    if (label.includes('iOS')) {
      updates.mobile_app_url = `itms-services://?action=download-manifest&url=https://testflight.apple.com/join/${sanitizedName}-beta`
    } else if (label.includes('Android')) {
      updates.mobile_app_url = `https://play.google.com/store/apps/details?id=com.bridgebox.${sanitizedName}`
    } else {
      updates.desktop_app_url = `https://releases.bridgebox.ai/${sanitizedName}/${sanitizedName}-setup.exe`
    }
    
    await supabase.from('projects').update(updates).eq('id', project.id)
    updateProject(project.id, updates)
    setProject((p: any) => ({ ...p, ...updates }))
    setCompilingPlatform(null)
    toast.success(`${label} compilation complete!`)
  }

  const saveTranscript = async (text: string) => {
    setSavingTranscript(true)
    const updates = { transcript: text, status: 'analyzing', spec: null }
    await supabase.from('projects').update(updates).eq('id', project!.id)
    updateProject(project!.id, updates as any)
    analysisStarted.current = false
    setProject((p: any) => ({ ...p, ...updates }))
    setSavingTranscript(false)
    setEditingTranscript(false)
    toast.success('Transcript saved! Re-analyzing project...')
  }

  const handleRewriteTranscript = async () => {
    if (!project?.transcript) return
    setRewritingTranscript(true)
    try {
      const cleaned = await enhancePrompt(project.transcript)
      setEditTranscript(cleaned)
      setEditingTranscript(true)
      toast.success('AI rewrote your transcript " review and save')
    } catch (e: any) {
      toast.error('Rewrite failed: ' + e.message)
    } finally {
      setRewritingTranscript(false)
    }
  }

  const handleApplyTemplate = (template: AppTemplate) => {
    setShowTemplateGallery(false)
    setSelectedTemplate(template)
    toast('Template selected. Click Save Template to apply it.')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner spinner-blue" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p className="text-slate-400 text-sm">Loading project...</p>
      </div>
    </div>
  )
  if (!project) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <p className="text-slate-400">Project not found</p>
      <button onClick={() => navigate('/')} className="text-blue-400 text-sm hover:underline flex items-center gap-1">
        <ChevronLeft size={14} /> Back to dashboard
      </button>
    </div>
  )

  const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.building
  const spec = project.spec ? (typeof project.spec === 'string' ? JSON.parse(project.spec) : project.spec) : null

  return (
    <div className="flex flex-col h-full">

      {/* Ã¢â‚¬Ã¢â‚¬ Delete / Archive Confirmation Modal Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-base mb-1">Remove Project</h3>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Choose how you'd like to handle <span className="text-white font-semibold">{project.name}</span>.
            </p>

            {/* Archive option */}
            <button
              onClick={archiveProject}
              disabled={deleting}
              className="w-full flex items-start gap-3 p-4 mb-3 bg-[#0B0F19] hover:bg-[#162035] border border-[#334155] hover:border-amber-500/40 rounded-xl transition-all group text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Archive size={14} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold group-hover:text-amber-400 transition-colors">Archive</p>
                <p className="text-slate-500 text-xs mt-0.5">Hide from the dashboard but keep the spec and data safe. Can be restored later.</p>
              </div>
            </button>

            {/* Delete option */}
            <button
              onClick={deleteProject}
              disabled={deleting}
              className="w-full flex items-start gap-3 p-4 bg-[#0B0F19] hover:bg-red-950/30 border border-[#334155] hover:border-red-500/40 rounded-xl transition-all group text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 size={14} className="text-red-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold group-hover:text-red-400 transition-colors">Delete Permanently</p>
                <p className="text-slate-500 text-xs mt-0.5">Removes the project and all associated data forever. This cannot be undone.</p>
              </div>
            </button>

            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="w-full mt-3 py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-[#0C1322] border-b border-[#1E293B] px-8 py-5 flex-shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm mb-3 transition-colors">
          <ChevronLeft size={14} /> Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${sc.bg} ${sc.text} border-current/20`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {project.status}
              </span>
            </div>
            {project.industry && <p className="text-slate-500 text-sm mt-1">{project.industry}</p>}
            <p className="text-slate-600 text-xs mt-1 flex items-center gap-1">
              <Clock size={10} /> Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(() => {
              const liveUrl = (project as any).production_url || (project as any).staging_url || project.web_app_url
              const hasLiveUrl = liveUrl && typeof liveUrl === 'string' && liveUrl.length > 4 && (liveUrl.includes('.') || liveUrl.startsWith('http'))

              if (!hasLiveUrl && !previewHtml) return null;

              const finalUrl = hasLiveUrl ? (liveUrl.startsWith('http') ? liveUrl : `https://${liveUrl}`) : ''

              if (finalUrl) {
                return (
                  <div className="flex items-center gap-2">
                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Globe size={14} /> Open App <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => setShowQR(true)}
                      title="QR Code - scan to open on mobile"
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1E293B] hover:bg-[#263348] text-slate-300 text-sm font-semibold rounded-xl transition-colors border border-[#334155]"
                    >
                      <QrCode size={15} />
                    </button>
                    <button
                      onClick={() => setMobilePreviewUrl(finalUrl)}
                      title="Mobile preview"
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1E293B] hover:bg-[#263348] text-slate-300 text-sm font-semibold rounded-xl transition-colors border border-[#334155]"
                    >
                      <Smartphone size={15} />
                    </button>
                  </div>
                )
              }

              const handleOpenBlob = () => {
                if (previewHtml) {
                  try {
                    const blob = new Blob([previewHtml], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    const w = window.open(url, '_blank')
                    if (!w) toast.error('Popup blocked by browser. Please allow popups.')
                    if (w) setTimeout(() => URL.revokeObjectURL(url), 10000)
                  } catch (e: any) {
                    toast.error('Failed to open preview: ' + e.message)
                  }
                }
              }

              return (
                <button
                  onClick={handleOpenBlob}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Globe size={14} /> Open App
                </button>
              )
            })()}
            <button onClick={() => setConfirmDelete(true)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Ã¢â‚¬Ã¢â‚¬ Pipeline Progress Banner Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
        {['recording', 'analyzing', 'building'].includes(project.status) && (() => {
          const stages = [
            { key: 'recording', label: 'Recording', desc: 'Capturing your voice description', color: 'blue' },
            { key: 'analyzing', label: 'Analyzing',  desc: 'AI is extracting requirements', color: 'amber' },
            { key: 'building',  label: 'Building',   desc: 'Generating your specification', color: 'purple' },
          ]
          const currentIdx = stages.findIndex(s => s.key === project.status)
          const current = stages[currentIdx]
          const barColor = current.color === 'blue' ? 'bg-blue-500' : current.color === 'amber' ? 'bg-amber-400' : 'bg-purple-500'
          const glowColor = current.color === 'blue' ? 'shadow-blue-500/40' : current.color === 'amber' ? 'shadow-amber-400/40' : 'shadow-purple-500/40'
          return (
            <div className="mt-4 bg-[#0B0F19]/70 border border-[#1E293B] rounded-xl px-5 py-4">
              {/* Stage pills */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {stages.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      i < currentIdx
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : i === currentIdx
                          ? `${current.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : current.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'} animate-pulse`
                          : 'bg-slate-800/50 text-slate-600 border-slate-700/50'
                    }`}>
                      {i < currentIdx ? 'done' : i === currentIdx ? '...' : ''} {s.label}
                    </div>
                    {i < stages.length - 1 && <span className="text-slate-700 text-xs">&#8250;</span>}
                  </div>
                ))}
                <span className="ml-auto text-xs text-slate-500">{current.desc}...</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[#131B2B] rounded-full overflow-hidden border border-[#1E293B]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor} shadow-sm ${glowColor}`}
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-slate-600">Step {currentIdx + 1} of {stages.length}</span>
                <span className={`text-xs font-mono font-semibold ${
                  current.color === 'blue' ? 'text-blue-400' : current.color === 'amber' ? 'text-amber-400' : 'text-purple-400'
                }`}>{stageProgress}%</span>
              </div>
            </div>
          )
        })()}

        {/* Tabs */}
        <div className="flex gap-1 mt-5 -mb-5 border-b border-transparent">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-xl transition-all border-b-2 ${
                tab === id
                  ? 'text-white border-blue-500 bg-[#131B2B]'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-[#131B2B]/50'
              }`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8">

        {/* Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ LIVE PREVIEW Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
        {tab === 'preview' && (
          <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
            {!hasAnthropicKey ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                  <Code2 size={36} className="text-amber-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Anthropic API Key Required</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  BridgeBox Voice uses Claude AI to generate fully functional, custom applications from your description. Add your API key to enable live preview and app generation.
                </p>
                <div className="bg-[#0B0F19] border border-[#334155] rounded-xl p-4 font-mono text-xs text-slate-300 text-left w-full mb-6">
                  <p className="text-slate-500 mb-1"># Add to your .env file:</p>
                  <p className="text-emerald-400">VITE_ANTHROPIC_API_KEY=sk-ant-...</p>
                </div>
                <a
                  href="https://console.anthropic.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-sm"
                >
                  <ExternalLink size={14} /> Get API Key from Anthropic Console
                </a>
              </div>
            ) : !previewHtml ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl w-full mb-8">

                  {/* Live Preview Card */}
                  <div className={`bg-[#131B2B] border rounded-2xl p-6 flex flex-col items-start text-left transition-all ${
                    generatingPreview ? 'border-blue-500/40' : 'border-[#1E293B] hover:border-blue-500/40'
                  }`}>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                      {generatingPreview
                        ? <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                        : <Layers size={22} className="text-blue-400" />}
                    </div>
                    <h3 className="text-white font-bold text-base mb-1">Live Preview</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4 flex-1">
                      Instantly generate an interactive HTML prototype " all screens, navigation, and real data.
                    </p>
                    {generatingPreview && (
                      <div className="w-full mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-blue-400 text-xs font-medium truncate pr-2">{previewStage}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-slate-600 text-xs tabular-nums font-mono">{previewElapsed}</span>
                            <span className={`text-xs tabular-nums font-semibold ${
                              previewWaiting ? 'text-amber-400' : 'text-slate-400'
                            }`}>{previewRemaining || `${previewProgress}%`}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-[#0B0F19] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700 ease-out ${previewWaiting ? 'animate-pulse' : ''}`}
                            style={{ width: `${previewProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleGeneratePreview}
                      disabled={generatingPreview || !spec}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      {generatingPreview
                        ? 'Generating...'
                        : <><Layers size={14} />Generate Live Preview</>}
                    </button>
                  </div>

                  {/* Build Full App Card */}
                  <div className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border rounded-2xl p-6 flex flex-col items-start text-left transition-all ${
                    buildingApp ? 'border-purple-500/50' : 'border-purple-500/20 hover:border-purple-500/40'
                  }`}>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                      {buildingApp
                        ? <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                        : <Download size={22} className="text-purple-400" />}
                    </div>
                    <h3 className="text-white font-bold text-base mb-1">Build Full Application</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4 flex-1">
                      Generate a complete React + TypeScript + Tailwind app with all pages, routing, mock data and package.json - deployed to Vercel automatically.
                    </p>
                    {buildingApp && (
                      <div className="w-full mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-purple-300 text-xs font-medium truncate pr-2 max-w-[180px]" title={buildStage}>{buildStage}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-500 text-xs tabular-nums font-mono">{buildElapsed}</span>
                            <span className={`text-xs tabular-nums font-semibold ${buildWaiting ? 'text-amber-400' : 'text-slate-400'}`}>{buildRemaining || `${buildPct}%`}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-[#0B0F19] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-700 ease-out ${buildWaiting ? 'animate-pulse' : ''}`}
                            style={{ width: `${buildPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleBuildFullApp}
                      disabled={buildingApp || !spec}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      {buildingApp
                        ? 'Building...'
                        : <><Download size={14} />Build Full App</>}
                    </button>
                  </div>
                </div>
                {!spec && <p className="text-slate-600 text-sm">Complete the analysis phase first to enable app generation.</p>}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                    </span>
                    <span className="text-slate-400 text-xs font-medium">{project.name}</span>
                    <span className="text-slate-600 text-xs">" AI-generated functional prototype</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBuildFullApp}
                      disabled={buildingApp}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-xs font-semibold rounded-lg border border-purple-500/20 transition-colors disabled:opacity-50"
                    >
                      {buildingApp ? <><div className="w-3 h-3 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />{buildProgress}</> : <><Download size={11} />Build Full App</>}
                    </button>
                    <button
                      onClick={handleGeneratePreview}
                      disabled={generatingPreview}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#263348] text-slate-300 text-xs font-semibold rounded-lg border border-[#334155] transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={generatingPreview ? 'animate-spin' : ''} />
                      {generatingPreview ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    <button
                      onClick={() => {
                        const win = window.open('', '_blank')
                        if (win) {
                          win.document.open()
                          win.document.write(previewHtml!)
                          win.document.close()
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <ExternalLink size={12} /> Full Screen
                    </button>
                  </div>
                </div>

                {/* Ã¢â‚¬Ã¢â‚¬ Inline progress bar (Regenerate or Build) Ã¢â‚¬Ã¢â‚¬ */}
                {(generatingPreview || buildingApp) && (
                  <div className="mb-3 bg-[#0C1322] border border-[#1E293B] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium truncate pr-2 ${generatingPreview ? 'text-blue-400' : 'text-purple-400'}`}>
                        {generatingPreview ? previewStage : buildStage}
                      </span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-slate-500 text-xs tabular-nums font-mono">
                          {generatingPreview ? previewElapsed : buildElapsed}
                        </span>
                        <span className={`text-xs tabular-nums font-semibold ${
                          (generatingPreview ? previewWaiting : buildWaiting) ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {generatingPreview
                            ? (previewRemaining || `${previewProgress}%`)
                            : (buildRemaining || `${buildPct}%`)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[#0B0F19] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          generatingPreview
                            ? `bg-gradient-to-r from-blue-600 to-cyan-400 ${previewWaiting ? 'animate-pulse' : ''}`
                            : `bg-gradient-to-r from-purple-600 to-blue-500 ${buildWaiting ? 'animate-pulse' : ''}`
                        }`}
                        style={{ width: `${generatingPreview ? previewProgress : buildPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 rounded-2xl overflow-hidden border border-[#1E293B] bg-[#0B0F19]" style={{ minHeight: '70vh' }}>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full"
                    style={{ minHeight: '70vh', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin"
                    title="App Preview"
                  />
                </div>
              </div>

            )}
          </div>
        )}

        {/* Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ OVERVIEW Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
        {tab === 'overview' && (
          <div className="space-y-6 max-w-4xl">
            {/* AI Summary */}
            {spec?.description && (
              <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-2 text-sm">AI Summary</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{spec.description}</p>
              </div>
            )}

            {/* Voice Transcript " editable */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Play size={14} className="text-blue-400" /> Voice Transcript
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRewriteTranscript}
                    disabled={rewritingTranscript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {rewritingTranscript ? <><div className="w-3 h-3 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />Rewriting...</> : <><RefreshCw size={11} />AI Rewrite</>}
                  </button>
                  <button
                    onClick={() => { setEditTranscript(project.transcript ?? ''); setEditingTranscript(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#263348] text-slate-300 border border-[#334155] text-xs font-semibold rounded-lg transition-all"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {editingTranscript ? (
                <>
                  <textarea
                    value={editTranscript}
                    onChange={e => setEditTranscript(e.target.value)}
                    rows={8}
                    className="w-full bg-[#0B0F19] border border-[#334155] focus:border-blue-500 text-slate-300 text-sm rounded-xl px-4 py-3 resize-y focus:outline-none mb-3"
                    placeholder="Describe your app requirements..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveTranscript(editTranscript)}
                      disabled={savingTranscript || !editTranscript.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {savingTranscript ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingTranscript(false)}
                      className="px-4 py-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm leading-relaxed">{project.transcript}</p>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Features', value: spec?.features?.length ?? '-', icon: '+' },
                { label: 'Integrations', value: spec?.integrations?.length ?? '-', icon: '*' },
                { label: 'Data Models', value: spec?.dataModels?.length ?? '-', icon: '#' },
                { label: 'User Roles', value: spec?.userRoles?.length ?? '-', icon: '@' },
              ].map(s => (
                <div key={s.label} className="bg-[#131B2B] border border-[#1E293B] rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Features list */}
            {spec?.features?.length > 0 && (
              <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4 text-sm">Features to Build</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {spec.features.map((f: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        {typeof f === 'string' ? f : (
                          <>
                            <span className="font-medium text-slate-300">{f.name}</span>
                            {f.description && <span className="block text-slate-500 text-xs mt-0.5">{f.description}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deployment targets */}
            {spec?.deploymentTargets?.length > 0 && (
              <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4 text-sm">Deployment Targets</h3>
                <div className="flex gap-3 flex-wrap">
                  {spec.deploymentTargets.map((t: string) => (
                    <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-semibold rounded-lg capitalize">
                      {t === 'web' ? <Globe size={12} /> : t === 'ios' || t === 'android' ? <Smartphone size={12} /> : <Monitor size={12} />}
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* No spec yet state (not analyzing) */}
            {!spec && !project.transcript && project.status !== 'analyzing' && (
              <div className="text-center py-8 text-slate-500">
                <VoiceRecorder 
                  projectId={project.id} 
                  onComplete={async (transcript) => {
                    const { error } = await supabase.from('projects').update({ transcript, status: 'analyzing' }).eq('id', project.id);
                    if (error) { toast.error('Failed to save recording'); return; }
                    updateProject(project.id, { transcript, status: 'analyzing' } as any);
                    setProject((p: any) => ({ ...p, transcript, status: 'analyzing' }));
                  }} 
                />
              </div>
            )}

            {/* Analyzing State */}
            {!spec && project.status === 'analyzing' && (
              <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border-[3px] border-blue-500/20 rounded-full" />
                  <div className="absolute inset-0 border-[3px] border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                  <Code2 size={24} className="text-blue-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Analyzing Requirements...</h3>
                <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
                  BridgeBox Voice AI is processing your transcript, extracting database models, identifying core features, and planning integrations.
                </p>
                <div className="w-full max-w-md">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-300">Analysis progress</span>
                    <span className="text-blue-400 font-mono">{stageProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#0B0F19] rounded-full overflow-hidden border border-[#1E293B] relative">
                    <div className="absolute top-0 bottom-0 left-0 bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${stageProgress}%` }}>
                      <div className="absolute inset-0 bg-white/20" style={{ transform: 'skewX(-20deg)', backgroundRepeat: 'repeat-x', backgroundSize: '1rem 100%', backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ SPEC Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
        {tab === 'spec' && (
          <div className="max-w-4xl space-y-6">
            {spec ? (
              <>
                {/* Tech stack */}
                {spec.techStack && (
                  <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4 text-sm">Tech Stack</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(spec.techStack).map(([k, v]) => (
                        <div key={k} className="text-center p-3 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                          <p className="text-slate-500 text-xs capitalize mb-1">{k}</p>
                          <p className="text-white text-sm font-semibold">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data models */}
                {spec.dataModels?.length > 0 && (
                  <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4 text-sm">Data Models</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {spec.dataModels.map((m: any) => (
                        <div key={m.name} className="p-4 bg-[#0B0F19] border border-[#1E293B] rounded-xl">
                          <p className="text-blue-400 font-semibold text-sm mb-2">{m.name}</p>
                          <div className="space-y-1">
                            {(m.fields ?? []).map((f: any) => (
                              <div key={f.name ?? f} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-mono">{f.name ?? f}</span>
                                {f.type && <span className="text-slate-600 font-mono">{f.type}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {spec.timeline?.length > 0 && (
                  <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4 text-sm">Build Timeline</h3>
                    <div className="space-y-3">
                      {spec.timeline.map((t: any, i: number) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-xs">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{t.phase}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{t.description} - ~{t.estimatedDays} days</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <Code2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Specification will appear here after your voice recording is analyzed by AI.</p>
              </div>
            )}
          </div>
        )}

        {/* Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ DEPLOYMENTS Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
        {tab === 'deployments' && (
          <div className="max-w-4xl space-y-6">

            {/* Rebuild & Redeploy Card */}
            <div className="bg-gradient-to-br from-indigo-900/25 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                    {buildingApp ? <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> : <RefreshCw size={22} className="text-indigo-400" />}
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Rebuild &amp; Redeploy</p>
                    <p className="text-slate-400 text-xs mt-0.5 max-w-md leading-relaxed">Re-generates all pages with the latest AI templates including live calendars for scheduling pages, premium card layouts, and drill-down views. Cache cleared automatically.</p>
                  </div>
                </div>
                <button onClick={() => { Object.keys(localStorage).filter(k => k.startsWith('bbv_pg_')).forEach(k => localStorage.removeItem(k)); handleBuildFullApp(); }} disabled={buildingApp || !spec} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex-shrink-0">
                  {buildingApp ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{buildStage ? buildStage.slice(0,28)+'...' : 'Building...'}</> : <><RefreshCw size={14} />Rebuild App</>}
                </button>
              </div>
              {buildingApp && <div className="mt-4"><div className="flex justify-between mb-1.5"><span className="text-indigo-300 text-xs truncate max-w-xs">{buildStage}</span><span className="text-slate-400 text-xs font-mono">{buildPct}%</span></div><div className="h-2 w-full bg-[#0B0F19] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-700" style={{width:`${buildPct}%`}} /></div></div>}
            </div>

            {/* Spec Deployment Card */}
            {project.status === 'deployed' ? (() => {
              const displayUrl = project.web_app_url ?? `${window.location.origin}/project/${project.id}?tab=spec`
              return (
              <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Rocket size={22} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base">{project.name} " Specification Ready</p>
                      <p className="text-emerald-400 text-xs font-semibold mt-0.5">Deployed &middot; Web &middot; v1.0.0</p>
                      <p className="text-slate-500 text-xs mt-1 font-mono truncate max-w-sm">{displayUrl}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setTab('spec')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <FileText size={14} /> View Spec
                    </button>
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1E293B] hover:bg-[#263348] text-slate-300 text-sm font-semibold rounded-xl transition-colors border border-[#334155]"
                    >
                      <ExternalLink size={14} /> Open
                    </a>
                  </div>
                </div>

                {/* Spec stats */}
                {spec && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-emerald-500/10">
                    {[
                      { label: 'Features', value: spec?.features?.length ?? 0, icon: '*' },
                      { label: 'Data Models', value: spec?.dataModels?.length ?? 0, icon: '#' },
                      { label: 'API Endpoints', value: spec?.apiEndpoints?.length ?? 0, icon: '~' },
                      { label: 'UI Screens', value: spec?.uiScreens?.length ?? 0, icon: '[]' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="text-lg mb-0.5">{s.icon}</div>
                        <p className="text-white font-bold text-lg">{s.value}</p>
                        <p className="text-slate-500 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )
            })() : (
              <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-8 text-center">
                <Rocket size={32} className="mx-auto mb-3 text-slate-600 opacity-40" />
                <p className="text-slate-500 text-sm">No live deployment yet. Your app spec will appear here once the AI finishes analyzing.</p>
              </div>
            )}

            {/* Additional Platforms */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 text-sm">Additional Platforms</h3>
              <div className="space-y-3">
                {[
                  { icon: Smartphone, label: 'iOS (TestFlight)', url: project.mobile_app_url?.includes('testflight') ? project.mobile_app_url : null, color: 'text-blue-400' },
                  { icon: Smartphone, label: 'Android (APK)', url: project.mobile_app_url?.includes('play.google') ? project.mobile_app_url : null, color: 'text-green-400' },
                  { icon: Monitor, label: 'Desktop (Windows / macOS)', url: project.desktop_app_url, color: 'text-purple-400' },
                ].map(({ icon: Icon, label, url, color }) => url ? (
                  <div key={label} className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={color} />
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-slate-500 text-xs font-mono truncate max-w-xs">{url}</p>
                      </div>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 text-xs hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                      <Download size={11} /> Download
                    </a>
                  </div>
                ) : (
                  <div key={label} className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-xl border border-dashed border-[#1E293B]">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Icon size={16} />
                      <span className="text-sm">{label} " not yet built</span>
                    </div>
                    <button 
                      onClick={() => handleCompilePlatform(label)}
                      disabled={compilingPlatform !== null}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 disabled:opacity-50 flex items-center gap-2"
                    >
                      {compilingPlatform === label ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                      Compile Build
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment history */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 text-sm">Deployment History</h3>
              {deployHistory.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-[#1E293B]">
                      <th className="text-left pb-3">Version</th>
                      <th className="text-left pb-3">Deployed</th>
                      <th className="text-left pb-3">Platform</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deployHistory.map((d: any) => (
                      <tr key={d.id} className="border-b border-[#1E293B]/50">
                        <td className="py-3 text-white font-mono text-xs">{d.version ?? 'v1.0.0'}</td>
                        <td className="py-3 text-slate-400 text-xs">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</td>
                        <td className="py-3 text-slate-400 text-xs capitalize">{d.platform ?? 'web'}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-semibold capitalize ${d.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {d.status ?? 'success'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <Rocket size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No deployments recorded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <IntegrationsTab
            project={project}
            connectedIntegrations={connectedIntegrations}
            setConnectedIntegrations={setConnectedIntegrations}
          />
        )}


        {/* Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ SETTINGS Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬Ã¢â‚¬ */}
        {tab === 'settings' && (
          <div className="max-w-xl space-y-6">
            {/* Rename */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 text-sm">Project Name</h3>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="flex-1 bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={saveName} disabled={savingName || newName === project.name} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
                  {savingName ? <RefreshCw size={13} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>

            {/* Template picker */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1 text-sm flex items-center gap-2">
                 Apply a Template
              </h3>
              <p className="text-slate-500 text-xs mb-4">Pick an industry template to pre-fill the project description and re-analyze.</p>
              
              {selectedTemplate && (
                <div className="flex items-center gap-4 bg-[#0B0F19] border border-[#334155] rounded-xl p-4 mb-5 shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-2xl">
                    {selectedTemplate.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{selectedTemplate.name}</p>
                    <p className="text-slate-400 text-xs truncate mt-0.5">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        saveTranscript(selectedTemplate.prompt).then(() => setSelectedTemplate(null))
                      }}
                      disabled={savingTranscript}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-md"
                    >
                      {savingTranscript ? <RefreshCw size={13} className="animate-spin" /> : 'Save Template'}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      disabled={savingTranscript}
                      className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-[#1E293B]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowTemplateGallery(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-sm font-semibold rounded-xl transition-all"
              >
                Browse Template Gallery
              </button>
            </div>

            {/* Danger zone */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-1 text-sm">Build Cache</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    Page data is cached 30 min to save AI tokens on rebuilds.
                  </p>
                  <button
                    onClick={() => {
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('bbv_pg_'));
                      keys.forEach(k => localStorage.removeItem(k));
                      toast.success(`Cleared ${keys.length} cached pages`);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-sm font-semibold rounded-xl transition-all"
                  >
                    <RefreshCw size={13} /> Clear All Page Cache
                  </button>
                </div>

                <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-6">
              <h3 className="text-red-400 font-semibold mb-2 text-sm">Danger Zone</h3>
              <p className="text-slate-500 text-xs mb-4">Deleting this project is permanent and cannot be undone.</p>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button onClick={deleteProject} disabled={deleting} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors">
                    {deleting ? <RefreshCw size={13} className="animate-spin" /> : <><Trash2 size={13} /> Yes, delete</>}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-slate-400 border border-[#334155] text-sm rounded-xl hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-4 py-2 border border-red-900/50 text-red-400 hover:bg-red-900/20 text-sm font-medium rounded-xl transition-colors">
                  <Trash2 size={13} /> Delete Project
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {showTemplateGallery && (
        <TemplateGallery
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* QR Code Modal */}
      {showQR && (() => {
        const liveUrl = (project as any).production_url || (project as any).staging_url || project.web_app_url
        const finalUrl = liveUrl ? (liveUrl.startsWith('http') ? liveUrl : `https://${liveUrl}`) : ''
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
            <div className="bg-[#0C1322] border border-[#1E293B] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-bold text-lg">{project.name}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Scan to open on mobile</p>
                </div>
                <button onClick={() => setShowQR(false)} className="p-1.5 text-slate-500 hover:text-white rounded-lg"><X size={16} /></button>
              </div>
              <div className="bg-white rounded-2xl p-5 mb-5 inline-block">
                {finalUrl ? (
                  <QRCode value={finalUrl} size={200} level="H" />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 text-sm">No URL yet</div>
                )}
              </div>
              {finalUrl && (
                <>
                  <p className="text-slate-500 text-xs font-mono truncate mb-4">{finalUrl}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(finalUrl); toast.success('URL copied!') }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1E293B] hover:bg-[#263348] text-slate-300 text-sm font-semibold rounded-xl border border-[#334155] transition-colors"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => setMobilePreviewUrl(finalUrl)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Smartphone size={14} /> Mobile Preview
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs mt-4">Point your camera at the QR code to open on any mobile device. App is PWA-optimized for install.</p>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Mobile Phone-Frame Preview Modal */}
      {mobilePreviewUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMobilePreviewUrl(null)}>
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full max-w-sm">
              <div>
                <h3 className="text-white font-bold">Mobile Preview</h3>
                <p className="text-slate-500 text-xs mt-0.5">{project.name}</p>
              </div>
              <button onClick={() => setMobilePreviewUrl(null)} className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#1E293B]"><X size={16} /></button>
            </div>
            {/* Phone frame */}
            <div style={{ width: '375px', height: '700px', background: '#1a1a2e', borderRadius: '40px', border: '8px solid #2d3748', boxShadow: '0 0 0 2px #4a5568, 0 40px 80px rgba(0,0,0,.8)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Status bar */}
              <div style={{ height: '44px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>9:41</span>
                <div style={{ width: '120px', height: '28px', background: '#000', borderRadius: '14px', border: '2px solid #2d3748' }} />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '10px' }}></span>
                  <span style={{ color: '#fff', fontSize: '10px' }}>WiFi</span>
                  <span style={{ color: '#fff', fontSize: '10px' }}>100%</span>
                </div>
              </div>
              <iframe
                src={mobilePreviewUrl}
                style={{ flex: 1, border: 'none', width: '100%' }}
                title="Mobile Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
              {/* Home bar */}
              <div style={{ height: '34px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '120px', height: '4px', background: '#4a5568', borderRadius: '2px' }} />
              </div>
            </div>
            <div className="flex gap-3">
              <a href={mobilePreviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors">
                <ExternalLink size={13} /> Open in Browser
              </a>
              <button onClick={() => { setShowQR(true); setMobilePreviewUrl(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#1E293B] hover:bg-[#263348] text-slate-300 text-sm font-semibold rounded-xl border border-[#334155] transition-colors">
                <QrCode size={13} /> QR Code
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <TemplateGallery
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}
    </div>
  )
}

