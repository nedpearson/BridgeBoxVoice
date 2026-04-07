import { useRef, useState, useCallback } from 'react'
import { Upload, FileAudio, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { transcribeFile, DeepgramResult } from '../../lib/deepgram'

interface AudioUploaderProps {
  projectId: string
  onComplete: (transcript: string) => void
}

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'done' | 'error'

const ACCEPTED = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm']
const MAX_SIZE_GB = 2

export default function AudioUploader({ projectId: _projectId, onComplete }: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DeepgramResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const handleFile = useCallback(async (f: File) => {
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|ogg|webm|flac)$/i)) {
      setError('Unsupported format. Please use MP3, WAV, M4A, OGG, or WebM.')
      return
    }
    if (f.size > MAX_SIZE_GB * 1024 * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_GB}GB.`)
      return
    }

    setFile(f)
    setError('')
    setStatus('transcribing')
    setProgress(0)

    try {
      const res = await transcribeFile(f, (pct) => setProgress(pct))
      setResult(res)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setStatus('error')
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setFile(null)
    setError('')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h3 className="text-white font-semibold text-lg mb-1">Upload Audio File</h3>
      <p className="text-slate-400 text-sm mb-6">
        Upload an existing recording — MP3, WAV, or M4A up to 2GB
      </p>

      {/* Drop Zone */}
      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-[#1E293B] hover:border-blue-500/50 hover:bg-blue-500/5'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Drop your audio file here</p>
            <p className="text-slate-400 text-sm mt-1">or click to browse</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['MP3', 'WAV', 'M4A', 'OGG', 'WebM'].map((fmt) => (
              <span key={fmt} className="px-2 py-0.5 rounded text-xs bg-[#1E293B] text-slate-300">
                {fmt}
              </span>
            ))}
          </div>
          <p className="text-slate-500 text-xs">Max file size: 2 GB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.ogg,.webm,.flac,audio/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Active file processing */}
      {file && status !== 'idle' && (
        <div className="border border-[#1E293B] rounded-2xl p-6 bg-[#0C1322]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm truncate max-w-xs">{file.name}</p>
                <p className="text-slate-500 text-xs">{formatSize(file.size)}</p>
              </div>
            </div>
            {status !== 'transcribing' && (
              <button onClick={reset} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(status === 'uploading' || status === 'transcribing') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  {status === 'uploading' ? 'Uploading...' : 'Transcribing with Deepgram Nova-2...'}
                </div>
                <span className="text-blue-400 font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Transcription complete — {result.words.length} words detected</span>
              </div>
              <div className="bg-[#0B0F19] rounded-xl p-4 max-h-40 overflow-y-auto">
                <p className="text-slate-300 text-sm leading-relaxed">{result.transcript}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onComplete(result.transcript)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                >
                  Use Transcript →
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2.5 rounded-xl border border-[#1E293B] text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
              <button
                onClick={reset}
                className="w-full py-2.5 rounded-xl border border-[#1E293B] text-slate-400 hover:text-white text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {error && status === 'idle' && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
