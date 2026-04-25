import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Branding {
  brand_name: string; logo_url: string; primary_color: string; secondary_color: string
  custom_domain: string; custom_css: string; email_from_name: string; email_from_address: string
  support_email: string; hide_powered_by: boolean
}

const DEFAULT: Branding = { brand_name: '', logo_url: '', primary_color: '#6366F1', secondary_color: '#F97316', custom_domain: '', custom_css: '', email_from_name: '', email_from_address: '', support_email: '', hide_powered_by: false }

interface Props { workspaceId: string }

export default function WhiteLabel({ workspaceId }: Props) {
  const [branding, setBranding] = useState<Branding>(DEFAULT)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('wlTab') as 'brand' | 'domain' | 'email' | 'css') ?? 'brand'
  const setTab = (newTab: 'brand' | 'domain' | 'email' | 'css') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('wlTab', newTab)
      return next
    }, { replace: true })
  }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    supabase.from('tenant_branding').select('*').eq('workspace_id', workspaceId).single().then(({ data }) => {
      if (data) setBranding(data as Branding)
    })
  }, [workspaceId])

  const save = async () => {
    setSaving(true)
    await supabase.from('tenant_branding').upsert({ workspace_id: workspaceId, ...branding, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const set = (key: keyof Branding, value: string | boolean) => setBranding(b => ({ ...b, [key]: value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {(['brand', 'domain', 'email', 'css'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#6366F1' : '#64748B', borderBottom: `2px solid ${tab === t ? '#6366F1' : 'transparent'}`, marginBottom: -1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t === 'css' ? 'Custom CSS' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button onClick={() => setPreview(!preview)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: preview ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${preview ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, cursor: 'pointer', color: preview ? '#A5B4FC' : '#94A3B8', fontSize: 12, fontWeight: 500 }}>
          <Eye size={14} /> Preview
        </button>
      </div>

      {preview && (
        <div style={{ padding: 20, background: 'rgba(0,0,0,0.4)', borderRadius: 12, border: `2px solid ${branding.primary_color}40` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {branding.logo_url && <img src={branding.logo_url} alt="logo" style={{ height: 32, borderRadius: 6 }} />}
            <span style={{ fontSize: 18, fontWeight: 700, color: branding.primary_color }}>{branding.brand_name || 'Your Brand'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 20px', background: branding.primary_color, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Primary Button</button>
            <button style={{ padding: '8px 20px', background: branding.secondary_color, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Secondary</button>
          </div>
          {!branding.hide_powered_by && <p style={{ margin: '12px 0 0', fontSize: 11, color: '#64748B' }}>Powered by Bridgebox Voice</p>}
        </div>
      )}

      {tab === 'brand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Brand Name</label>
            <input value={branding.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder="Acme Corp" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Logo URL</label>
            <input value={branding.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://yourcdn.com/logo.png" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[{ label: 'Primary Color', key: 'primary_color' }, { label: 'Secondary Color', key: 'secondary_color' }].map(({ label, key }) => (
              <div key={key}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>{label}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={(branding as any)[key]} onChange={e => set(key as keyof Branding, e.target.value)} style={{ width: 44, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                  <input value={(branding as any)[key]} onChange={e => set(key as keyof Branding, e.target.value)} style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, fontFamily: 'monospace' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Hide "Powered by Bridgebox Voice"</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Remove Bridgebox Voice branding from your workspace</p>
            </div>
            <button onClick={() => set('hide_powered_by', !branding.hide_powered_by)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: branding.hide_powered_by ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 2, left: branding.hide_powered_by ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
      )}

      {tab === 'domain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#A5B4FC' }}>Custom Domain Setup</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>1. Add a CNAME record: <code style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>your-domain.com → proxy.bridgebox.ai</code><br />2. Enter your domain below and we'll auto-provision TLS</p>
          </div>
          <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Custom Domain</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={branding.custom_domain} onChange={e => set('custom_domain', e.target.value)} placeholder="app.yourcompany.com" style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }} />
              <button style={{ padding: '10px 16px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, color: '#A5B4FC', cursor: 'pointer', fontSize: 13 }}>Verify DNS</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[{ label: 'From Name', key: 'email_from_name', placeholder: 'Acme Corp' }, { label: 'From Email', key: 'email_from_address', placeholder: 'noreply@yourcompany.com' }, { label: 'Support Email', key: 'support_email', placeholder: 'support@yourcompany.com' }].map(({ label, key, placeholder }) => (
            <div key={key}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>{label}</label>
              <input value={(branding as any)[key]} onChange={e => set(key as keyof Branding, e.target.value)} placeholder={placeholder} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
      )}

      {tab === 'css' && (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Custom CSS</label>
          <textarea value={branding.custom_css} onChange={e => set('custom_css', e.target.value)} placeholder={`:root {\n  --brand-primary: #6366F1;\n  --brand-secondary: #F97316;\n}\n\n.sidebar {\n  background: #0F172A;\n}`} rows={16} style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
      )}

      <button onClick={save} style={{ padding: '10px 22px', background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: saved ? '#4ADE80' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
        {saving ? <><RefreshCw size={14} /> Saving…</> : saved ? '✓ Saved' : <><Save size={14} /> Save Branding</>}
      </button>
    </div>
  )
}

