import { useState, useEffect, useRef } from 'react'
import { Specification } from '../../types/platform'
import { CheckCircle, Cpu, Palette, Code2, ShieldCheck } from 'lucide-react'

interface BuildConsoleProps {
  spec: Specification
  projectId: string
  onComplete: () => void
}



const AGENTS = [
  { agent: 'Architect Agent', icon: Cpu, messages: [
    '🧠 Analyzing specification — 8 features detected',
    '📐 Designing system architecture (React 18 + Supabase)',
    '🗃️  Generating database schema — 6 tables',
    '🔑  Planning RLS policies for 3 user roles',
    '✅  Architecture complete',
  ]},
  { agent: 'Designer Agent', icon: Palette, messages: [
    '🎨 Generating color palette (branded to business type)',
    '📱 Creating responsive component library',
    '🖼️  Designing 12 UI screens (mobile + desktop)',
    '✅  Design system complete',
  ]},
  { agent: 'Developer Agent', icon: Code2, messages: [
    '⚙️  Scaffolding React + TypeScript project',
    '📦 Installing dependencies (27 packages)',
    '🔧 Generating authentication module',
    '📋 Writing Crew Clock In/Out component',
    '📋 Writing Daily Job List component',
    '📸 Writing Before/After Photo capture module',
    '📊 Writing Admin Revenue Dashboard',
    '🔗 Generating QuickBooks sync service',
    '📅 Generating Google Calendar integration',
    '💬 Generating Twilio SMS reminder scheduler',
    '✅  All components generated — 2,847 lines of code',
  ]},
  { agent: 'QA Agent', icon: ShieldCheck, messages: [
    '🔍 Running TypeScript type checks — passed',
    '🧪 Testing authentication flows — passed',
    '🔒 Verifying RLS policies — passed',
    '📱 Testing responsive layouts — passed',
    '✅  All QA checks passed',
  ]},
]

export default function BuildConsole({ projectId, onComplete }: BuildConsoleProps) {
  const [lines, setLines] = useState<string[]>(['$ bridgebox build --project=' + projectId, ''])
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let totalDelay = 0

    const addLine = (msg: string, delay: number) => {
      totalDelay += delay
      setTimeout(() => {
        if (!cancelled) setLines(prev => [...prev, msg])
      }, totalDelay)
    }

    AGENTS.forEach(({ agent, messages }) => {
      addLine(`\n[${agent}] Starting...`, 400)
      messages.forEach(msg => addLine(`  ${msg}`, 600))
    })

    totalDelay += 800
    setTimeout(() => {
      if (!cancelled) {
        setLines(prev => [...prev, '', '✅  Build successful! Ready to deploy.', ''])
        setDone(true)
        onComplete()
      }
    }, totalDelay)

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Building Your App</h3>
          <p className="text-slate-400 text-sm mt-0.5">Multi-agent AI system generating your production codebase</p>
        </div>
        {done && (
          <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-900/40 px-3 py-1.5 rounded-xl">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Build Complete</span>
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#050912] rounded-2xl border border-[#0F1A2E] p-5 font-mono text-sm overflow-y-auto">
        {lines.map((line, i) => (
          <div key={i} className={`leading-relaxed whitespace-pre-wrap ${
            line.startsWith('[') ? 'text-[#60A5FA] font-bold mt-2' :
            line.includes('✅') ? 'text-emerald-400' :
            line.startsWith('$') ? 'text-slate-300' :
            'text-slate-400'
          }`}>
            {line || '\u00A0'}
          </div>
        ))}
        {!done && (
          <span className="inline-block w-2 h-4 bg-[#60A5FA] animate-pulse ml-0.5" />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
