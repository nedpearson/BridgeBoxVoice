import { useState } from 'react'
import { Cpu, AlertTriangle, ShieldAlert, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props {
  workspaceId?: string
}

export default function AIGovernance({ }: Props) {
  const [safetyFilter, setSafetyFilter] = useState(true)
  const [piiRedaction, setPiiRedaction] = useState(true)
  const [promptInjection, setPromptInjection] = useState(true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div style={{ background: '#131B2B', border: '1px solid #1E293B', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={20} color="#A855F7" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F1F5F9' }}>AI Governance & Guardrails</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Manage AI usage policies, guardrails, and compliance filters</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <BarChart3 size={16} color="#A855F7" />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>Monthly Usage Cap</p>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>$1,250<span style={{ fontSize: 14, color: '#64748B', fontWeight: 400 }}> / $5,000</span></p>
            <div style={{ width: '100%', height: 6, background: '#1E293B', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: '25%', height: '100%', background: '#A855F7', borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={16} color="#F59E0B" />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>Blocked Injections</p>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>14</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>In the last 30 days</p>
          </div>
        </div>

        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>Security Filters</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Prompt Injection Prevention</p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Actively scan and block malicious prompt injections.</p>
            </div>
            <div onClick={() => setPromptInjection(!promptInjection)} style={{ cursor: 'pointer' }}>
              {promptInjection ? <ToggleRight size={32} color="#A855F7" /> : <ToggleLeft size={32} color="#475569" />}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Content Safety Filter</p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Block unsafe, toxic, or non-compliant AI generated outputs.</p>
            </div>
            <div onClick={() => setSafetyFilter(!safetyFilter)} style={{ cursor: 'pointer' }}>
              {safetyFilter ? <ToggleRight size={32} color="#A855F7" /> : <ToggleLeft size={32} color="#475569" />}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Outbound PII Redaction</p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Prevent sensitive data from being sent to external LLM providers.</p>
            </div>
            <div onClick={() => setPiiRedaction(!piiRedaction)} style={{ cursor: 'pointer' }}>
              {piiRedaction ? <ToggleRight size={32} color="#A855F7" /> : <ToggleLeft size={32} color="#475569" />}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: 12, display: 'flex', gap: 12 }}>
          <ShieldAlert size={20} color="#A855F7" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#C084FC' }}>Zero Data Retention Policy</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#E9D5FF' }}>Your workspace is configured with a strict Zero Data Retention (ZDR) policy with all LLM providers. Prompts and completions are not stored or used for model training.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
