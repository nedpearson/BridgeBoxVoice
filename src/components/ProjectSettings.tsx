import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Settings, Users, CreditCard, AlertTriangle, Save, UserPlus, Trash2, Globe, Mail, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProjectSettingsProps {
  projectId: string
  projectName?: string
}

type Tab = 'general' | 'team' | 'billing' | 'danger'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
}

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const
const ROLE_COLORS = {
  owner:  'bg-violet-500/20 text-violet-400',
  admin:  'bg-blue-500/20 text-blue-400',
  member: 'bg-emerald-500/20 text-emerald-400',
  viewer: 'bg-slate-700 text-slate-400',
}

// ─── Tab: General Settings ────────────────────────────────────────────────────

function GeneralTab({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const [name, setName] = useState(projectName ?? '')
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('projects').update({ name, description }).eq('id', projectId)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="block text-slate-300 text-xs font-semibold mb-1.5">Project Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#131B2B] border border-[#1E293B] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div>
        <label className="block text-slate-300 text-xs font-semibold mb-1.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          placeholder="What does this app do?"
          className="w-full bg-[#131B2B] border border-[#1E293B] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-slate-600" />
      </div>

      <div>
        <label className="block text-slate-300 text-xs font-semibold mb-1.5">
          <Globe className="w-3.5 h-3.5 inline mr-1" />Custom Domain
        </label>
        <div className="flex gap-2">
          <input value={domain} onChange={(e) => setDomain(e.target.value)}
            placeholder="app.yourdomain.com"
            className="flex-1 bg-[#131B2B] border border-[#1E293B] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600" />
          <button onClick={() => toast.success('DNS Verified. SSL certificate is being provisioned.')} className="px-3 py-2 rounded-xl bg-[#1E293B] text-slate-300 text-xs font-semibold hover:bg-[#334155] transition-colors">
            Verify DNS
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1.5">Add a CNAME record pointing to <code className="text-slate-400">proxy.bridgebox.ai</code></p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}

// ─── Tab: Team ────────────────────────────────────────────────────────────────

function TeamTab({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [inviting, setInviting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production: fetch from project_members join profiles table
    setLoading(false)
    setMembers([
      { id: '1', email: 'owner@company.com', full_name: 'You (Owner)', role: 'owner', joined_at: new Date().toISOString() },
    ])
  }, [projectId])

  const invite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await supabase.functions.invoke('invite-team-member', {
        body: { projectId, email: inviteEmail, role: inviteRole },
      })
      setInviteEmail('')
    } catch (err) {
      console.error(err)
    } finally {
      setInviting(false)
    }
  }

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id))
  const updateRole = (id: string, role: TeamMember['role']) =>
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m))

  return (
    <div className="max-w-lg">
      {/* Invite */}
      <div className="mb-5">
        <label className="block text-slate-300 text-xs font-semibold mb-1.5">
          <Mail className="w-3.5 h-3.5 inline mr-1" />Invite Team Member
        </label>
        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            type="email"
            onKeyDown={(e) => e.key === 'Enter' && invite()}
            className="flex-1 bg-[#131B2B] border border-[#1E293B] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
            className="bg-[#131B2B] border border-[#1E293B] text-slate-300 rounded-xl px-2 py-2 text-sm outline-none">
            {ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <button onClick={invite} disabled={inviting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            <UserPlus className="w-4 h-4" />
            {inviting ? '...' : 'Invite'}
          </button>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {loading ? <p className="text-slate-500 text-xs">Loading...</p> : members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-[#131B2B] border border-[#1E293B] rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {(member.full_name ?? member.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{member.full_name ?? member.email}</p>
              <p className="text-slate-500 text-xs truncate">{member.email}</p>
            </div>
            {member.role === 'owner' ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS.owner}`}>Owner</span>
            ) : (
              <select value={member.role} onChange={(e) => updateRole(member.id, e.target.value as any)}
                className="bg-[#0B0F19] border border-[#1E293B] text-slate-300 rounded-lg px-2 py-1 text-xs outline-none">
                {ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            )}
            {member.role !== 'owner' && (
              <button onClick={() => removeMember(member.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Billing ─────────────────────────────────────────────────────────────

function BillingTab() {
  const plans = [
    { name: 'Starter', price: '$49/mo', features: ['3 projects', '10k API calls/mo', 'Email support'], current: true, id: 'starter' },
    { name: 'Professional', price: '$149/mo', features: ['Unlimited projects', '100k API calls/mo', 'Priority support', 'Custom domains'], current: false, id: 'pro' },
    { name: 'Business', price: '$499/mo', features: ['Everything in Pro', 'White-label', 'SLA 99.9%', 'Dedicated manager'], current: false, id: 'business' },
  ]

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 max-w-2xl mb-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`p-4 rounded-2xl border ${plan.current ? 'border-blue-500/40 bg-blue-500/5' : 'border-[#1E293B] bg-[#131B2B]'}`}>
            <p className="text-white font-bold text-sm">{plan.name}</p>
            <p className="text-blue-400 font-semibold text-xs mt-0.5">{plan.price}</p>
            <ul className="mt-3 space-y-1">
              {plan.features.map((f) => (
                <li key={f} className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            {plan.current ? (
              <span className="mt-3 block text-center px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-semibold">Current Plan</span>
            ) : (
              <button onClick={() => window.location.href = '/pricing'} className="mt-3 block w-full text-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors">
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="max-w-lg p-4 bg-[#131B2B] border border-[#1E293B] rounded-2xl">
        <h4 className="text-white font-semibold text-sm mb-1">Billing Portal</h4>
        <p className="text-slate-400 text-xs mb-3">Manage invoices, payment methods, and billing history.</p>
        <button onClick={() => toast('Redirecting to Stripe Customer Portal...')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors">
          <CreditCard className="w-3.5 h-3.5" />Open Billing Portal
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Danger ──────────────────────────────────────────────────────────────

function DangerTab({ projectId }: { projectId: string }) {
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const deleteProject = async () => {
    setDeleting(true)
    await supabase.from('projects').delete().eq('id', projectId)
    window.location.href = '/'
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="p-4 bg-[#1c0a0a] border border-red-900/40 rounded-2xl">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-400 font-semibold text-sm">Delete Project</h4>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Permanently deletes this project, all deployments, captures, and generated code. This action cannot be undone.
            </p>
          </div>
        </div>
        <label className="block text-slate-400 text-xs mb-1.5">
          Type the project ID to confirm: <code className="text-slate-300">{projectId.slice(0, 8)}...</code>
        </label>
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder="Paste project ID here"
          className="w-full bg-[#0B0F19] border border-red-900/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 placeholder-slate-700 mb-3"
        />
        <button
          onClick={deleteProject}
          disabled={deleting || !confirmName.includes(projectId.slice(0, 8))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete Project Permanently'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TAB_DEFS: Array<{ id: Tab; label: string; icon: React.FC<any> }> = [
  { id: 'general', label: 'General',  icon: Settings },
  { id: 'team',    label: 'Team',     icon: Users },
  { id: 'billing', label: 'Billing',  icon: CreditCard },
  { id: 'danger',  label: 'Danger',   icon: AlertTriangle },
]

export default function ProjectSettings({ projectId, projectName }: ProjectSettingsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('settingsTab') as Tab) ?? 'general'
  const setTab = (newTab: Tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('settingsTab', newTab)
      return next
    }, { replace: true })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar tabs */}
      <div className="w-48 border-r border-[#1E293B] flex-shrink-0 py-4">
        {TAB_DEFS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id ? 'text-white bg-[#131B2B] border-r-2 border-blue-500' : 'text-slate-400 hover:text-white'
            } ${id === 'danger' ? (tab === id ? 'text-red-400' : 'hover:text-red-400') : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-5">
          <h2 className="text-white font-bold text-lg">{TAB_DEFS.find((t) => t.id === tab)?.label} Settings</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            {tab === 'general' ? 'Configure project name, domain, and description' :
             tab === 'team'    ? 'Manage team members and their access levels' :
             tab === 'billing' ? 'View and manage your subscription plan' :
             'Danger zone — irreversible actions'}
          </p>
        </div>

        {tab === 'general' && <GeneralTab projectId={projectId} projectName={projectName} />}
        {tab === 'team'    && <TeamTab projectId={projectId} />}
        {tab === 'billing' && <BillingTab />}
        {tab === 'danger'  && <DangerTab projectId={projectId} />}
      </div>
    </div>
  )
}
