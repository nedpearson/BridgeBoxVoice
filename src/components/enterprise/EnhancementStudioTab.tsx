import { useState, useEffect } from 'react'
import { enhancementService } from '../../lib/enhancementService'
import { EnhancementRequest } from '../../types/platform'
import { Sparkles, GitMerge, ChevronRight, Activity, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function EnhancementStudioTab({ workspaceId }: { workspaceId: string }) {
  const [requests, setRequests] = useState<EnhancementRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    enhancementService.listRequests(workspaceId).then(data => {
      setRequests(data)
      setLoading(false)
    })
  }, [workspaceId])

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'analyzing': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'ready_for_review': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
      case 'approved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Workspace Enhancement Queue</h2>
        <p className="text-slate-400 text-sm">Review active feature requests, AI analysis briefs, and cross-workspace merge histories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{requests.length}</h3>
          <p className="text-slate-400 text-sm">Active Feature Requests</p>
        </div>
        <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-4">
            <GitMerge className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">0</h3>
          <p className="text-slate-400 text-sm">Successful Asset Merges</p>
        </div>
      </div>

      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Recent Enhancements</h3>
      
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="spinner spinner-indigo" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="border border-dashed border-[#1E293B] bg-[#131B2B]/50 rounded-2xl p-12 text-center text-slate-500 mt-4">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No enhancements requested yet. Use the Dashboard to speak or type a new capability.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-[#131B2B] border border-[#1E293B] hover:border-[#334155] rounded-xl p-5 flex items-center justify-between group cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm mb-1">{req.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                    <span className="uppercase tracking-wider">{req.request_type}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(req.status)}`}>
                  {req.status.replace(/_/g, ' ')}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
