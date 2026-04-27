import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, ExternalLink, Trash2, FolderPlus, X, Monitor, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface Capture {
  id: string
  workspace_id: string
  project_id: string | null
  url: string
  thumbnail_url: string | null
  type: 'screenshot' | 'video'
  created_at: string
  title: string | null
}

const INSTALL_STEPS = [
  {
    num: '01',
    title: 'Extract the downloaded ZIP',
    desc: 'Open your Downloads folder. Right-click bridgebox-voice-extension.zip → "Extract All" (Windows) or double-click (Mac). Note where you saved the folder.',
    icon: '📦',
    color: '#6366F1',
    tip: 'The extracted folder will contain a manifest.json file inside it.',
  },
  {
    num: '02',
    title: 'Open Chrome Extensions',
    desc: 'In Google Chrome, paste chrome://extensions in the address bar and hit Enter. Alternatively: click the ⋮ menu → More tools → Extensions.',
    icon: '🌐',
    color: '#8B5CF6',
    tip: 'You can also click the puzzle piece 🧩 icon in the Chrome toolbar.',
  },
  {
    num: '03',
    title: 'Enable Developer Mode',
    desc: 'In the top-right corner of the Extensions page, flip the "Developer mode" toggle ON. Three new buttons will appear in the toolbar.',
    icon: '🔧',
    color: '#EC4899',
    tip: 'Developer mode is required to load extensions that aren\'t from the Web Store.',
  },
  {
    num: '04',
    title: 'Load the unpacked extension',
    desc: 'Click "Load unpacked" → browse to and select the extracted folder → click "Select Folder". Bridgebox Voice Capture will appear instantly!',
    icon: '✅',
    color: '#22C55E',
    tip: 'Always select the folder that contains manifest.json — not a parent folder.',
  },
]

const getHostname = (urlStr?: string | null) => {
  try { return urlStr ? new URL(urlStr).hostname : 'Unknown URL' }
  catch { return urlStr || 'Unknown URL' }
}
const safeDate = (dateStr?: string | null) => {
  try { return dateStr ? formatDistanceToNow(new Date(dateStr), { addSuffix: true }) : 'Unknown date' }
  catch { return 'Unknown date' }
}

