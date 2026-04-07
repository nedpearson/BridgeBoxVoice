import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Shield, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const RESOURCE_CATEGORIES = {
  Projects: ['projects.create', 'projects.read', 'projects.update', 'projects.delete', 'projects.deploy'],
  Voice: ['voice.record', 'voice.transcribe', 'voice.analyze'],
  'AI Generation': ['ai.generate', 'ai.review', 'ai.approve', 'ai.usage_caps.manage'],
  Integrations: ['integrations.connect', 'integrations.read', 'integrations.disconnect'],
  Team: ['team.invite', 'team.remove', 'team.roles.manage', 'team.view'],
  Billing: ['billing.view', 'billing.manage', 'billing.invoices'],
  Security: ['security.sso.manage', 'security.audit.view', 'security.api_keys.manage', 'security.ip_allowlist'],
  Analytics: ['analytics.view', 'analytics.export', 'analytics.dashboards.manage'],
  Admin: ['admin.settings', 'admin.data_residency', 'admin.compliance', 'admin.plugins'],
}

type PermMap = Record<string, boolean>

interface Role {
  id: string
  name: string
  description: string
  permissions: PermMap
  is_system: boolean
}

interface Props { workspaceId: string }

export default function RoleBuilder({ workspaceId }: Props) {
  const [roles, setRoles] = useState<Role[]>([])
  const [selected, setSelected] = useState<Role | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    supabase.from('custom_roles').select('*').eq('workspace_id', workspaceId).then(({ data }) => {
      if (data) setRoles(data as Role[])
      if (data?.length) setSelected(data[0] as Role)
    })
  }, [workspaceId])

  const togglePerm = (perm: string) => {
    if (!selected) return
    setSelected(prev => prev ? { ...prev, permissions: { ...prev.permissions, [perm]: !prev.permissions[perm] } } : prev)
  }

  const toggleCategory = (cat: string) => {
    if (!selected) return
    const perms = RESOURCE_CATEGORIES[cat as keyof typeof RESOURCE_CATEGORIES]
    const allOn = perms.every(p => selected.permissions[p])
    const update: PermMap = {}
    perms.forEach(p => { update[p] = !allOn })
    setSelected(prev => prev ? { ...prev, permissions: { ...prev.permissions, ...update } } : prev)
  }

  const saveRole = async () => {
    if (!selected) return
    setSaving(true)
    await supabase.from('custom_roles').upsert({ ...selected, workspace_id: workspaceId, updated_at: new Date().toISOString() })
    setSaving(false)
  }

  const createRole = async () => {
    if (!newRoleName.trim()) return
    const { data } = await supabase.from('custom_roles').insert({
      workspace_id: workspaceId, name: newRoleName.trim(), description: '', permissions: {}, is_system: false
    }).select().single()
    if (data) { setRoles(r => [...r, data as Role]); setSelected(data as Role) }
    setNewRoleName(''); setShowNew(false)
  }

  const deleteRole = async (id: string) => {
    await supabase.from('custom_roles').delete().eq('id', id)
    setRoles(r => r.filter(role => role.id !== id))
    if (selected?.id === id) setSelected(roles.find(r => r.id !== id) ?? null)
  }

  const permCount = selected ? Object.values(selected.permissions).filter(Boolean).length : 0
  const totalPerms = Object.values(RESOURCE_CATEGORIES).flat().length

  return (
    <div style={{ display: 'flex', gap: 20, height: 600 }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Roles</span>
          <button onClick={() => setShowNew(true)} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, cursor: 'pointer', padding: '3px 8px', color: '#A5B4FC', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> New
          </button>
        </div>

        {showNew && (
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createRole()} placeholder="Role name..." style={{ flex: 1, padding: '6px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#E2E8F0', fontSize: 12 }} autoFocus />
            <button onClick={createRole} style={{ background: '#6366F1', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '6px 10px', color: '#fff', fontSize: 12 }}>Add</button>
          </div>
        )}

        {roles.map(role => (
          <div key={role.id} onClick={() => setSelected(role)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: selected?.id === role.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selected?.id === role.id ? 'rgba(99,102,241,0.5)' : 'transparent'}`, transition: 'all 0.15s' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#E2E8F0' }}>{role.name}</p>
              {role.is_system && <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600, background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: 4 }}>SYSTEM</span>}
            </div>
            {!role.is_system && (
              <button onClick={e => { e.stopPropagation(); deleteRole(role.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, opacity: 0.6 }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>{selected.name}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{permCount}/{totalPerms} permissions granted</p>
            </div>
            <button onClick={saveRole} disabled={saving || selected.is_system} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: selected.is_system ? 'not-allowed' : 'pointer', background: selected.is_system ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: selected.is_system ? '#64748B' : '#fff', fontSize: 13, fontWeight: 600 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Role'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(RESOURCE_CATEGORIES).map(([category, perms]) => {
              const isExpanded = expanded[category] ?? false
              const activeCount = perms.filter(p => selected.permissions[p]).length
              const allActive = activeCount === perms.length

              return (
                <div key={category} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(e => ({ ...e, [category]: !isExpanded }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isExpanded ? <ChevronDown size={14} color="#94A3B8" /> : <ChevronRight size={14} color="#94A3B8" />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>{category}</span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>{activeCount}/{perms.length}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); if (!selected.is_system) toggleCategory(category) }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${allActive ? '#6366F1' : 'rgba(255,255,255,0.12)'}`, background: allActive ? 'rgba(99,102,241,0.2)' : 'transparent', color: allActive ? '#A5B4FC' : '#94A3B8', cursor: 'pointer', fontWeight: 500 }}>
                      {allActive ? 'All On' : 'All Off'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: 16 }}>
                      {perms.map(perm => {
                        const on = !!selected.permissions[perm]
                        return (
                          <div key={perm} onClick={() => !selected.is_system && togglePerm(perm)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: selected.is_system ? 'default' : 'pointer', background: on ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.15s' }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: on ? '#6366F1' : 'rgba(255,255,255,0.1)', border: `2px solid ${on ? '#6366F1' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {on && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 12, color: on ? '#E2E8F0' : '#64748B', fontFamily: 'monospace' }}>{perm}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <Shield size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Select a role or create a new one</p>
          </div>
        </div>
      )}
    </div>
  )
}

