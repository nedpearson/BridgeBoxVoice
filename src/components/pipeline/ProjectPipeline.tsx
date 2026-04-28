import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PipelineStage, PipelineRun, PipelineEngine } from '../../lib/agents/pipelineAgent'
import { Check, Play, RotateCcw, AlertTriangle, XCircle, Settings } from 'lucide-react'

interface Props {
  projectId: string
  project: any
}

export default function ProjectPipeline({ projectId, project: _project }: Props) {
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load existing run or wait for trigger
    supabase.from('project_pipeline_runs')
      .select('*, stages:pipeline_stages(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Sort stages
          const sortedStages = data[0].stages.sort((a: any, b: any) => a.stage_index - b.stage_index)
          setRun({ ...data[0], stages: sortedStages })
        }
        setLoading(false)
      })
  }, [projectId])

  const handleStartPipeline = async () => {
    setLoading(true)
    try {
      const newRun = await PipelineEngine.initializePipeline(projectId)
      setRun(newRun)
      
      // Start the engine in the background
      const engine = new PipelineEngine(newRun.id, projectId, (stages) => {
        setRun(prev => prev ? { ...prev, stages } : null)
      })
      
      // Execute stages sequentially (this is a simplified fire-and-forget for now)
      // In production, this would be managed by a robust job queue or background worker
      ;(async () => {
        for (let i = 1; i <= newRun.total_stages; i++) {
          try {
            await engine.runStage(i)
          } catch (e) {
            console.error('Pipeline stopped at stage', i)
            break
          }
        }
      })()

    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading pipeline...</div>
  }

  if (!run) {
    return (
      <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
          <Play className="text-blue-400" size={24} />
        </div>
        <h3 className="text-white font-bold text-xl mb-2">Autonomous Pipeline Ready</h3>
        <p className="text-slate-400 mb-8 max-w-md">
          Start the fully autonomous AI pipeline to design, build, and deploy your project automatically.
        </p>
        <button 
          onClick={handleStartPipeline}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
        >
          <Play size={18} />
          Start Autonomous Pipeline
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#0B0F19] rounded-2xl border border-[#1E293B] overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar: Pipeline Stages Summary */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#1E293B] bg-[#131B2B] p-4 flex flex-col">
        <h3 className="text-white font-bold mb-4 flex items-center justify-between">
          Pipeline
          <span className="text-xs bg-[#1E293B] text-slate-300 px-2 py-1 rounded-md">
            {run.status}
          </span>
        </h3>
        
        <div className="space-y-1 overflow-y-auto flex-1 pr-2">
          {run.stages.map(stage => {
            const isRunning = stage.status === 'running'
            const isDone = stage.status === 'done'
            const isFailed = stage.status === 'failed'
            
            return (
              <button
                key={stage.id}
                onClick={() => setExpandedStage(stage.id || null)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                  expandedStage === stage.id ? 'bg-[#1E293B]' : 'hover:bg-[#1E293B]/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-emerald-500/20 text-emerald-400' :
                  isFailed ? 'bg-red-500/20 text-red-400' :
                  isRunning ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse' :
                  'bg-slate-800 text-slate-500'
                }`}>
                  {isDone ? <Check size={12} /> : 
                   isFailed ? <XCircle size={12} /> : 
                   isRunning ? <RotateCcw size={10} className="animate-spin" /> : 
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{stage.stage_name}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Area: Stage Detail */}
      <div className="flex-1 p-6 bg-[#0B0F19]">
        {expandedStage ? (
          <StageDetail stage={run.stages.find(s => s.id === expandedStage)!} runId={run.id} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            Select a stage from the left to view details.
          </div>
        )}
      </div>
    </div>
  )
}

function StageDetail({ stage, runId: _runId }: { stage: PipelineStage, runId: string }) {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('pipeline_logs')
      .select('*')
      .eq('stage_id', stage.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setLogs(data || []))
  }, [stage.id, stage.status])

  return (
    <div className="flex flex-col h-full max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{stage.stage_name}</h2>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Settings size={14} /> Agent: {stage.agent_name}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${
          stage.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          stage.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
          stage.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-slate-800 text-slate-400 border border-slate-700'
        }`}>
          {stage.status}
        </div>
      </div>

      {stage.status === 'running' && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-blue-400 mb-2 font-medium">
            <span>Progress</span>
            <span>{stage.progress_pct}%</span>
          </div>
          <div className="w-full bg-[#131B2B] h-2 rounded-full overflow-hidden border border-[#1E293B]">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${stage.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {stage.error_message && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm font-mono whitespace-pre-wrap">{stage.error_message}</div>
        </div>
      )}

      <div className="flex-1 bg-[#131B2B] rounded-xl border border-[#1E293B] overflow-hidden flex flex-col">
        <div className="bg-[#1E293B]/50 px-4 py-2 border-b border-[#1E293B] text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Execution Logs
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-600">Waiting for logs...</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-3">
                <span className="text-slate-600 flex-shrink-0">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
                <span className={`
                  ${log.log_level === 'error' ? 'text-red-400' : 
                    log.log_level === 'warn' ? 'text-amber-400' : 
                    log.log_level === 'success' ? 'text-emerald-400' : 'text-slate-300'}
                `}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {(stage.status === 'failed' || stage.status === 'done') && (
          <button className="px-4 py-2 bg-[#1E293B] hover:bg-[#263348] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
            <RotateCcw size={14} /> Retry Stage
          </button>
        )}
      </div>
    </div>
  )
}