export default function CapturesPage() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Capture | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [addingToProject, setAddingToProject] = useState<string | null>(null)

  // Extension install modal state
  const [showInstall, setShowInstall] = useState(false)
  const [installStep, setInstallStep] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single()
        if (!ws) { setLoading(false); return }
        const [{ data: caps }, { data: ps }] = await Promise.all([
          supabase.from('screen_captures').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
          supabase.from('projects').select('id, name').eq('workspace_id', ws.id),
        ])
        setCaptures((caps ?? []) as Capture[])
        setProjects(ps ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDownloadExtension = () => {
    // Trigger ZIP download immediately
    const a = document.createElement('a')
    a.href = '/bridgebox-extension.zip'
    a.download = 'bridgebox-voice-extension.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Open guided install modal
    setInstallStep(0)
    setShowInstall(true)
  }

  const deleteCapture = async (id: string) => {
    await supabase.from('screen_captures').delete().eq('id', id)
    setCaptures(c => c.filter(x => x.id !== id))
    setSelected(null)
    toast.success('Capture deleted')
  }

  const attachToProject = async (captureId: string, projectId: string) => {
    await supabase.from('screen_captures').update({ project_id: projectId }).eq('id', captureId)
    setCaptures(c => c.map(x => x.id === captureId ? { ...x, project_id: projectId } : x))
    setAddingToProject(null)
    toast.success('Added to project')
  }

  const cur = INSTALL_STEPS[installStep]

  return (
    <div className="p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Screen Captures</h1>
          <p className="text-slate-400 text-sm mt-1">
            Screenshots and recordings captured by the{' '}
            <button onClick={handleDownloadExtension} className="text-blue-400 hover:underline">Bridgebox Voice Chrome extension</button>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {captures.length > 0 && (
            <span className="text-slate-500 text-sm">{captures.length} captures</span>
          )}
          <button
            onClick={handleDownloadExtension}
            className="flex items-center gap-2 px-4 py-2 bg-[#131B2B] border border-[#1E293B] hover:border-blue-500/50 hover:bg-[#1a2338] rounded-xl text-sm text-white font-medium transition-all group"
          >
            <Download size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
            Get Extension
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-[#131B2B] rounded-xl border border-[#1E293B] animate-pulse" />
          ))}
        </div>
      ) : captures.length === 0 ? (
        <div className="border-2 border-dashed border-[#1E293B] rounded-2xl p-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 border border-[#1E293B] flex items-center justify-center mb-4">
            <Camera size={28} className="text-slate-500" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">No captures yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            Install the Bridgebox Voice Chrome extension to start capturing websites and workflows.
          </p>
          <button
            onClick={handleDownloadExtension}
            className="flex items-center gap-3 p-4 bg-[#131B2B] border border-[#1E293B] rounded-xl text-left max-w-sm hover:border-blue-500/50 hover:bg-[#1a2338] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/25 transition-colors">
              <Monitor size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Download Chrome Extension</p>
              <p className="text-slate-500 text-xs">Capture screenshots & videos of any workflow</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {captures.map(cap => (
            <div
              key={cap.id}
              className="group relative bg-[#131B2B] border border-[#1E293B] hover:border-[#334155] rounded-xl overflow-hidden cursor-pointer transition-all"
              onClick={() => setSelected(cap)}
            >
              <div className="aspect-video bg-[#0B0F19] relative overflow-hidden">
                {cap.thumbnail_url ? (
                  <img src={cap.thumbnail_url} alt={cap.title || cap.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera size={24} className="text-slate-600" />
                  </div>
                )}
                <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-slate-300 uppercase tracking-wide">
                  {cap.type}
                </span>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-slate-300 text-xs font-medium truncate">{cap.title || getHostname(cap.url)}</p>
                <p className="text-slate-600 text-[10px] mt-0.5">{safeDate(cap.created_at)}</p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={e => { e.stopPropagation(); setAddingToProject(cap.id) }}
                  className="w-7 h-7 bg-black/70 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  title="Add to project"
                >
                  <FolderPlus size={12} className="text-white" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); deleteCapture(cap.id) }}
                  className="w-7 h-7 bg-black/70 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} className="text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Guided Extension Install Modal ─────────────────────────────────── */}
      {showInstall && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowInstall(false)}
        >
          <div
            className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-base">Install Bridgebox Voice Extension</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  ZIP is downloading — follow these 4 steps to activate it
                </p>
              </div>
              <button onClick={() => setShowInstall(false)} className="text-slate-600 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Animated progress bar */}
            <div className="h-1 bg-[#1E293B]">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${((installStep + 1) / INSTALL_STEPS.length) * 100}%`, background: cur.color }}
              />
            </div>

            {/* Step content */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                  style={{ background: `${cur.color}18`, border: `1px solid ${cur.color}35` }}
                >
                  {cur.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold tracking-wide" style={{ color: cur.color }}>STEP {cur.num}</span>
                    <span className="text-slate-700 text-xs">/ 04</span>
                  </div>
                  <h3 className="text-white font-bold text-base mb-2">{cur.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{cur.desc}</p>
                </div>
              </div>

              {/* Tip box */}
              <div className="p-3 rounded-xl bg-[#131B2B] border border-[#1E293B] mb-5 flex items-start gap-2">
                <span className="text-sm">💡</span>
                <p className="text-slate-400 text-xs leading-relaxed">{cur.tip}</p>
              </div>

              {/* Step indicator dots */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {INSTALL_STEPS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInstallStep(i)}
                    className="transition-all duration-300"
                    style={{
                      width: i === installStep ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: i <= installStep ? cur.color : '#1E293B',
                    }}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3">
                {installStep > 0 && (
                  <button
                    onClick={() => setInstallStep(s => s - 1)}
                    className="flex-1 py-2.5 rounded-xl border border-[#334155] text-slate-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    ← Back
                  </button>
                )}
                {installStep < INSTALL_STEPS.length - 1 ? (
                  <button
                    onClick={() => setInstallStep(s => s + 1)}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${cur.color}, ${INSTALL_STEPS[installStep + 1].color})` }}
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowInstall(false)}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
                  >
                    Done — Extension Installed! 🎉
                  </button>
                )}
              </div>

              {/* Re-download fallback */}
              <div className="mt-4 text-center">
                <a
                  href="/bridgebox-extension.zip"
                  download="bridgebox-voice-extension.zip"
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  ↓ Re-download ZIP if it didn't start automatically
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen viewer modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="relative bg-[#0C1322] border border-[#1E293B] rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
              <div>
                <p className="text-white font-semibold text-sm">{selected.title || getHostname(selected.url)}</p>
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1">
                  {selected.url.slice(0, 60)}{selected.url.length > 60 ? '…' : ''}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAddingToProject(selected.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#334155] text-slate-300 hover:text-white rounded-lg transition-colors">
                  <FolderPlus size={12} /> Add to project
                </button>
                <button onClick={() => deleteCapture(selected.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-900/40 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 size={12} /> Delete
                </button>
                <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-[#0B0F19] min-h-64 max-h-[70vh] overflow-auto">
              {selected.thumbnail_url
                ? <img src={selected.thumbnail_url} alt="" className="max-w-full max-h-[70vh] object-contain" />
                : <div className="flex flex-col items-center gap-3 py-16 text-slate-600"><Camera size={36} /><p className="text-sm">No preview available</p></div>
              }
            </div>
            <div className="px-5 py-3 border-t border-[#1E293B] flex items-center gap-6 text-xs text-slate-500">
              <span className="capitalize">{selected.type}</span>
              <span>{safeDate(selected.created_at)}</span>
              {selected.project_id && <span className="text-blue-400">Linked to project</span>}
            </div>
          </div>
        </div>
      )}

      {/* Add to project */}
      {addingToProject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAddingToProject(null)}>
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4 text-sm">Add to Project</h3>
            {projects.length === 0
              ? <p className="text-slate-500 text-sm text-center py-4">No projects yet</p>
              : <div className="space-y-2">
                  {projects.map((p: any) => (
                    <button key={p.id} onClick={() => attachToProject(addingToProject, p.id)}
                      className="w-full text-left px-4 py-3 bg-[#0B0F19] border border-[#1E293B] hover:border-blue-500/50 rounded-xl text-white text-sm transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
            }
          </div>
        </div>
      )}
    </div>
  )
}
