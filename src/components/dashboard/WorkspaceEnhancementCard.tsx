import { Sparkles, Mic, Type, Image, GitMerge, ChevronRight } from 'lucide-react'

interface Props {
  onSpeak: () => void
  onType: () => void
  onUpload: () => void
  onMerge: () => void
  onViewQueue: () => void
}

export default function WorkspaceEnhancementCard({
  onSpeak, onType, onUpload, onMerge, onViewQueue
}: Props) {
  return (
    <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl overflow-hidden mb-8 relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="p-6 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Workspace Enhancement Studio</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed ml-1">
              Expand your workspace continuously. Use your voice, upload a screen recording, or merge proven workflows from another tenant gracefully.
            </p>
          </div>
          <button 
            onClick={onViewQueue}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors group whitespace-nowrap"
          >
            Review Enhancement Queue
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={onSpeak}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-[#1E293B] bg-[#0B0F19]/50 hover:bg-[#1E293B] hover:border-[#334155] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">Speak Feature</span>
          </button>

          <button 
            onClick={onType}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-[#1E293B] bg-[#0B0F19]/50 hover:bg-[#1E293B] hover:border-[#334155] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Type className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">Type Request</span>
          </button>

          <button 
            onClick={onUpload}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-[#1E293B] bg-[#0B0F19]/50 hover:bg-[#1E293B] hover:border-[#334155] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Image className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">Upload Recording</span>
          </button>

          <button 
            onClick={onMerge}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <GitMerge className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-indigo-200 font-medium text-sm group-hover:text-white transition-colors">Merge Workspace</span>
          </button>
        </div>
      </div>
    </div>
  )
}
