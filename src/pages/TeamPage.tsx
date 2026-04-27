/* eslint-disable */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Trash2, Shield, Crown, Eye, Plus, RefreshCw, ChevronDown, Check } from 'lucide-react'

interface Member {
  user_id: string
  role: string
  created_at: string
}

const ROLES = ['admin', 'member', 'viewer'] as const
type Role = typeof ROLES[number]

const ROLE_META: Record<string, { color: string; bg: string; border: string; label: string; icon: any }> = {
  owner:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Owner',  icon: Crown },
  admin:  { color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)',  label: 'Admin',  icon: Shield },
  member: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   label: 'Member', icon: Users },
  viewer: { color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', label: 'Viewer', icon: Eye },
}

// ── Custom dropdown (avoids native <select> styling issues) ──────────────────
function RoleDropdown({
  value, onChange, disabled = false, compact = false
}: {
  value: string
  onChange: (r: Role) => void
  disabled?: boolean
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = ROLE_META[value] || ROLE_META.member

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (disabled) {
    const IconComp = meta.icon
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: compact ? '4px 10px' : '8px 12px',
        borderRadius: 8, background: meta.bg, border: `1px solid ${meta.border}`,
        color: meta.color, fontSize: compact ? 11 : 13, fontWeight: 700
      }}>
        <IconComp size={compact ? 11 : 13} />
        {meta.label}
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '5px 10px' : '9px 14px',
          background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 8, color: meta.color, fontSize: compact ? 12 : 13,
          fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s'
        }}
      >
        {(() => { const I = meta.icon; return <I size={compact ? 11 : 13} /> })()}
        {meta.label}
        <ChevronDown size={12} style={{ marginLeft: 2, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: '#0F172A', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 999, minWidth: 140, overflow: 'hidden'
        }}>
          {ROLES.map(r => {
            const m = ROLE_META[r]
            const I = m.icon
            const selected = value === r
            return (
              <button
                key={r}
                onClick={() => { onChange(r); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 14px',
                  background: selected ? m.bg : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  color: selected ? m.color : '#94A3B8',
                  fontSize: 13, fontWeight: selected ? 700 : 500,
                  transition: 'all 0.1s'
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <I size={13} style={{ color: m.color, flexShrink: 0 }} />
                {m.label}
                {selected && <Check size={12} style={{ marginLeft: 'auto', color: m.color }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
        supabase.from('workspaces').select('id').limit(1).single()
          .then(({ data: ws }) => {
            if (ws) { setWorkspaceId(ws.id); loadMembers(ws.id) }
            else setLoading(false)
          })
      } else setLoading(false)
    }).catch(() => setLoading(false))
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

  const showFeedback = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(null), 3000) }

  const invite = async () => {
    if (!inviteEmail.trim() || !workspaceId) return
    setInviting(true)
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', inviteEmail.trim()).single()
      if (profile) {
        await supabase.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: profile.id, role: inviteRole }, { onConflict: 'workspace_id,user_id' })
        await loadMembers(workspaceId)
        showFeedback(`${inviteEmail} added as ${inviteRole}`)
      } else {
        await supabase.from('workspace_invitations').insert({ workspace_id: workspaceId, email: inviteEmail.trim(), role: inviteRole } as any)
        showFeedback(`Invitation sent to ${inviteEmail}`)
      }
      setInviteEmail('')
    } catch (e: any) {
      showFeedback('Failed: ' + e.message)
    }
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
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 32px', fontFamily: "'Inter', system-ui, sans-serif", color: '#E2E8F0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} color="#A5B4FC" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9' }}>Team Members</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{members.length} member{members.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, color: '#4ADE80', fontSize: 13, fontWeight: 600 }}>
          {feedback}
        </div>
      )}

      {/* Invite form */}
      <div style={{ padding: '20px 20px 20px', marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: 0.3 }}>Invite a team member</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            onKeyDown={e => e.key === 'Enter' && invite()}
            style={{
              flex: 1, padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: '#E2E8F0', fontSize: 13,
              outline: 'none',
            }}
          />
          {/* Custom dropdown — replaces native <select> */}
          <RoleDropdown value={inviteRole} onChange={setInviteRole} />

          <button
            onClick={invite}
            disabled={!inviteEmail.trim() || inviting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px',
              background: inviteEmail.trim() ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'rgba(99,102,241,0.3)',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
          >
            {inviting
              ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <><Plus size={14} /> Invite</>}
          </button>
        </div>
      </div>

      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 64, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          : members.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                <Users size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 14 }}>No team members yet. Invite someone above.</p>
              </div>
            )
            : members.map(member => {
                const meta = ROLE_META[member.role] || ROLE_META.member
                const isMe = member.user_id === currentUserId
                const isOwner = member.role === 'owner'
                return (
                  <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${isMe ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: meta.bg, border: `2px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                        {member.user_id.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isMe ? '#A5B4FC' : '#E2E8F0' }}>
                        {isMe ? 'You (me)' : `···${member.user_id.slice(-8)}`}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 11, color: '#6366F1', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>YOU</span>}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
                        Joined {new Date(member.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    {/* Role — owner gets a static badge, others get custom dropdown */}
                    {isOwner
                      ? <RoleDropdown value="owner" onChange={() => {}} disabled compact />
                      : <RoleDropdown
                          value={member.role}
                          onChange={r => updateRole(member.user_id, r)}
                          disabled={isMe}
                          compact
                        />
                    }
                    {/* Remove */}
                    {!isOwner && !isMe && (
                      <button
                        onClick={() => removeMember(member.user_id)}
                        title="Remove member"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', opacity: 0.5, padding: 6, borderRadius: 6, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.5'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })
        }
      </div>

      {/* Role permissions legend */}
      <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>Role Permissions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { role: 'owner',  can: ['Full access', 'Billing', 'Delete workspace', 'Manage team'] },
            { role: 'admin',  can: ['All features', 'Manage members', 'Enterprise settings'] },
            { role: 'member', can: ['Create projects', 'Voice capture', 'View analytics'] },
            { role: 'viewer', can: ['Read-only', 'Cannot create', 'Cannot edit'] },
          ].map(({ role, can }) => {
            const m = ROLE_META[role]
            const IconComp = m.icon
            return (
              <div key={role} style={{ padding: '12px 14px', background: m.bg, borderRadius: 10, border: `1px solid ${m.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: m.color, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  <IconComp size={12} /> {m.label}
                </div>
                {can.map(c => <p key={c} style={{ margin: '3px 0', fontSize: 11, color: '#64748B' }}>• {c}</p>)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
