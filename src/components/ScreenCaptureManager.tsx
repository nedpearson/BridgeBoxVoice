import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, Video, FileJson, Trash2, ExternalLink, Sparkles, RefreshCw } from 'lucide-react'

interface Capture {
  id: string
  type: 'screenshot' | 'recording' | 'dom_snapshot' | 'network_log'
  file_path: string | null
  url_captured: string | null
  ai_analysis: Record<string, unknown> | null
  created_at: string
}

interface ScreenCaptureManagerProps {
  projectId?: string
}

const TYPE_META = {
  screenshot:   { icon: Camera,   label: 'Screenshot',    color: 'blue' },
  recording:    { icon: Video,    label: 'Recording',     color: 'red' },
  dom_snapshot: { icon: FileJson, label: 'DOM Snapshot',  color: 'emerald' },
  network_log:  { icon: FileJson, label: 'Network Log',   color: 'amber' },
}

export default function ScreenCaptureManager({ projectId }: ScreenCaptureManagerProps) {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<string>('all')
  const [selected, setSelected] = useState<Capture | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  useEffect(() => { fetchCaptures() }, [projectId])

  const fetchCaptures = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('captures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (projectId) query = query.eq('project_id', projectId)

      const { data, error } = await query
      if (error) throw error
      setCaptures((data ?? []) as Capture[])
    } catch (err) {
      console.error('Failed to load captures:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteCapture = async (id: string) => {
    await supabase.from('captures').delete().eq('id', id)
    setCaptures((prev) => prev.filter((c) => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const analyzeCapture = async (capture: Capture) => {
    setAnalyzing(capture.id)
    try {
      // Fetch the content and send to Claude via Supabase edge function
      const { data, error } = await supabase.functions.invoke('analyze-capture', {
        body: { captureId: capture.id, type: capture.type, fileUrl: capture.file_path },
      })
      if (error) throw error
      // Update capture with AI analysis
      await supabase.from('captures').update({ ai_analysis: data.analysis }).eq('id', capture.id)
      setCaptures((prev) => prev.map((c) => c.id === capture.id ? { ...c, ai_analysis: data.analysis } : c))
      setSelected((prev) => prev?.id === capture.id ? { ...prev, ai_analysis: data.analysis } : prev)
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(null)
    }
  }

  const filtered = filter === 'all' ? captures : captures.filter((c) => c.type === filter)

  return (
    <div className="flex h-full">
      {/* Left: Capture List */}
      <div className="w-72 border-r border-[#1E293B] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E293B]">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-[#131B2B] border border-[#1E293B] text-white rounded-lg px-2 py-1.5 text-xs outline-none"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={fetchCaptures}
            className="p-1.5 rounded-lg bg-[#131B2B] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-slate-500 text-xs text-center">Loading captures...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Camera className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No captures yet.</p>
              <p className="text-slate-600 text-xs mt-1">Use the Chrome Extension to capture pages.</p>
            </div>
          ) : (
            filtered.map((capture) => {
              const meta = TYPE_META[capture.type] ?? TYPE_META.screenshot
              const Icon = meta.icon
              const isActive = selected?.id === capture.id
              return (
                <button
                  key={capture.id}
                  onClick={() => setSelected(capture)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#1E293B] text-left transition-colors ${isActive ? 'bg-[#131B2B]' : 'hover:bg-[#0D1526]'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    meta.color === 'blue'    ? 'bg-blue-500/20'    :
                    meta.color === 'red'     ? 'bg-red-500/20'     :
                    meta.color === 'emerald' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      meta.color === 'blue'    ? 'text-blue-400'    :
                      meta.color === 'red'     ? 'text-red-400'     :
                      meta.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{meta.label}</p>
                    <p className="text-slate-500 text-xs truncate">{capture.url_captured ?? '—'}</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      {new Date(capture.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {capture.ai_analysis && (
                    <Sparkles className="w-3 h-3 text-violet-400 flex-shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Camera className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-slate-400 font-semibold">Select a capture to inspect</p>
            <p className="text-slate-600 text-sm mt-1">Screenshots, recordings, and DOM snapshots appear here.</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{TYPE_META[selected.type]?.label ?? selected.type}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{selected.url_captured ?? 'Unknown URL'}</p>
                <p className="text-slate-600 text-xs">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                {selected.file_path && (
                  <a href={selected.file_path} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#131B2B] border border-[#1E293B] text-slate-300 text-xs hover:text-white transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
                )}
                <button
                  onClick={() => analyzeCapture(selected)}
                  disabled={!!analyzing}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600/20 border border-violet-600/30 text-violet-400 text-xs hover:bg-violet-600/30 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${analyzing === selected.id ? 'animate-spin' : ''}`} />
                  {analyzing === selected.id ? 'Analyzing...' : 'AI Analyze'}
                </button>
                <button
                  onClick={() => deleteCapture(selected.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Preview */}
            {selected.type === 'screenshot' && selected.file_path && (
              <div className="rounded-xl overflow-hidden border border-[#1E293B] mb-4">
                <img src={selected.file_path} alt="Screenshot" className="w-full" />
              </div>
            )}

            {selected.type === 'recording' && selected.file_path && (
              <div className="rounded-xl overflow-hidden border border-[#1E293B] mb-4 bg-black">
                <video src={selected.file_path} controls className="w-full max-h-64" />
              </div>
            )}

            {/* AI Analysis */}
            {selected.ai_analysis && (
              <div className="bg-[#0D1526] border border-violet-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <h4 className="text-white font-semibold text-sm">AI Analysis</h4>
                </div>
                <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {JSON.stringify(selected.ai_analysis, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
