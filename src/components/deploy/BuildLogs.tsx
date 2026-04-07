import { useEffect, useRef, useState } from 'react'
import { Terminal, Download, Trash2, Wifi, WifiOff } from 'lucide-react'

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'success' | 'debug'
  message: string
  source?: string
}

interface BuildLogsProps {
  projectId: string
  deploymentId?: string
  logs?: LogEntry[]
  isLive?: boolean
}

const LEVEL_STYLES = {
  info: 'text-slate-300',
  warn: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-emerald-400',
  debug: 'text-slate-600',
} as const

const LEVEL_PREFIX = {
  info: '  INFO',
  warn: '  WARN',
  error: ' ERROR',
  success: '    OK',
  debug: ' DEBUG',
} as const

const DEMO_LOGS: LogEntry[] = [
  { id: '1', timestamp: new Date(Date.now() - 60000), level: 'info', message: 'Build started by CI pipeline', source: 'ci' },
  { id: '2', timestamp: new Date(Date.now() - 59000), level: 'info', message: 'Installing dependencies...', source: 'npm' },
  { id: '3', timestamp: new Date(Date.now() - 55000), level: 'info', message: 'npm install completed (312 packages)', source: 'npm' },
  { id: '4', timestamp: new Date(Date.now() - 54000), level: 'info', message: 'Running TypeScript compiler...', source: 'tsc' },
  { id: '5', timestamp: new Date(Date.now() - 50000), level: 'success', message: 'TypeScript compilation successful (0 errors)', source: 'tsc' },
  { id: '6', timestamp: new Date(Date.now() - 49000), level: 'info', message: 'Bundling with Vite...', source: 'vite' },
  { id: '7', timestamp: new Date(Date.now() - 45000), level: 'info', message: 'dist/index.html: 1.23 kB │ gzip: 0.71 kB', source: 'vite' },
  { id: '8', timestamp: new Date(Date.now() - 44000), level: 'info', message: 'dist/assets/index-abc123.js: 412.5 kB │ gzip: 128.6 kB', source: 'vite' },
  { id: '9', timestamp: new Date(Date.now() - 43000), level: 'warn', message: 'Large chunk detected. Consider code splitting', source: 'vite' },
  { id: '10', timestamp: new Date(Date.now() - 40000), level: 'info', message: 'Deploying to Vercel...', source: 'vercel' },
  { id: '11', timestamp: new Date(Date.now() - 35000), level: 'info', message: 'Uploading 47 static files', source: 'vercel' },
  { id: '12', timestamp: new Date(Date.now() - 10000), level: 'success', message: 'Deployment complete! https://bridgebox-app.vercel.app', source: 'vercel' },
  { id: '13', timestamp: new Date(Date.now() - 5000), level: 'info', message: 'Running post-deploy health check...', source: 'health' },
  { id: '14', timestamp: new Date(Date.now() - 2000), level: 'success', message: 'Health check passed (HTTP 200 in 142ms)', source: 'health' },
]

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function BuildLogs({
  projectId: _projectId,
  deploymentId: _deploymentId,
  logs = DEMO_LOGS,
  isLive = false,
}: BuildLogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all')
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>(logs)

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [liveLogs, autoScroll])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
    setAutoScroll(isAtBottom)
  }

  const filteredLogs = filter === 'all' ? liveLogs : liveLogs.filter((l) => l.level === filter)

  const downloadLogs = () => {
    const text = liveLogs
      .map((l) => `[${formatTime(l.timestamp)}] ${LEVEL_PREFIX[l.level]} ${l.source ? `[${l.source}]` : ''} ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `build-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-[#080D18] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B] bg-[#0C1322] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-white text-sm font-medium font-sans">Build Logs</span>
          {isLive ? (
            <div className="flex items-center gap-1 text-emerald-400 text-xs">
              <Wifi className="w-3 h-3" />
              <span className="animate-pulse">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-600 text-xs">
              <WifiOff className="w-3 h-3" />
              Historical
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Level filter */}
          <div className="flex gap-0.5">
            {(['all', 'info', 'warn', 'error', 'success'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  filter === lvl
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLiveLogs([])}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-[#1E293B] rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={downloadLogs}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-[#1E293B] rounded transition-colors"
            title="Download logs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            No log entries
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 text-xs leading-5 group">
              <span className="text-slate-700 select-none flex-shrink-0">{formatTime(entry.timestamp)}</span>
              <span className={`select-none flex-shrink-0 ${LEVEL_STYLES[entry.level]}`}>
                {LEVEL_PREFIX[entry.level]}
              </span>
              {entry.source && (
                <span className="text-slate-700 flex-shrink-0">[{entry.source}]</span>
              )}
              <span className={LEVEL_STYLES[entry.level]}>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="flex justify-center pb-2">
          <button
            onClick={() => {
              setAutoScroll(true)
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="px-3 py-1 rounded-full bg-blue-600/80 text-white text-xs hover:bg-blue-500 transition-colors"
          >
            ↓ Scroll to bottom
          </button>
        </div>
      )}
    </div>
  )
}
