import { useState, useEffect } from 'react'
import { Key, Plus, Copy, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SCOPES = [
  'read:projects', 'write:projects', 'delete:projects',
  'read:captures', 'write:captures',
  'read:analytics', 'read:team',
  'write:integrations', 'read:integrations',
  'admin:*',
]

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

interface Props { workspaceId: string }

export default function ApiKeyManager({ workspaceId }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:projects'])
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('api_keys').select('*').eq('workspace_id', workspaceId).is('revoked_at', null).order('created_at', { ascending: false })
      .then(({ data }) => { setKeys((data ?? []) as ApiKey[]); setLoading(false) })
  }, [workspaceId])

  const generateKey = async () => {
    if (!newName.trim()) return
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const rawKey = Array.from(array).map(b => b.toString(16).padStart(2,'0')).join('')
    const fullKey = `bb_live_${rawKey}`
    const prefix = fullKey.substring(0, 16)

    // Hash for storage
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullKey))
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('')

    const expiresAt = expiresIn === 'never' ? null : new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()

    const { data } = await supabase.from('api_keys').insert({
      workspace_id: workspaceId, name: newName.trim(), key_prefix: prefix,
      key_hash: hashHex, scopes: selectedScopes, expires_at: expiresAt,
    }).select().single()

    if (data) {
      setKeys(k => [data as ApiKey, ...k])
      setNewKey(fullKey)
      setShowCreate(false)
      setNewName(''); setSelectedScopes(['read:projects'])
    }
  }

  const revoke = async (id: string) => {
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    setKeys(k => k.filter(key => key.id !== id))
  }

  const copy = () => {
    if (newKey) { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes(s => s.includes(scope) ? s.filter(x => x !== scope) : [...s, scope])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* One-time key display */}
      {newKey && (
        <div style={{ padding: 20, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={16} color="#FACC15" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FDE047' }}>Copy this key now — it won't be shown again</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{ flex: 1, fontSize: 12, color: '#4ADE80', background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: 8, overflowX: 'auto', fontFamily: 'monospace' }}>{newKey}</code>
            <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)', border: `1px solid ${copied ? 'rgba(34,197,94,0.5)' : 'rgba(99,102,241,0.4)'}`, borderRadius: 8, cursor: 'pointer', color: copied ? '#4ADE80' : '#A5B4FC', fontSize: 13, fontWeight: 500 }}>
              {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{keys.length} active {keys.length === 1 ? 'key' : 'keys'}</p>
        <button onClick={() => setShowCreate(!showCreate)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Generate API Key
        </button>
      </div>

      {showCreate && (
        <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Key Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Production App, CI/CD Pipeline" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Scopes</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {SCOPES.map(scope => (
                <button key={scope} onClick={() => toggleScope(scope)} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${selectedScopes.includes(scope) ? '#6366F1' : 'rgba(255,255,255,0.1)'}`, background: selectedScopes.includes(scope) ? 'rgba(99,102,241,0.2)' : 'transparent', color: selectedScopes.includes(scope) ? '#A5B4FC' : '#64748B', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', textAlign: 'left' }}>
                  {scope}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Expiration</label>
            <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }}>
              <option value="never">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={generateKey} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Generate Key</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Key list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {keys.map(key => (
          <div key={key.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Key size={16} color="#A5B4FC" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>{key.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{key.key_prefix}••••••••••••••••</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 300 }}>
              {(key.scopes ?? []).slice(0, 3).map(scope => (
                <span key={scope} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', fontFamily: 'monospace' }}>{scope}</span>
              ))}
              {(key.scopes?.length ?? 0) > 3 && <span style={{ fontSize: 10, color: '#64748B' }}>+{(key.scopes?.length ?? 0) - 3}</span>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: key.last_used_at ? '#4ADE80' : '#64748B' }}>{key.last_used_at ? `Used ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{key.expires_at ? `Expires ${new Date(key.expires_at).toLocaleDateString()}` : 'No expiry'}</p>
            </div>
            <button onClick={() => revoke(key.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', color: '#EF4444', padding: '6px 10px', fontSize: 12, flexShrink: 0 }}>Revoke</button>
          </div>
        ))}
        {!loading && keys.length === 0 && !newKey && (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
            <Key size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No API keys. Generate one to start integrating.</p>
          </div>
        )}
      </div>
    </div>
  )
}
