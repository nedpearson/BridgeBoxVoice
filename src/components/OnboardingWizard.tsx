import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Building2, Sliders, Rocket, CheckCircle, ArrowRight, Mic, Globe } from 'lucide-react'

interface Step { id: string; title: string; description: string; icon: React.ReactNode }

const STEPS: Step[] = [
  { id: 'workspace',   title: 'Name Your Workspace',   description: 'This is your team\'s home base on BridgeBox.', icon: <Building2 size={24} color="#6366F1" /> },
  { id: 'team',        title: 'Invite Your Team',       description: 'Get your colleagues set up right away.',        icon: <Users size={24} color="#8B5CF6" /> },
  { id: 'preferences', title: 'Quick Preferences',      description: 'Customize the platform to fit how you work.',   icon: <Sliders size={24} color="#06B6D4" /> },
  { id: 'launch',      title: 'You\'re Ready!',          description: 'Start building with voice.',                    icon: <Rocket size={24} color="#4ADE80" /> },
]

interface Props { onComplete: () => void; workspaceId: string }

export default function OnboardingWizard({ onComplete, workspaceId }: Props) {
  const [step, setStep] = useState(0)
  const [workspaceName, setWorkspaceName] = useState('')
  const [emails, setEmails] = useState('')
  const [preferVoice, setPreferVoice] = useState(true)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const isLast = step === STEPS.length - 1

  const next = async () => {
    if (step === 0 && workspaceName.trim()) {
      await supabase.from('workspaces').update({ name: workspaceName.trim() }).eq('id', workspaceId)
    }
    if (isLast) {
      setSaving(true)
      // Mark onboarding complete
      await supabase.from('workspaces').update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() } as any).eq('id', workspaceId)
      // Send invites
      if (emails.trim()) {
        const addrs = emails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean)
        for (const email of addrs) {
          await Promise.resolve(supabase.from('workspace_invitations').insert({ workspace_id: workspaceId, email, role: 'member' } as any)).catch(() => {})
        }
      }
      setSaving(false)
      setDone(true)
      setTimeout(() => onComplete(), 1500)
      return
    }
    setStep(s => s + 1)
  }

  const skip = () => {
    if (isLast) { onComplete(); return }
    setStep(s => s + 1)
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F172A', gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={36} color="#4ADE80" />
        </div>
        <h1 style={{ color: '#F1F5F9', fontSize: 24, fontWeight: 700, margin: 0 }}>You're all set!</h1>
        <p style={{ color: '#64748B', margin: 0 }}>Taking you to your workspace…</p>
      </div>
    )
  }

  const current = STEPS[step]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: "'Inter', sans-serif", color: '#E2E8F0' }}>
      {/* Left panel */}
      <div style={{ width: 280, background: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Bridgebox Voice Setup</span>
        </div>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: i < step ? 'rgba(74,222,128,0.2)' : i === step ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)', border: `2px solid ${i < step ? '#4ADE80' : i === step ? '#6366F1' : 'rgba(255,255,255,0.1)'}`, fontSize: 12, fontWeight: 700, color: i < step ? '#4ADE80' : i === step ? '#A5B4FC' : '#475569', transition: 'all 0.2s' }}>
              {i < step ? '✓' : i + 1}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: i === step ? 600 : 400, color: i === step ? '#E2E8F0' : i < step ? '#64748B' : '#475569' }}>{s.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ marginBottom: 32 }}>
            {current.icon}
            <h2 style={{ margin: '16px 0 8px', fontSize: 28, fontWeight: 700, color: '#F1F5F9' }}>{current.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: '#64748B', lineHeight: 1.6 }}>{current.description}</p>
          </div>

          {step === 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Workspace Name</label>
              <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="Acme Corp" autoFocus
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#E2E8F0', fontSize: 15, boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && workspaceName.trim() && next()} />
            </div>
          )}

          {step === 1 && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Team Email Addresses</label>
              <textarea value={emails} onChange={e => setEmails(e.target.value)} placeholder="alice@company.com&#10;bob@company.com&#10;carol@company.com" rows={5}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#E2E8F0', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7 }} />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569' }}>One per line or comma-separated. Invites sent automatically.</p>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}><Mic size={14} /> Default to Voice Input</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Open voice recorder automatically on new projects</p>
                </div>
                <button onClick={() => setPreferVoice(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: preferVoice ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: preferVoice ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={14} /> Your Timezone</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Used for scheduling and deadlines</p>
                </div>
                <input value={timezone} onChange={e => setTimezone(e.target.value)} style={{ width: 200, padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Voice recorder → AI transcription active',
                'Projects & task management ready',
                'Team invitations sent',
                'Enterprise security features available',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(74,222,128,0.06)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.2)' }}>
                  <CheckCircle size={16} color="#4ADE80" />
                  <span style={{ fontSize: 13, color: '#94A3B8' }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>
            <button onClick={skip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 500 }}>{isLast ? 'Skip' : 'Skip for now'}</button>
            <button onClick={next} disabled={saving || (step === 0 && !workspaceName.trim())} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: isLast ? 'linear-gradient(135deg, #4ADE80, #22C55E)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (step === 0 && !workspaceName.trim()) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
              {saving ? 'Setting up…' : isLast ? <><Rocket size={16} /> Launch Bridgebox Voice</> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 32 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? '#6366F1' : i < step ? '#4ADE80' : 'rgba(255,255,255,0.12)', transition: 'all 0.25s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
