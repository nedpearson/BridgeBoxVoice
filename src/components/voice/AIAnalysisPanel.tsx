import { useState, useEffect } from 'react'
import { Sparkles, CheckCircle, AlertCircle, Cpu, Users, Link } from 'lucide-react'
import { AIAnalysis, extractIntent } from '../../lib/anthropic'
import toast from 'react-hot-toast'

interface AIAnalysisPanelProps {
  transcript: string
  projectId: string
  imageUrl?: string
  onComplete: (analysis: AIAnalysis) => void
}

export default function AIAnalysisPanel({ transcript, onComplete }: AIAnalysisPanelProps) {
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [stage, setStage] = useState<string>('Initializing AI analysis...')

  useEffect(() => {
    let active = true

    const runAnalysis = async () => {
      try {
        setStage('Extracting feature requirements...')
        const result = await extractIntent(transcript)
        
        if (active) {
          setAnalysis(result)
          setLoading(false)
          onComplete(result)
        }
      } catch (err: any) {
        if (active) {
          console.error(err)
          toast.error('AI Analysis failed. Please try again.')
          setStage('Analysis failed. Please refresh or try again.')
        }
      }
    }

    runAnalysis()

    return () => { active = false }
  }, [transcript, onComplete])

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-[#60A5FA]" />
        <h3 className="text-white font-semibold">AI Analysis</h3>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="spinner spinner-blue" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p className="text-slate-400 text-sm text-center">{stage}</p>
        </div>
      ) : analysis && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="bg-[#0B0F19] rounded-xl border border-emerald-900/30 p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">{analysis.summary}</p>
          </div>

          <Section title="Business Type" icon={<Cpu className="w-4 h-4 text-blue-400" />}>
            <p className="text-slate-300 text-sm">{analysis.businessType}</p>
            <p className="text-slate-500 text-xs mt-0.5">Industry: {analysis.industry}</p>
          </Section>

          <Section title="Integrations" icon={<Link className="w-4 h-4 text-purple-400" />}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.integrations?.map(t => (
                <span key={t} className="px-2 py-0.5 bg-purple-900/20 border border-purple-900/40 text-purple-300 rounded-md text-xs">{t}</span>
              ))}
            </div>
          </Section>

          <Section title={`Features Extracted (${analysis.features?.length || 0})`} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}>
            <div className="space-y-1.5">
              {analysis.features?.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-400" />
                  <span className="text-slate-300 text-xs">{f}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="User Roles" icon={<Users className="w-4 h-4 text-yellow-400" />}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.userRoles?.map(r => (
                <span key={r} className="px-2 py-0.5 bg-yellow-900/20 border border-yellow-900/40 text-yellow-300 rounded-md text-xs">{r}</span>
              ))}
            </div>
          </Section>

          <Section title="Clarifying Questions" icon={<AlertCircle className="w-4 h-4 text-orange-400" />}>
            <div className="space-y-1">
              {analysis.clarifyingQuestions?.map((q, i) => (
                <p key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                  <span className="text-orange-400 mt-0.5">›</span>{q}
                </p>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#0B0F19] rounded-xl border border-[#1E293B] p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-slate-300 text-xs font-semibold">{title}</p>
      </div>
      {children}
    </div>
  )
}
