import { useState } from 'react'
import {
  Shield, Key, Users, Flag, Lock, Globe, FileText, Cpu,
  Activity, LifeBuoy, Palette, HelpCircle, ChevronRight, Sparkles
} from 'lucide-react'
import SSOConfig from '../components/enterprise/SSOConfig'
import EnhancementStudioTab from '../components/enterprise/EnhancementStudioTab'
import RoleBuilder from '../components/enterprise/RoleBuilder'
import AuditLog from '../components/enterprise/AuditLog'
import FeatureFlags from '../components/enterprise/FeatureFlags'
import ApiKeyManager from '../components/enterprise/ApiKeyManager'
import SecuritySettings from '../components/enterprise/SecuritySettings'
import WhiteLabel from '../components/enterprise/WhiteLabel'

const SECTIONS = [
  {
    id: 'enhancements', label: 'Enhancement Studio', icon: <Sparkles size={18} />, color: '#6366F1',
    desc: 'Review feature requests, AI briefs, and cross-workspace merges',
    component: (wid: string) => <EnhancementStudioTab workspaceId={wid} />,
  },
  {
    id: 'sso', label: 'Single Sign-On', icon: <Key size={18} />, color: '#8B5CF6',
    desc: 'SAML 2.0, SCIM, JIT provisioning',
    component: (wid: string) => <SSOConfig workspaceId={wid} />,
  },
  {
    id: 'roles', label: 'Roles & Permissions', icon: <Users size={18} />, color: '#8B5CF6',
    desc: 'Custom RBAC and attribute-based access control',
    component: (wid: string) => <RoleBuilder workspaceId={wid} />,
  },
  {
    id: 'audit', label: 'Audit Log', icon: <FileText size={18} />, color: '#3B82F6',
    desc: 'Tamper-proof immutable event history',
    component: (wid: string) => <AuditLog workspaceId={wid} />,
  },
  {
    id: 'flags', label: 'Feature Flags', icon: <Flag size={18} />, color: '#06B6D4',
    desc: 'Gradual rollouts and per-workspace feature toggles',
    component: (wid: string) => <FeatureFlags workspaceId={wid} />,
  },
  {
    id: 'api_keys', label: 'API Keys', icon: <Key size={18} />, color: '#84CC16',
    desc: 'Generate and manage API credentials',
    component: (wid: string) => <ApiKeyManager workspaceId={wid} />,
  },
  {
    id: 'security', label: 'Security', icon: <Lock size={18} />, color: '#EF4444',
    desc: 'IP allowlists, MFA, session policies',
    component: (wid: string) => <SecuritySettings workspaceId={wid} />,
  },
  {
    id: 'white_label', label: 'White-Label', icon: <Palette size={18} />, color: '#F97316',
    desc: 'Branding, custom domain, email templates',
    component: (wid: string) => <WhiteLabel workspaceId={wid} />,
  },
  {
    id: 'data', label: 'Data Residency', icon: <Globe size={18} />, color: '#0EA5E9',
    desc: 'Region selection, geo-fencing, PII masking',
    component: (_: string) => <DataResidencyPlaceholder />,
  },
  {
    id: 'compliance', label: 'Compliance', icon: <Shield size={18} />, color: '#10B981',
    desc: 'SOC 2, GDPR, HIPAA, PCI-DSS reports',
    component: (_: string) => <CompliancePlaceholder />,
  },
  {
    id: 'ai', label: 'AI Governance', icon: <Cpu size={18} />, color: '#A855F7',
    desc: 'Usage caps, safety, prompt injection detection',
    component: (_: string) => <AIGovernancePlaceholder />,
  },
  {
    id: 'support', label: 'Support', icon: <LifeBuoy size={18} />, color: '#F59E0B',
    desc: 'Tickets, priority queues, contact team',
    component: (_: string) => <SupportPlaceholder />,
  },
]

// Placeholder components for sections not yet wired
const Placeholder = ({ title, desc }: { title: string; desc: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#64748B', textAlign: 'center' }}>
    <HelpCircle size={40} style={{ opacity: 0.3 }} />
    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#94A3B8' }}>{title}</p>
    <p style={{ margin: 0, fontSize: 13 }}>{desc}</p>
  </div>
)

const DataResidencyPlaceholder = () => <Placeholder title="Data Residency" desc="Region selection, geo-fencing, and PII classification coming in next phase." />
const CompliancePlaceholder = () => <Placeholder title="Compliance Reports" desc="SOC 2 Type II, GDPR, HIPAA, and PCI-DSS reports available for Enterprise plans." />
const AIGovernancePlaceholder = () => <Placeholder title="AI Governance" desc="Usage caps, prompt injection detection, and code safety analysis — managed via aiGovernance.ts service." />
const SupportPlaceholder = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
    <div style={{ padding: 20, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', gap: 16 }}>
      <LifeBuoy size={24} color="#6366F1" style={{ flexShrink: 0 }} />
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#E2E8F0' }}>Enterprise Support</p>
        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>24/7 support with &lt;1 hour response SLA for Enterprise customers. Contact your dedicated Customer Success Manager.</p>
        <a href="mailto:enterprise@bridgebox.ai" style={{ display: 'inline-block', marginTop: 12, padding: '8px 18px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Contact Support</a>
      </div>
    </div>
  </div>
)

interface Props { workspaceId?: string }

export default function EnterprisePage({ workspaceId = 'demo-workspace' }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const active = SECTIONS.find(s => s.id === activeSection)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: "'Inter', sans-serif", color: '#E2E8F0' }}>
      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Enterprise</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>Admin & Security Control Center</p>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(section => (
            <button key={section.id} onClick={() => setActiveSection(section.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeSection === section.id ? `${section.color}20` : 'transparent', textAlign: 'left', transition: 'all 0.15s' }}>
              <span style={{ color: activeSection === section.id ? section.color : '#64748B', flexShrink: 0 }}>{section.icon}</span>
              <span style={{ fontSize: 13, fontWeight: activeSection === section.id ? 600 : 400, color: activeSection === section.id ? '#E2E8F0' : '#94A3B8', flex: 1 }}>{section.label}</span>
              {activeSection === section.id && <ChevronRight size={12} color={section.color} />}
            </button>
          ))}
        </nav>

        {/* Tier badge */}
        <div style={{ margin: '16px 12px', padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1 }}>Enterprise Plan</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>All features unlocked</p>
        </div>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>{active?.label ?? 'Enterprise Hub'}</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{active?.desc ?? 'Select a section from the sidebar to configure enterprise features'}</p>
          </div>
          <a href="/status" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#94A3B8', textDecoration: 'none', fontWeight: 500 }}>
            <Activity size={13} /> System Status
          </a>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {activeSection === null ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {SECTIONS.map(section => (
                <button key={section.id} onClick={() => setActiveSection(section.id)} style={{ padding: '20px', borderRadius: 16, border: `1px solid rgba(255,255,255,0.08)`, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 12 }}
                  onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${section.color}40`; e.currentTarget.style.background = `${section.color}08` }}
                  onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${section.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: section.color }}>{section.icon}</div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>{section.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{section.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : active ? active.component(workspaceId) : null}
        </div>
      </div>
    </div>
  )
}
