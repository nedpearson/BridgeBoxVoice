import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Upload } from 'lucide-react'
import toast from 'react-hot-toast'


interface VoiceRecorderProps {
  projectId: string
  onComplete: (transcript: string, imageBase64?: string) => void
}

type RecordState = 'idle' | 'recording' | 'uploading' | 'done'

export default function VoiceRecorder({ onComplete }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [bars, setBars] = useState<number[]>(Array(40).fill(4))
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Vision Mode
  const [dragActive, setDragActive] = useState(false)
  const [visionImage, setVisionImage] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    clearInterval(timerRef.current!)
    clearInterval(animRef.current!)
  }, [])

  const startRecording = async () => {
    // Browser support check
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Your browser does not support microphone recording. Please use Chrome or Firefox.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => processAudio(new Blob(chunksRef.current, { type: 'audio/webm' }))
      mr.start(250)
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      animRef.current = setInterval(() => {
        setBars(Array.from({ length: 40 }, () => Math.floor(Math.random() * 40) + 4))
      }, 80)
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        toast.error('Microphone permission denied. Click the lock icon in your browser address bar and allow microphone access.')
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.')
      } else if (err?.name === 'NotReadableError') {
        toast.error('Microphone is in use by another app. Please close other apps using the mic.')
      } else if (err?.name === 'SecurityError') {
        toast.error('Microphone blocked — this page must be served over HTTPS or localhost.')
      } else {
        toast.error(`Microphone error: ${err?.message ?? 'Unknown error'}`)
      }
      console.error('[VoiceRecorder] getUserMedia error:', err)
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current!)
    clearInterval(animRef.current!)
    mediaRef.current?.stop()
    mediaRef.current?.stream.getTracks().forEach(t => t.stop())
    setState('uploading')
  }

  const processAudio = async (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setAudioURL(url)
    setState('uploading')

    await simulateTranscription()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setState('uploading')
    await simulateTranscription()
  }

  const simulateTranscription = async () => {
    await new Promise(r => setTimeout(r, 2500))
    const mockTranscript = `I run a landscaping business. I currently use QuickBooks for invoicing, Google Calendar for scheduling, and I keep a paper notebook for all my job notes. What I really need is one central app where my crew can clock in and out at the start and end of their day, see their list of jobs for today, take before and after photos of each job, and submit notes about what was done. On my side, I need a dashboard that shows me total revenue this month, total hours worked by each employee, upcoming scheduled jobs, and which jobs are waiting for invoice approval. I also want to be able to send out automatic SMS reminders to clients 24 hours before their appointment.`
    setState('done')
    onComplete(mockTranscript, visionImage || undefined)
  }

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) processImage(file)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) processImage(file)
  }

  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setVisionImage(e.target?.result as string)
    reader.readAsDataURL(file)
    toast.success('Vision image attached!')
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div 
      onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleImageDrop}
      className={`relative flex flex-col items-center justify-center min-h-full p-8 gap-8 transition-colors ${dragActive ? 'bg-blue-600/5' : ''}`}
    >
      {dragActive && (
        <div className="absolute inset-4 border-2 border-dashed border-blue-500 rounded-3xl pointer-events-none z-10 flex items-center justify-center bg-blue-900/10 backdrop-blur-sm">
          <p className="text-blue-400 font-bold text-2xl animate-pulse">Drop Screenshot Here for AI Vision</p>
        </div>
      )}
      {/* Main recording orb */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {state === 'recording' && (
            <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-ping scale-150" />
          )}
          <button
            onClick={state === 'recording' ? stopRecording : startRecording}
            disabled={state === 'uploading'}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              state === 'recording'
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {state === 'uploading' ? (
              <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            ) : state === 'recording' ? (
              <Square className="w-12 h-12 text-white" fill="white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </button>
        </div>

        {/* Waveform Bars */}
        <div className="flex items-center gap-[3px] h-12">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full transition-all duration-75"
              style={{
                height: state === 'recording' ? `${h}px` : `${4 + Math.sin(i * 0.4) * 6}px`,
                backgroundColor: state === 'recording' ? '#60A5FA' : '#1E293B',
              }}
            />
          ))}
        </div>

        {/* Timer & Status */}
        <div className="text-center">
          {state === 'recording' && (
            <p className="text-2xl font-mono font-bold text-white mb-1">{fmt(seconds)}</p>
          )}
          <p className="text-slate-400 text-sm">
            {state === 'idle' && 'Click the mic and describe your business software needs'}
            {state === 'recording' && 'Listening... click the square to stop'}
            {state === 'uploading' && 'Transcribing your recording with AI...'}
            {state === 'done' && 'Transcription complete!'}
          </p>
        </div>
      </div>

      {/* Playback */}
      {audioURL && state === 'done' && (
        <audio controls src={audioURL} className="w-full max-w-sm rounded-xl" />
      )}

      {/* OR upload */}
      {state === 'idle' && (
        <>
          <div className="flex items-center gap-4 w-full max-w-sm">
            <div className="flex-1 h-px bg-[#1E293B]" />
            <span className="text-slate-600 text-sm">or</span>
            <div className="flex-1 h-px bg-[#1E293B]" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 border border-[#1E293B] hover:border-[#334155] text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Audio File
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 border border-indigo-900/30 hover:border-indigo-500/50 bg-indigo-900/10 text-indigo-400 hover:text-indigo-300 rounded-xl text-sm font-medium transition-all"
            >
              <Upload className="w-4 h-4" />
              {visionImage ? 'Image Attached!' : 'Attach Vision UI Screenshot'}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,audio/*" className="hidden" onChange={handleFileUpload} />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        </>
      )}

      {/* Tips */}
      {state === 'idle' && (
        <div className="max-w-lg w-full bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
          <p className="text-slate-300 text-sm font-semibold mb-3">💡 What to say:</p>
          <ul className="space-y-2 text-slate-500 text-sm">
            {[
              'Describe your industry and business type',
              'List the software tools you currently use',
              'Explain what you want your team to be able to do',
              'Describe the dashboard/reports you need',
              'Mention any integrations (QuickBooks, Stripe, etc.)',
            ].map(t => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">›</span>{t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
