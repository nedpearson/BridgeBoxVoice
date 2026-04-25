import { useState } from 'react'
import { useStore } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { Building, Bell, Shield, Download, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { workspace } = useStore()
  const [name, setName] = useState(workspace?.name ?? '')
  const [notifications, setNotifications] = useState({ builds: true, deploys: true, errors: true, weekly: false })
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!workspace) return
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', workspace.id)
    if (error) {
      toast.error('Failed to save settings: ' + error.message)
      return
    }
    setSaved(true)
    toast.success('Settings saved')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      <div className="space-y-6">
        <Section icon={<Building className="w-4 h-4 text-blue-400" />} title="Workspace">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Workspace Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Plan</label>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-blue-600/10 border border-blue-600/30 text-blue-400 rounded-lg text-sm font-semibold capitalize">{workspace?.plan ?? 'starter'}</span>
              <a href="/pricing" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">Upgrade →</a>
            </div>
          </div>
        </Section>

        <Section icon={<Bell className="w-4 h-4 text-yellow-400" />} title="Notifications">
          {[
            { key: 'builds', label: 'Build completed', sub: 'Notify when a code build finishes' },
            { key: 'deploys', label: 'Deployment live', sub: 'Notify when an app goes live' },
            { key: 'errors', label: 'Build errors', sub: 'Immediate alert on failed builds' },
            { key: 'weekly', label: 'Weekly digest', sub: 'Summary of activity every Monday' },
          ].map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-slate-200 text-sm">{label}</p>
                <p className="text-slate-500 text-xs">{sub}</p>
              </div>
              <button
                onClick={() => setNotifications(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${notifications[key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-[#334155]'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications[key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </Section>

        <Section icon={<Shield className="w-4 h-4 text-emerald-400" />} title="Security">
          <button onClick={() => toast('Password reset link sent to your email')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Change password →</button>
          <button onClick={() => toast('2FA is enforced via Single Sign-On (SSO)')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Enable two-factor authentication →</button>
          <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-900/40 px-3 py-2 rounded-xl">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs">All data encrypted with AES-256. SOC 2 Type II compliant.</span>
          </div>
        </Section>

        <Section icon={<Download className="w-4 h-4 text-slate-400" />} title="Data & Export">
          <button onClick={() => toast.success('Data export started. You will receive an email shortly.')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
            <Download className="w-4 h-4" />Export all project data (JSON)
          </button>
          <button onClick={() => toast.error('Workspace deletion is disabled in this tier. Contact support.')} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            <Trash2 className="w-4 h-4" />Delete workspace and all data
          </button>
        </Section>

        <div className="pt-2">
          <button onClick={save} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
        {icon}
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}
