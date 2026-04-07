interface TranscriptViewerProps {
  transcript: string
}

export default function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const words = transcript.split(' ')

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Voice Transcript</h3>
        <span className="text-xs text-slate-500 font-mono">{words.length} words</span>
      </div>
      <div className="flex-1 bg-[#0B0F19] rounded-2xl p-5 border border-[#1E293B] overflow-y-auto">
        <p className="text-slate-300 leading-relaxed text-[15px] font-mono">
          {words.map((word, i) => (
            <span
              key={i}
              className="text-slate-300 hover:text-white hover:bg-blue-600/10 rounded px-0.5 cursor-default transition-colors"
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
