import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, ExternalLink, Trash2, FolderPlus, X, Monitor } from 'lucide-react'
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
const getHostname = (urlStr?: string | null) => {
  try {
    return urlStr ? new URL(urlStr).hostname : 'Unknown URL'
  } catch {
    return urlStr || 'Unknown URL'
  }
}

const safeDate = (dateStr?: string | null) => {
  try {
    return dateStr ? formatDistanceToNow(new Date(dateStr), { addSuffix: true }) : 'Unknown date'
  } catch {
    return 'Unknown date'
  }
}
export default function CapturesPage() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Capture | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [addingToProject, setAddingToProject] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        
        // Fetch the first available workspace if none is explicitly set
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .limit(1)
          .single()
          
        if (!ws) {
          setLoading(false)
          return
        }

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

  return (
    <div className="p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Screen Captures</h1>
          <p className="text-slate-400 text-sm mt-1">
            Screenshots and recordings captured by the Bridgebox Voice Chrome extension.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">{captures.length} captures</span>
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
          <div className="flex items-center gap-3 p-4 bg-[#131B2B] border border-[#1E293B] rounded-xl text-left max-w-sm">
            <Monitor size={20} className="text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">Chrome Extension</p>
              <p className="text-slate-500 text-xs">Capture screenshots & videos of any workflow</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {captures.map(cap => (
            <div
              key={cap.id}
              className="group relative bg-[#131B2B] border border-[#1E293B] hover:border-[#334155] rounded-xl overflow-hidden cursor-pointer transition-all"
              onClick={() => setSelected(cap)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-[#0B0F19] relative overflow-hidden">
                {cap.thumbnail_url ? (
                  <img src={cap.thumbnail_url} alt={cap.title || cap.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera size={24} className="text-slate-600" />
                  </div>
                )}
                {/* Type badge */}
                <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-slate-300 uppercase tracking-wide">
                  {cap.type}
                </span>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-slate-300 text-xs font-medium truncate">
                  {cap.title || getHostname(cap.url)}
                </p>
                <p className="text-slate-600 text-[10px] mt-0.5">
                  {safeDate(cap.created_at)}
                </p>
              </div>

              {/* Quick actions */}
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

      {/* Fullscreen viewer modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative bg-[#0C1322] border border-[#1E293B] rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
              <div>
                <p className="text-white font-semibold text-sm">
                  {selected.title || getHostname(selected.url)}
                </p>
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 text-xs hover:underline flex items-center gap-1">
                  {selected.url.slice(0, 60)}{selected.url.length > 60 ? '…' : ''}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddingToProject(selected.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#334155] text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                  <FolderPlus size={12} /> Add to project
                </button>
                <button
                  onClick={() => deleteCapture(selected.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-900/40 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
                <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image/video */}
            <div className="flex items-center justify-center bg-[#0B0F19] min-h-64 max-h-[70vh] overflow-auto">
              {selected.thumbnail_url ? (
                <img src={selected.thumbnail_url} alt="" className="max-w-full max-h-[70vh] object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
                  <Camera size={36} />
                  <p className="text-sm">No preview available</p>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="px-5 py-3 border-t border-[#1E293B] flex items-center gap-6 text-xs text-slate-500">
              <span className="capitalize">{selected.type}</span>
              <span>{safeDate(selected.created_at)}</span>
              {selected.project_id && (
                <span className="text-blue-400">Linked to project</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add to project dropdown */}
      {addingToProject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAddingToProject(null)}>
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4 text-sm">Add to Project</h3>
            {projects.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No projects yet</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p: any) => (
                  <button key={p.id} onClick={() => attachToProject(addingToProject, p.id)}
                    className="w-full text-left px-4 py-3 bg-[#0B0F19] border border-[#1E293B] hover:border-blue-500/50 rounded-xl text-white text-sm transition-colors">
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
