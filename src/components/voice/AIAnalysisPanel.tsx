import { useState, useEffect } from 'react'
import { Sparkles, CheckCircle, AlertCircle, Cpu, Users, Link } from 'lucide-react'
import { AIAnalysis } from '../../types/platform'

interface AIAnalysisPanelProps {
  transcript: string
  projectId: string
  imageUrl?: string
  onComplete: (analysis: AIAnalysis) => void
}

export default function AIAnalysisPanel({ onComplete }: AIAnalysisPanelProps) {
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [stage, setStage] = useState<string>('Initializing Claude AI...')

  useEffect(() => {
    const stages = [
      'Initializing Claude AI...',
      'Parsing business context...',
      'Extracting feature requirements...',
      'Identifying integration needs...',
      'Mapping user roles & permissions...',
      'Generating specification blueprint...',
    ]
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i < stages.length) setStage(stages[i])
      else clearInterval(interval)
    }, 700)

    // Simulate Claude analysis
    setTimeout(() => {
      clearInterval(interval)
      const mock: AIAnalysis = {
        business_type: 'Landscaping & Field Services',
        industry: 'Field Services',
        current_tools: ['QuickBooks', 'Google Calendar', 'Paper Notebook'],
        desired_features: [
          { name: 'Crew Clock In/Out', description: 'GPS-enabled time tracking for field workers', priority: 'must-have' },
          { name: 'Daily Job List', description: 'Crew sees their scheduled jobs for the day', priority: 'must-have' },
          { name: 'Before/After Photos', description: 'Photo capture attached to each job record', priority: 'must-have' },
          { name: 'Job Notes', description: 'Field notes and comments per job', priority: 'must-have' },
          { name: 'Revenue Dashboard', description: 'Monthly revenue, outstanding invoices', priority: 'must-have' },
          { name: 'Employee Hours Report', description: 'Hours worked per crew member', priority: 'must-have' },
          { name: 'Client SMS Reminders', description: 'Automated SMS 24h before appointment', priority: 'nice-to-have' },
          { name: 'Invoice Approval Workflow', description: 'Review and approve jobs before invoicing', priority: 'nice-to-have' },
        ],
        user_roles: [
          { name: 'Owner/Admin', permissions: ['full_access', 'manage_users', 'view_financials', 'approve_invoices'] },
          { name: 'Field Crew', permissions: ['clock_in', 'view_assigned_jobs', 'upload_photos', 'add_notes'] },
          { name: 'Foreman', permissions: ['view_all_crew', 'assign_jobs', 'approve_photos'] },
        ],
        integration_requirements: ['QuickBooks (invoicing sync)', 'Google Calendar (job scheduling)', 'Twilio (SMS reminders)'],
        dashboard_needs: ['Revenue this month', 'Outstanding invoices', 'Jobs completed today', 'Hours by employee', 'Upcoming jobs calendar'],
        platform_preference: ['web', 'ios', 'android'],
        clarifying_questions: [
          'How many crew members do you typically have on a job?',
          'Do clients need access to see job status or photos?',
          'Do you need inventory tracking for equipment and materials?',
        ],
        summary: 'A field service management platform for a landscaping business. Needs mobile-first crew app for time tracking, job management and photo documentation, plus an admin dashboard with QuickBooks integration for revenue and invoicing.',
      }
      setAnalysis(mock)
      setLoading(false)
      onComplete(mock)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

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
            <p className="text-slate-300 text-sm">{analysis.business_type}</p>
            <p className="text-slate-500 text-xs mt-0.5">Industry: {analysis.industry}</p>
          </Section>

          <Section title="Current Tools Detected" icon={<Link className="w-4 h-4 text-purple-400" />}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.current_tools.map(t => (
                <span key={t} className="px-2 py-0.5 bg-purple-900/20 border border-purple-900/40 text-purple-300 rounded-md text-xs">{t}</span>
              ))}
            </div>
          </Section>

          <Section title={`Features Extracted (${analysis.desired_features.length})`} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}>
            <div className="space-y-1.5">
              {analysis.desired_features.map(f => (
                <div key={f.name} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.priority === 'must-have' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <span className="text-slate-300 text-xs">{f.name}</span>
                  <span className="text-slate-600 text-[10px] ml-auto">{f.priority}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="User Roles" icon={<Users className="w-4 h-4 text-yellow-400" />}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.user_roles.map(r => (
                <span key={r.name} className="px-2 py-0.5 bg-yellow-900/20 border border-yellow-900/40 text-yellow-300 rounded-md text-xs">{r.name}</span>
              ))}
            </div>
          </Section>

          <Section title="Clarifying Questions" icon={<AlertCircle className="w-4 h-4 text-orange-400" />}>
            <div className="space-y-1">
              {analysis.clarifying_questions.map((q, i) => (
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
