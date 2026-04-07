import { useState } from 'react'
import { Clock, RotateCcw, CheckCircle, XCircle, Loader2, Tag } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export interface DeploymentVersion {
  id: string
  version: string
  platform: string
  status: 'success' | 'failed' | 'building'
  deployedAt: Date
  commitMessage?: string
  buildDuration?: number // seconds
  deployedBy?: string
  url?: string
}

interface VersionHistoryProps {
  projectId: string
  versions?: DeploymentVersion[]
  onRollback?: (version: DeploymentVersion) => void
}

const MOCK_VERSIONS: DeploymentVersion[] = [
  {
    id: 'v3',
    version: 'v1.3.0',
    platform: 'Web',
    status: 'success',
    deployedAt: new Date(Date.now() - 1000 * 60 * 30),
    commitMessage: 'Add dashboard analytics widgets',
    buildDuration: 47,
    deployedBy: 'You',
    url: 'https://app.vercel.app',
  },
  {
    id: 'v2',
    version: 'v1.2.1',
    platform: 'iOS',
    status: 'success',
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    commitMessage: 'Fix mobile navigation layout',
    buildDuration: 112,
    deployedBy: 'You',
  },
  {
    id: 'v1e',
    version: 'v1.2.0',
    platform: 'Android',
    status: 'failed',
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    commitMessage: 'Upgrade to Capacitor v6',
    buildDuration: 88,
    deployedBy: 'You',
  },
  {
    id: 'v1',
    version: 'v1.1.0',
    platform: 'Web',
    status: 'success',
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    commitMessage: 'Initial production deployment',
    buildDuration: 39,
    deployedBy: 'You',
    url: 'https://v1.vercel.app',
  },
]

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Success' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
  building: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Building' },
} as const

const PLATFORM_EMOJI: Record<string, string> = {
  Web: '🌐', iOS: '📱', Android: '🤖', Windows: '🪟', Mac: '🍎',
}

export default function VersionHistory({
  projectId: _projectId,
  versions = MOCK_VERSIONS,
  onRollback,
}: VersionHistoryProps) {
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  const handleRollback = async (v: DeploymentVersion) => {
    setRollingBack(v.id)
    await new Promise((r) => setTimeout(r, 1500))
    setRollingBack(null)
    onRollback?.(v)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#1E293B] flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        <h3 className="text-white font-semibold">Version History</h3>
        <span className="ml-auto text-xs text-slate-500">{versions.length} builds</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
        {versions.map((v, i) => {
          const cfg = STATUS_CONFIG[v.status]
          const StatusIcon = cfg.icon
          const isLatest = i === 0
          const isRollingBack = rollingBack === v.id

          return (
            <div key={v.id} className="px-6 py-4 hover:bg-[#0C1322] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Status icon */}
                  <div className={`mt-0.5 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.color} ${v.status === 'building' ? 'animate-spin' : ''}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span className="text-white font-semibold text-sm font-mono">{v.version}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{PLATFORM_EMOJI[v.platform]} {v.platform}</span>
                      {isLatest && v.status === 'success' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>

                    {v.commitMessage && (
                      <p className="text-slate-400 text-xs mt-1 truncate">{v.commitMessage}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                      <span title={format(v.deployedAt, 'PPpp')}>
                        {formatDistanceToNow(v.deployedAt, { addSuffix: true })}
                      </span>
                      {v.buildDuration && <span>⏱ {v.buildDuration}s build</span>}
                      {v.deployedBy && <span>by {v.deployedBy}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-[#1E293B] hover:bg-[#1E293B] transition-colors"
                    >
                      View ↗
                    </a>
                  )}
                  {!isLatest && v.status === 'success' && (
                    <button
                      onClick={() => handleRollback(v)}
                      disabled={!!rollingBack}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 border border-amber-400/20 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
                    >
                      {isRollingBack ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      {isRollingBack ? 'Rolling back...' : 'Rollback'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
