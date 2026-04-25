/* eslint-disable */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Trash2, Shield, Crown, Eye, Plus, RefreshCw } from 'lucide-react'

interface Member {
  user_id: string
  role: string
  created_at: string
  profiles?: { email: string; full_name?: string }
}

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const
type Role = typeof ROLES[number]

const ROLE_COLORS: Record<string, string> = {
  owner: '#F59E0B', admin: '#6366F1', member: '#22C55E', viewer: '#64748B'
}
const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={12} />, admin: <Shield size={12} />, member: <Users size={12} />, viewer: <Eye size={12} />
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
        supabase.from('workspaces').select('id').limit(1).single()
          .then(({ data: ws, error }) => {
            if (error) {
              console.error(error)
              setLoading(false)
            } else if (ws) {
              setWorkspaceId(ws.id)
              loadMembers(ws.id)
            }
          })
      } else {
        setLoading(false)
      }
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const loadMembers = async (wsId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('user_id, role, created_at')
      .eq('workspace_id', wsId)
      .order('created_at')
    setMembers((data ?? []) as Member[])
    setLoading(false)
  }


  const invite = async () => {
    if (!inviteEmail.trim() || !workspaceId) return
    setInviting(true)
    // Look up user by email
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', inviteEmail.trim()).single()
    if (profile) {
      await supabase.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: profile.id, role: inviteRole }, { onConflict: 'workspace_id,user_id' })
      await loadMembers(workspaceId)
    } else {
      // Store pending invitation
      await supabase.from('workspace_invitations').insert({ workspace_id: workspaceId, email: inviteEmail.trim(), role: inviteRole } as any)
    }
    setInviteEmail('')
    setInviting(false)
  }

  const updateRole = async (userId: string, role: Role) => {
    if (!workspaceId) return
    await supabase.from('workspace_members').update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId)
    setMembers(m => m.map(mb => mb.user_id === userId ? { ...mb, role } : mb))
  }

  const removeMember = async (userId: string) => {
    if (!workspaceId || userId === currentUserId) return
    await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId)
    setMembers(m => m.filter(mb => mb.user_id !== userId))
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px', fontFamily: "'Inter', sans-serif", color: '#E2E8F0' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#A5B4FC" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9' }}>Team Members</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{members.length} member{members.length !== 1 ? 's' : ''} in your workspace</p>
          </div>
        </div>
      </div>

      {/* Invite form */}
      <div style={{ padding: 20, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>Invite a team member</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com"
            onKeyDown={e => e.key === 'Enter' && invite()}
            style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }} />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }}>
            {ROLES.filter(r => r !== 'owner').map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <button onClick={invite} disabled={!inviteEmail.trim() || inviting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !inviteEmail.trim() ? 0.5 : 1 }}>
            {inviting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={14} /> Invite</>}
          </button>
        </div>
      </div>

      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 64, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }} />
        )) : members.map(member => (
          <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Avatar */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${ROLE_COLORS[member.role]}20`, border: `2px solid ${ROLE_COLORS[member.role]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLORS[member.role] }}>{member.user_id.substring(0, 2).toUpperCase()}</span>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: member.user_id === currentUserId ? '#A5B4FC' : '#E2E8F0' }}>
                {member.user_id === currentUserId ? 'You' : `...${member.user_id.slice(-8)}`}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
                Joined {new Date(member.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Role badge / selector */}
            {member.role === 'owner' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: `${ROLE_COLORS.owner}15`, color: ROLE_COLORS.owner, fontSize: 12, fontWeight: 700 }}>
                <Crown size={11} /> Owner
              </span>
            ) : (
              <select value={member.role} onChange={e => updateRole(member.user_id, e.target.value as Role)}
                disabled={member.user_id === currentUserId}
                style={{ padding: '5px 10px', background: `${ROLE_COLORS[member.role]}12`, border: `1px solid ${ROLE_COLORS[member.role]}35`, borderRadius: 6, color: ROLE_COLORS[member.role], fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {ROLES.filter(r => r !== 'owner').map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            )}

            {/* Remove */}
            {member.role !== 'owner' && member.user_id !== currentUserId && (
              <button onClick={() => removeMember(member.user_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', opacity: 0.5, padding: 6 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Role legend */}
      <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Role Permissions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { role: 'owner', can: ['Full access', 'Billing', 'Delete workspace', 'Manage team'] },
            { role: 'admin', can: ['All features', 'Manage members', 'Enterprise settings'] },
            { role: 'member', can: ['Create projects', 'Voice capture', 'View analytics'] },
            { role: 'viewer', can: ['Read-only', 'Cannot create', 'Cannot edit'] },
          ].map(({ role, can }) => (
            <div key={role} style={{ padding: 12, background: `${ROLE_COLORS[role]}08`, borderRadius: 8, border: `1px solid ${ROLE_COLORS[role]}20` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: ROLE_COLORS[role], fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                {ROLE_ICONS[role]} {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
              {can.map(c => <p key={c} style={{ margin: '2px 0', fontSize: 11, color: '#64748B' }}>• {c}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
