import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Copy, ExternalLink } from 'lucide-react'
import { getSSOConfig, upsertSSOConfig, rotateSCIMToken, getACSUrl, getEntityId, PROVIDER_DOCS, type SSOProvider } from '../../lib/enterprise/sso'

const PROVIDERS: { id: SSOProvider; name: string; icon: string; color: string }[] = [
  { id: 'okta',        name: 'Okta',                icon: '🔑', color: '#007DC1' },
  { id: 'azure_ad',    name: 'Azure AD',             icon: '☁️', color: '#0078D4' },
  { id: 'google',      name: 'Google Workspace',     icon: '🔵', color: '#4285F4' },
  { id: 'onelogin',    name: 'OneLogin',             icon: '🔐', color: '#2C3543' },
  { id: 'custom_saml', name: 'Custom SAML 2.0',      icon: '⚙️', color: '#6366F1' },
]

interface Props { workspaceId: string }

export default function SSOConfig({ workspaceId }: Props) {
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getSSOConfig>>>(null)
  const [selectedProvider, setSelectedProvider] = useState<SSOProvider>('okta')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [jitEnabled, setJitEnabled] = useState(true)
  const [scimEnabled, setScimEnabled] = useState(false)
  const [defaultRole, setDefaultRole] = useState('member')
  const [scimToken, setScimToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('ssoTab') as 'saml' | 'scim' | 'mapping') ?? 'saml'
  const setTab = (newTab: 'saml' | 'scim' | 'mapping') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('ssoTab', newTab)
      return next
    }, { replace: true })
  }

  const acsUrl = getACSUrl(workspaceId)
  const entityId = getEntityId(workspaceId)

  useEffect(() => {
    getSSOConfig(workspaceId).then(cfg => {
      if (cfg) {
        setConfig(cfg)
        setSelectedProvider(cfg.provider)
        setMetadataUrl(cfg.samlMetadataUrl ?? '')
        setJitEnabled(cfg.jitProvisioning)
        setScimEnabled(cfg.scimEnabled)
        setDefaultRole(cfg.defaultRole)
      }
    })
  }, [workspaceId])

  const handleSave = async () => {
    setLoading(true)
    try {
      await upsertSSOConfig(workspaceId, {
        provider: selectedProvider,
        samlMetadataUrl: metadataUrl || null,
        samlAcsUrl: acsUrl,
        samlEntityId: entityId,
        jitProvisioning: jitEnabled,
        scimEnabled,
        defaultRole,
        enabled: true,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleRotateSCIM = async () => {
    const token = await rotateSCIMToken(workspaceId)
    setScimToken(token)
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: 10, borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>Single Sign-On</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>SAML 2.0 and SCIM 2.0 enterprise authentication</p>
        </div>
        {config?.enabled && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#4ADE80', fontSize: 12, fontWeight: 600 }}>
            <CheckCircle size={12} /> Active
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {(['saml', 'scim', 'mapping'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? '#6366F1' : '#94A3B8',
            borderBottom: `2px solid ${tab === t ? '#6366F1' : 'transparent'}`,
            marginBottom: -1, textTransform: 'capitalize'
          }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'saml' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Provider selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 10 }}>Identity Provider</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setSelectedProvider(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  border: `2px solid ${selectedProvider === p.id ? p.color : 'transparent'}`,
                  borderRadius: 10, background: selectedProvider === p.id ? `${p.color}20` : 'rgba(255,255,255,0.04)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#E2E8F0',
                  transition: 'all 0.15s'
                }}>
                  <span style={{ fontSize: 16 }}>{p.icon}</span> {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* ACS / Entity ID (read-only) */}
          <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(99,102,241,0.2)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1 }}>
              Configure in Your IdP
            </p>
            {[
              { label: 'ACS URL (Reply URL)', value: acsUrl },
              { label: 'Entity ID (Audience URI)', value: entityId },
              { label: 'Name ID Format', value: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#94A3B8', width: 180, flexShrink: 0 }}>{label}</span>
                <code style={{ flex: 1, fontSize: 11, color: '#E2E8F0', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</code>
                <button onClick={() => copy(value)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', padding: 4 }}>
                  <Copy size={14} />
                </button>
              </div>
            ))}
            <a href={PROVIDER_DOCS[selectedProvider].docsUrl} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6366F1', textDecoration: 'none', marginTop: 4 }}>
              Setup guide for {PROVIDER_DOCS[selectedProvider].name} <ExternalLink size={12} />
            </a>
          </div>

          {/* Metadata URL */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>
              IdP Metadata URL <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>
            </label>
            <input
              value={metadataUrl}
              onChange={e => setMetadataUrl(e.target.value)}
              placeholder={`https://your-idp.${selectedProvider === 'okta' ? 'okta.com' : 'example.com'}/app/metadata`}
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Just-in-Time (JIT) Provisioning', desc: 'Auto-create accounts on first SSO login', value: jitEnabled, set: setJitEnabled },
            ].map(({ label, desc, value, set }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{desc}</p>
                </div>
                <button onClick={() => set(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'scim' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>SCIM 2.0 Endpoint</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, fontSize: 12, color: '#E2E8F0', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6 }}>
                {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scim/v2/${workspaceId}`}
              </code>
              <button onClick={() => copy(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scim/v2/${workspaceId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1' }}>
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>SCIM Bearer Token</label>
            {scimToken ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)' }}>
                  <AlertTriangle size={14} color="#FACC15" />
                  <span style={{ fontSize: 12, color: '#94A3B8', flex: 1 }}>Copy now — this token won't be shown again</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <code style={{ flex: 1, fontSize: 12, color: '#4ADE80', background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: 8, overflowX: 'auto' }}>{scimToken}</code>
                  <button onClick={() => copy(scimToken)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1' }}><Copy size={16} /></button>
                </div>
              </div>
            ) : (
              <button onClick={handleRotateSCIM} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, cursor: 'pointer', color: '#A5B4FC', fontSize: 13, fontWeight: 500 }}>
                <RefreshCw size={14} /> Generate SCIM Token
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Enable SCIM Provisioning</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Auto-create, update, and deactivate users from your IdP</p>
            </div>
            <button onClick={() => setScimEnabled(!scimEnabled)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: scimEnabled ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 2, left: scimEnabled ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
      )}

      {tab === 'mapping' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Map IdP attributes to Bridgebox Voice user fields</p>
          {[
            { bbField: 'Email', idpAttr: 'email', required: true },
            { bbField: 'First Name', idpAttr: 'firstName', required: false },
            { bbField: 'Last Name', idpAttr: 'lastName', required: false },
            { bbField: 'Department', idpAttr: 'department', required: false },
            { bbField: 'Role', idpAttr: 'role', required: false },
          ].map(({ bbField, idpAttr, required }) => (
            <div key={bbField} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 120, fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{bbField} {required && <span style={{ color: '#EF4444' }}>*</span>}</span>
              <span style={{ color: '#64748B', fontSize: 12 }}>←</span>
              <input defaultValue={idpAttr} style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }} />
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      <button onClick={handleSave} disabled={loading} style={{
        padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', alignSelf: 'flex-start',
        background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        color: saved ? '#4ADE80' : '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.2s'
      }}>
        {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <><CheckCircle size={16} /> Saved!</> : 'Save SSO Configuration'}
      </button>
    </div>
  )
}

