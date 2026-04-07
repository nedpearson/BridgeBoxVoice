import { useState, useRef, useEffect } from 'react'
import { Workspace, EnhancementRequest } from '../../types/platform'
import { Mic, Type, Image as ImageIcon, Sparkles, CheckCircle, X, ChevronRight, FileCode } from 'lucide-react'
import { enhancementService } from '../../lib/enhancementService'
import toast from 'react-hot-toast'

interface Props {
  workspace: Workspace
  initialMode: 'speak' | 'type' | 'upload'
  onClose: () => void
}

const COLOR_CLASSES: Record<string, { active: string; icon: string }> = {
  blue:    { active: 'bg-blue-500/10 border-blue-500/50',    icon: 'text-blue-400'    },
  emerald: { active: 'bg-emerald-500/10 border-emerald-500/50', icon: 'text-emerald-400' },
  purple:  { active: 'bg-purple-500/10 border-purple-500/50',  icon: 'text-purple-400'  },
}

export default function EnhancementRequestWizard({ workspace, initialMode, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState(initialMode)
  const [prompt, setPrompt] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [brief, setBrief] = useState<EnhancementRequest | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (initialMode === 'speak') {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.onresult = (e: any) => {
            let transcript = ''
            for (let i = 0; i < e.results.length; i++) {
              transcript += e.results[i][0].transcript
            }
            setPrompt(transcript)
          }
          recognitionRef.current = recognition
        }
      } catch (err) { }
    }
  }, [initialMode])

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      if (!recognitionRef.current) return toast.error('Browser missing speech support')
      setPrompt('')
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return toast.error('Please provide a description')
    setStep(3) // Analysis step
    try {
      // 1. Create base record
      const req = await enhancementService.createRequest(workspace.id, '', {
        title: prompt.substring(0, 40) + '...',
        request_type: mode,
        original_prompt: prompt
      })
      
      // 2. Run AI Analysis
      const analyzed = await enhancementService.runAIAnalysis(req.id, prompt)
      setBrief(analyzed)
      setStep(4) // Review step
    } catch (err: any) {
      toast.error(err.message)
      setStep(2) // fallback
    }
  }

  const handleApprove = async () => {
    if (!brief) return
    try {
      await enhancementService.updateStatus(brief.id, 'approved')
      toast.success('Enhancement queued for Build!')
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#131B2B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold inline-flex items-center gap-2">
                Enhance Workspace 
                <ChevronRight className="w-4 h-4 text-slate-500" /> 
                <span className="text-indigo-400">{workspace.name}</span>
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-white mb-2">How would you like to request this?</h3>
              <p className="text-slate-400 mb-6 text-sm">Select your input method to capture the feature specification.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'speak', icon: Mic, label: 'Speak Feature', desc: 'Use your voice to describe the flow natively.', color: 'blue' },
                  { id: 'type', icon: Type, label: 'Type Request', desc: 'Write out the specific requirements.', color: 'emerald' },
                  { id: 'upload', icon: ImageIcon, label: 'Upload Media', desc: 'Attach screenshots or screen recordings.', color: 'purple' },
                ].map((m) => (
                  <button 
                    key={m.id}
                    onClick={() => { setMode(m.id as any); setStep(2) }}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      mode === m.id 
                      ? COLOR_CLASSES[m.color].active
                      : 'bg-[#131B2B] border-[#1E293B] hover:border-[#334155]'
                    }`}
                  >
                    <m.icon className={`w-6 h-6 mb-3 ${mode === m.id ? COLOR_CLASSES[m.color].icon : 'text-slate-400'}`} />
                    <h4 className="text-white font-semibold mb-1">{m.label}</h4>
                    <p className="text-slate-500 text-xs">{m.desc}</p>
                  </button>
                ))}
              </div>
              
              <div className="mt-8 flex justify-end">
                <button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors text-sm">
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-white mb-2">Define your Enhancement</h3>
              <p className="text-slate-400 mb-6 text-sm">We'll use our AI to convert this into a structured implementation plan.</p>

              {mode === 'speak' && (
                <div className="bg-[#131B2B] rounded-2xl p-8 flex flex-col items-center justify-center border border-[#1E293B]">
                  <button 
                    onClick={toggleRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
                      isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'
                    }`}
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </button>
                  <p className="text-slate-300 mt-6 text-sm font-medium">
                    {isRecording ? 'Listening carefully...' : 'Click to start speaking'}
                  </p>
                </div>
              )}

              {mode === 'type' && (
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g. Add a workflow that automatically triggers an email when a new client record is added..."
                  className="w-full h-40 bg-[#131B2B] border border-[#1E293B] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              )}

              {mode === 'upload' && (
                <div className="border-2 border-dashed border-[#334155] bg-[#131B2B] rounded-2xl p-10 flex flex-col items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-slate-500 mb-4" />
                  <p className="text-slate-300 font-medium mb-1">Drag and drop screenshots or video</p>
                  <p className="text-slate-500 text-xs">Supports MP4, WEBM, PNG, JPG</p>
                  <button className="mt-4 bg-[#1E293B] hover:bg-[#334155] text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold transition-colors">
                    Browse Files
                  </button>
                </div>
              )}

              {prompt && mode !== 'type' && (
                <div className="mt-6">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Transcription</label>
                  <div className="p-4 bg-[#131B2B] border border-[#1E293B] rounded-xl text-slate-300 text-sm leading-relaxed">
                    "{prompt}"
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white px-4 py-2 transition-colors text-sm font-medium">
                  Back
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={!prompt && mode !== 'upload'}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Brief
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-20 flex flex-col items-center justify-center animate-in fade-in">
              <div className="spinner spinner-indigo" style={{ width: 60, height: 60, borderWidth: 4 }}></div>
              <h3 className="text-white font-bold mt-8 mb-2">AI is analyzing your request...</h3>
              <p className="text-slate-400 text-sm text-center max-w-sm">
                Scanning target workspace boundaries and formulating a safe implementation roadmap.
              </p>
            </div>
          )}

          {step === 4 && brief && (
            <div className="animate-in slide-in-from-right-4 fade-in">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Implementation Brief</h3>
                  <p className="text-slate-400 text-sm">Review the technical blueprint before authorizing this enhancement.</p>
                </div>
                <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  Ready for Review
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#131B2B] border border-[#1E293B] rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><FileCode className="w-4 h-4 text-emerald-400"/> AI Summary</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{brief.analysis_summary}</p>
                </div>

                {brief.structured_request?.features && (
                  <div className="bg-[#131B2B] border border-[#1E293B] rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-white mb-3">Proposed Capabilities</h4>
                    <ul className="space-y-3">
                      {brief.structured_request.features.map((f: any, i: number) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <div>
                            <span className="text-slate-200 font-medium block">{f.name}</span>
                            <span className="text-slate-500">{f.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between pt-6 border-t border-[#1E293B]">
                <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white px-4 py-2 transition-colors text-sm font-medium">
                  Modify Request
                </button>
                <div className="flex gap-3">
                  <button onClick={onClose} className="bg-[#1E293B] hover:bg-[#334155] text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm">
                    Save Draft
                  </button>
                  <button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    Approve & Build
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
