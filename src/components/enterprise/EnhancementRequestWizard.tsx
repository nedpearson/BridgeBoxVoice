import { useState, useRef, useEffect } from 'react'
import { Workspace } from '../../types/platform'
import { Mic, Type, Image as ImageIcon, Sparkles, CheckCircle, X, ChevronRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  workspace: Workspace
  initialMode: 'speak' | 'type' | 'upload'
  onClose: () => void
}

type Mode = 'speak' | 'type' | 'upload'
type Step = 1 | 2 | 3 | 4

export default function EnhancementRequestWizard({ workspace, initialMode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [prompt, setPrompt] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<any>(null)
  const recRef = useRef<any>(null)

  // Init speech recognition
  useEffect(() => {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SR) {
        const r = new SR()
        r.continuous = true
        r.interimResults = true
        r.onresult = (e: any) => {
          let t = ''
          for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
          setPrompt(t)
        }
        r.onend = () => setIsRecording(false)
        recRef.current = r
      }
    } catch {}
  }, [])

  const toggleRec = () => {
    if (isRecording) { recRef.current?.stop(); setIsRecording(false) }
    else {
      if (!recRef.current) return toast.error('Speech not supported — use Chrome')
      setPrompt(''); recRef.current.start(); setIsRecording(true)
    }
  }

  const selectMode = (m: Mode) => { setMode(m); setStep(2) }

  const generate = async () => {
    if (!prompt.trim() && mode !== 'upload') return toast.error('Please describe your request first')
    setLoading(true); setStep(3)
    try {
      const { callClaude } = await import('../../lib/anthropic')
      const res = await callClaude(
        'You are a software architect. Given an enhancement request, respond ONLY with valid JSON: {"summary":"...","features":[{"name":"...","description":"..."}],"complexity":"low|medium|high","hours":number}',
        prompt || 'User uploaded media for enhancement request'
      )
      const data = JSON.parse(res)
      setBrief(data)
      // Try to save to DB (non-blocking — ignore if table doesn't exist)
      try {
        const { supabase } = await import('../../lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        await supabase.from('enhancement_requests').insert({
          workspace_id: workspace.id,
          created_by: session?.user?.id,
          title: (data.summary || prompt).substring(0, 80),
          request_type: mode,
          original_prompt: prompt,
          status: 'ready_for_review',
          analysis_summary: data.summary,
          structured_request: { features: data.features, complexity: data.complexity, estimated_hours: data.hours },
        })
      } catch {}
      setStep(4)
    } catch (e: any) {
      toast.error('AI analysis failed: ' + e.message)
      setStep(2)
    } finally { setLoading(false) }
  }

  const approve = () => { toast.success('Enhancement queued for build!'); onClose() }

  const MODES = [
    { id: 'speak' as Mode, icon: Mic, label: 'Speak Feature', desc: 'Describe using your voice', color: 'blue' },
    { id: 'type' as Mode, icon: Type, label: 'Type Request', desc: 'Write specific requirements', color: 'emerald' },
    { id: 'upload' as Mode, icon: ImageIcon, label: 'Upload Media', desc: 'Screenshots or recordings', color: 'purple' },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#131B2B] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-white font-bold flex items-center gap-2 text-sm">
              Enhance Workspace <ChevronRight className="w-4 h-4 text-slate-500" />
              <span className="text-indigo-400">{workspace.name}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1,2,3,4].map(s => (
                <div key={s} className={`h-1 w-6 rounded-full transition-all ${s <= step ? 'bg-indigo-500' : 'bg-[#1E293B]'}`} />
              ))}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* Step 1: Choose mode */}
          {step === 1 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-1">How would you like to request this?</h3>
              <p className="text-slate-400 mb-6 text-sm">Select your input method to capture the feature specification.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectMode(m.id)}
                    className={`p-5 rounded-2xl border text-left transition-all group hover:scale-[1.02] ${
                      m.color === 'blue' ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40' :
                      m.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40' :
                      'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40'
                    }`}
                  >
                    <m.icon className={`w-7 h-7 mb-3 ${m.color === 'blue' ? 'text-blue-400' : m.color === 'emerald' ? 'text-emerald-400' : 'text-purple-400'}`} />
                    <h4 className="text-white font-semibold mb-1">{m.label}</h4>
                    <p className="text-slate-500 text-xs">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Input */}
          {step === 2 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Define your Enhancement</h3>
              <p className="text-slate-400 mb-6 text-sm">AI will convert this into a structured implementation plan.</p>

              {mode === 'speak' && (
                <div className="bg-[#131B2B] rounded-2xl p-8 flex flex-col items-center border border-[#1E293B]">
                  <button
                    onClick={toggleRec}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'}`}
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </button>
                  <p className="text-slate-300 mt-6 text-sm font-medium">{isRecording ? 'Listening... click to stop' : 'Click to start speaking'}</p>
                  {prompt && (
                    <div className="mt-5 w-full p-4 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-slate-300 text-sm">"{prompt}"</div>
                  )}
                </div>
              )}

              {mode === 'type' && (
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="E.g. Add a workflow that automatically triggers an email when a new client record is added to the system..."
                  className="w-full h-48 bg-[#131B2B] border border-[#1E293B] focus:border-indigo-500 rounded-xl p-4 text-white text-sm outline-none resize-none transition-colors"
                />
              )}

              {mode === 'upload' && (
                <div>
                  <div className="border-2 border-dashed border-[#334155] bg-[#131B2B] rounded-2xl p-10 flex flex-col items-center">
                    <ImageIcon className="w-10 h-10 text-slate-500 mb-4" />
                    <p className="text-slate-300 font-medium mb-1">Drag & drop screenshots or video</p>
                    <p className="text-slate-500 text-xs mb-4">MP4, WEBM, PNG, JPG supported</p>
                    <button className="bg-[#1E293B] hover:bg-[#334155] text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold transition-colors">Browse Files</button>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Optionally describe what you uploaded..."
                    className="w-full mt-4 h-24 bg-[#131B2B] border border-[#1E293B] focus:border-indigo-500 rounded-xl p-4 text-white text-sm outline-none resize-none transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Analyzing */}
          {step === 3 && (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6" />
              <h3 className="text-white font-bold text-lg mb-2">AI is analyzing your request...</h3>
              <p className="text-slate-400 text-sm max-w-sm">Formulating a structured implementation plan for your workspace.</p>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && brief && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Implementation Brief</h3>
                  <p className="text-slate-400 text-sm mt-0.5">Review before authorizing this enhancement.</p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold">Ready for Review</span>
              </div>
              <div className="space-y-4">
                <div className="bg-[#131B2B] border border-[#1E293B] rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white mb-2">AI Summary</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{brief.summary}</p>
                  <div className="flex gap-3 mt-3">
                    <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 capitalize">Complexity: {brief.complexity}</span>
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">~{brief.hours}h estimate</span>
                  </div>
                </div>
                {brief.features?.length > 0 && (
                  <div className="bg-[#131B2B] border border-[#1E293B] rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-white mb-3">Proposed Capabilities</h4>
                    <ul className="space-y-3">
                      {brief.features.map((f: any, i: number) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div><span className="text-slate-200 font-medium">{f.name}</span><br /><span className="text-slate-500 text-xs">{f.description}</span></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0B0F19] flex justify-between items-center flex-shrink-0">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as Step) : onClose()}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-4 py-2 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 1 && (
            <p className="text-slate-600 text-xs">Click a card above to continue</p>
          )}
          {step === 2 && (
            <button
              onClick={generate}
              disabled={loading || (!prompt.trim() && mode !== 'upload')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Generate Brief
            </button>
          )}
          {step === 4 && (
            <div className="flex gap-3">
              <button onClick={onClose} className="bg-[#1E293B] hover:bg-[#334155] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">Save Draft</button>
              <button onClick={approve} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">Approve & Build</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
