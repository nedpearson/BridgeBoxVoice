import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, AlertCircle, Plus, Trash2, Clock, Smartphone } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props { workspaceId: string }

interface SessionPolicy { session_timeout_minutes: number; max_concurrent_sessions: number; require_mfa: boolean; mfa_methods: string[]; idle_timeout_minutes: number }
interface IPEntry { id?: string; cidr: string; label: string; enabled: boolean }

const DEFAULT_SESSION: SessionPolicy = { session_timeout_minutes: 480, max_concurrent_sessions: 5, require_mfa: false, mfa_methods: ['totp'], idle_timeout_minutes: 60 }

export default function SecuritySettings({ workspaceId }: Props) {
  const [session, setSession] = useState<SessionPolicy>(DEFAULT_SESSION)
  const [ips, setIPs] = useState<IPEntry[]>([])
  const [newCidr, setNewCidr] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('secTab') as 'session' | 'ip' | 'mfa') ?? 'session'
  const setTab = (newTab: 'session' | 'ip' | 'mfa') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('secTab', newTab)
      return next
    }, { replace: true })
  }

  useEffect(() => {
    supabase.from('session_policies').select('*').eq('workspace_id', workspaceId).single().then(({ data }) => {
      if (data) setSession(data as SessionPolicy)
    })
    supabase.from('ip_allowlists').select('*').eq('workspace_id', workspaceId).then(({ data }) => {
      setIPs((data ?? []) as IPEntry[])
    })
  }, [workspaceId])

  const saveSession = async () => {
    setSaving(true)
    await supabase.from('session_policies').upsert({ workspace_id: workspaceId, ...session, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const addIP = async () => {
    if (!newCidr.trim()) return
    const { data } = await supabase.from('ip_allowlists').insert({ workspace_id: workspaceId, cidr: newCidr.trim(), label: newLabel.trim(), enabled: true }).select().single()
    if (data) { setIPs(i => [...i, data as IPEntry]); setNewCidr(''); setNewLabel('') }
  }

  const removeIP = async (id: string) => {
    await supabase.from('ip_allowlists').delete().eq('id', id)
    setIPs(i => i.filter(ip => ip.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {(['session', 'ip', 'mfa'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#6366F1' : '#64748B', borderBottom: `2px solid ${tab === t ? '#6366F1' : 'transparent'}`, marginBottom: -1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t === 'ip' ? 'IP Allowlist' : t === 'mfa' ? 'MFA' : 'Sessions'}</button>
        ))}
      </div>

      {tab === 'session' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Session Timeout', key: 'session_timeout_minutes', unit: 'min', min: 30, max: 10080 },
            { label: 'Idle Timeout', key: 'idle_timeout_minutes', unit: 'min', min: 5, max: 480 },
            { label: 'Max Concurrent Sessions', key: 'max_concurrent_sessions', unit: '', min: 1, max: 20 },
          ].map(({ label, key, unit, min, max }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} color="#6366F1" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>{label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min={min} max={max} value={(session as any)[key]} onChange={e => setSession(s => ({ ...s, [key]: parseInt(e.target.value) }))} style={{ width: 80, padding: '6px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#E2E8F0', fontSize: 13, textAlign: 'center' }} />
                {unit && <span style={{ fontSize: 12, color: '#64748B' }}>{unit}</span>}
              </div>
            </div>
          ))}
          <button onClick={saveSession} style={{ padding: '10px 20px', background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: saved ? '#4ADE80' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Session Policy'}
          </button>
        </div>
      )}

      {tab === 'ip' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 14, background: 'rgba(251,191,36,0.08)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.25)', display: 'flex', gap: 10 }}>
            <AlertCircle size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#FCD34D', lineHeight: 1.5 }}>IP Allowlist restricts workspace access to listed CIDRs. Ensure your current IP is included before enabling.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newCidr} onChange={e => setNewCidr(e.target.value)} placeholder="192.168.1.0/24 or 203.0.113.1/32" style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }} />
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (e.g. HQ Office)" style={{ width: 160, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }} />
            <button onClick={addIP} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Add
            </button>
          </div>
          {ips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748B', fontSize: 13 }}>No IP restrictions configured — all IPs allowed</div>
          ) : ips.map(ip => (
            <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Lock size={14} color="#6366F1" />
              <code style={{ flex: 1, fontSize: 13, color: '#E2E8F0', fontFamily: 'monospace' }}>{ip.cidr}</code>
              <span style={{ fontSize: 12, color: '#64748B' }}>{ip.label}</span>
              <button onClick={() => ip.id && removeIP(ip.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'mfa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={16} color="#6366F1" />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Require MFA</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Enforce multi-factor authentication for all workspace members</p>
              </div>
            </div>
            <button onClick={() => setSession(s => ({ ...s, require_mfa: !s.require_mfa }))} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: session.require_mfa ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 2, left: session.require_mfa ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
          {['TOTP (Authenticator App)', 'SMS One-Time Code', 'Hardware Security Key (WebAuthn)'].map((method, i) => {
            const key = ['totp', 'sms', 'webauthn'][i]
            const active = session.mfa_methods.includes(key)
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 14, color: '#E2E8F0' }}>{method}</span>
                <button onClick={() => setSession(s => ({ ...s, mfa_methods: active ? s.mfa_methods.filter(m => m !== key) : [...s.mfa_methods, key] }))} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: active ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
            )
          })}
          <button onClick={saveSession} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>Save MFA Policy</button>
        </div>
      )}
    </div>
  )
}

