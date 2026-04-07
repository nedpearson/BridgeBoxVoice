import { useState, useEffect } from 'react'
import { Flag, Plus, Trash2, Users, Percent } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { clearFlagCache } from '../../lib/enterprise/featureFlags'

interface FlagRow {
  id: string
  flag_name: string
  description: string
  enabled: boolean
  rollout_percentage: number
  targeting_rules: { user_ids?: string[]; emails?: string[] } | null
}

interface Props { workspaceId: string }

export default function FeatureFlags({ workspaceId }: Props) {
  const [flags, setFlags] = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('feature_flags').select('*').eq('workspace_id', workspaceId).then(({ data }) => {
      setFlags((data ?? []) as FlagRow[])
      setLoading(false)
    })
  }, [workspaceId])

  const createFlag = async () => {
    const { data } = await supabase.from('feature_flags').insert({
      workspace_id: workspaceId, flag_name: 'new_feature', description: '', enabled: false, rollout_percentage: 0
    }).select().single()
    if (data) setFlags(f => [...f, data as FlagRow])
  }

  const updateFlag = async (id: string, updates: Partial<FlagRow>) => {
    setFlags(f => f.map(flag => flag.id === id ? { ...flag, ...updates } : flag))
    setSaving(id)
    await supabase.from('feature_flags').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    clearFlagCache(workspaceId)
    setSaving(null)
  }

  const deleteFlag = async (id: string) => {
    await supabase.from('feature_flags').delete().eq('id', id)
    setFlags(f => f.filter(flag => flag.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>Feature Flags</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Toggle features per workspace with gradual rollouts</p>
        </div>
        <button onClick={createFlag} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> New Flag
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Loading flags…</div>
      ) : flags.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
          <Flag size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No feature flags yet. Create one to start gradual rollouts.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flags.map(flag => (
            <div key={flag.id} style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${flag.enabled ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Toggle */}
                <button onClick={() => updateFlag(flag.id, { enabled: !flag.enabled })} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: flag.enabled ? '#6366F1' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ position: 'absolute', top: 2, left: flag.enabled ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }} />
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input value={flag.flag_name} onChange={e => updateFlag(flag.id, { flag_name: e.target.value })} style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: flag.enabled ? '#A5B4FC' : '#E2E8F0', background: 'none', border: 'none', outline: 'none', padding: 0 }} />
                    {saving === flag.id && <span style={{ fontSize: 11, color: '#64748B' }}>Saving…</span>}
                  </div>
                  <input value={flag.description} onChange={e => updateFlag(flag.id, { description: e.target.value })} placeholder="Description…" style={{ fontSize: 12, color: '#64748B', background: 'none', border: 'none', outline: 'none', padding: 0, width: '100%', marginTop: 4 }} />
                </div>

                {/* Rollout slider */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}><Percent size={11} /> Rollout</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: flag.rollout_percentage === 100 ? '#4ADE80' : '#E2E8F0' }}>{flag.rollout_percentage}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={flag.rollout_percentage}
                    onChange={e => updateFlag(flag.id, { rollout_percentage: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: '#6366F1' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginTop: 2 }}>
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                </div>

                <button onClick={() => deleteFlag(flag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 6, opacity: 0.5, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Quick badges */}
              {flag.enabled && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: flag.rollout_percentage === 100 ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)', color: flag.rollout_percentage === 100 ? '#4ADE80' : '#A5B4FC', fontWeight: 600 }}>
                    {flag.rollout_percentage === 100 ? '✓ Full Rollout' : `${flag.rollout_percentage}% of users`}
                  </span>
                  {flag.targeting_rules?.user_ids?.length && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(234,179,8,0.15)', color: '#FDE047', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={10} /> {flag.targeting_rules.user_ids.length} targeted
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

