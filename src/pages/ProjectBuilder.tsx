import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../store/appStore'
import { Mic, ChevronRight, CheckCircle, Sparkles, Code2, Rocket } from 'lucide-react'
import VoiceRecorder from '../components/voice/VoiceRecorder'
import TranscriptViewer from '../components/voice/TranscriptViewer'
import AIAnalysisPanel from '../components/voice/AIAnalysisPanel'
import ClarifyChat from '../components/voice/ClarifyChat'
import SpecEditor from '../components/builder/SpecEditor'
import BuildConsole from '../components/builder/BuildConsole'
import DeploymentPanel from '../components/deploy/DeploymentPanel'
import { AIAnalysis, Specification } from '../types/platform'


type Step = 'record' | 'analyze' | 'spec' | 'build' | 'deploy'

const STEPS: { id: Step; label: string; icon: React.FC<any> }[] = [
  { id: 'record', label: 'Record', icon: Mic },
  { id: 'analyze', label: 'Analyze', icon: Sparkles },
  { id: 'spec', label: 'Spec Review', icon: CheckCircle },
  { id: 'build', label: 'Build', icon: Code2 },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
]

export default function ProjectBuilder() {
  const { projectId } = useParams()
  const { projects, activeProject, setActiveProject } = useStore()
  const [step, setStep] = useState<Step>('record')
  const [transcript, setTranscript] = useState('')
  const [visionImage, setVisionImage] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [spec, setSpec] = useState<Specification | null>(null)

  useEffect(() => {
    const p = projects.find(x => x.id === projectId) ?? null
    setActiveProject(p)
  }, [projectId, projects, setActiveProject])

  const stepIndex = STEPS.findIndex(s => s.id === step)

  const handleTranscriptComplete = (t: string, imageBase64?: string) => {
    setTranscript(t)
    if (imageBase64) setVisionImage(imageBase64)
    setStep('analyze')
  }

  const handleAnalysisComplete = (a: AIAnalysis) => {
    setAnalysis(a)
    setStep('spec')
  }

  const handleSpecApproved = (s: Specification) => {
    setSpec(s)
    setStep('build')
  }

  const handleBuildComplete = () => {
    setStep('deploy')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="border-b border-[#1E293B] px-8 py-5 bg-[#0C1322]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{activeProject?.name ?? 'New Project'}</h2>
            {activeProject?.industry && <p className="text-slate-500 text-xs mt-0.5">{activeProject.industry}</p>}
          </div>
          {/* Step Progress */}
          <div className="flex items-center gap-1">
            {STEPS.map(({ id, label, icon: Icon }, i) => {
              const done = i < stepIndex
              const active = id === step
              return (
                <div key={id} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    active ? 'bg-blue-600 text-white' :
                    done ? 'bg-emerald-600/20 text-emerald-400' :
                    'text-slate-600'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-700 mx-1" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'record' && (
          <VoiceRecorder projectId={projectId!} onComplete={handleTranscriptComplete} />
        )}
        {step === 'analyze' && (
          <div className="flex flex-col lg:flex-row h-full">
            <div className="flex-1 min-w-0">
              <TranscriptViewer transcript={transcript} />
            </div>
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#1E293B]">
              <AIAnalysisPanel
                transcript={transcript}
                projectId={projectId!}
                imageUrl={visionImage || undefined}
                onComplete={handleAnalysisComplete}
              />
            </div>
          </div>
        )}
        {step === 'spec' && analysis && (
          <div className="flex flex-col lg:flex-row h-full">
            <div className="flex-1 min-w-0">
              <SpecEditor analysis={analysis} projectId={projectId!} onApprove={handleSpecApproved} />
            </div>
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#1E293B]">
              <ClarifyChat analysis={analysis} projectId={projectId!} />
            </div>
          </div>
        )}
        {step === 'build' && spec && (
          <BuildConsole spec={spec} projectId={projectId!} onComplete={handleBuildComplete} />
        )}
        {step === 'deploy' && (
          <DeploymentPanel projectId={projectId!} />
        )}
      </div>
    </div>
  )
}
