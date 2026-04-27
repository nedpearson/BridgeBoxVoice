/* eslint-disable */
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ALL_INTEGRATIONS = [
  { id:'stripe',      name:'Stripe',      icon:'💳', category:'Payments',      desc:'Payments, subscriptions & billing',        keywords:['payment','checkout','billing','subscription','invoice','buy','sell','price','fee','charge'],  requiredEnvVars:['VITE_STRIPE_PUBLIC_KEY'] },
  { id:'sendgrid',    name:'SendGrid',    icon:'📧', category:'Email',         desc:'Transactional & marketing email',           keywords:['email','notification','receipt','confirm','invite','reminder','alert','newsletter'],          requiredEnvVars:['SENDGRID_API_KEY'] },
  { id:'twilio',      name:'Twilio',      icon:'📱', category:'Messaging',     desc:'SMS, voice calls & WhatsApp',              keywords:['sms','text','phone','call','mobile','notify','message','whatsapp','otp','verify'],            requiredEnvVars:['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'] },
  { id:'qbo',         name:'QuickBooks',  icon:'📊', category:'Accounting',   desc:'Accounting, payroll & financial sync',     keywords:['accounting','quickbooks','invoice','payroll','tax','expense','ledger','financial'],           requiredEnvVars:['VITE_QBO_CLIENT_ID'] },
  { id:'google-maps', name:'GoogleMaps',  icon:'🗺️', category:'Location',     desc:'Maps, geolocation & routing',              keywords:['map','location','address','route','gps','dispatch','delivery','track','geo'],                 requiredEnvVars:['VITE_GOOGLE_MAPS_KEY'] },
  { id:'docusign',    name:'DocuSign',    icon:'✍️', category:'Documents',    desc:'E-signatures & document workflows',        keywords:['signature','sign','contract','document','legal','agreement','pdf','esign'],                   requiredEnvVars:['VITE_DOCUSIGN_CLIENT_ID'] },
  { id:'slack',       name:'Slack',       icon:'💬', category:'Notifications', desc:'Team notifications & alerts',              keywords:['slack','notify','team','alert','chat','notification','workflow'],                            requiredEnvVars:['SLACK_WEBHOOK_URL'] },
  { id:'openai',      name:'OpenAI',      icon:'🤖', category:'AI',           desc:'AI text generation & analysis',            keywords:['ai','gpt','generate','analyze','chatbot','summarize','predict'],                             requiredEnvVars:['OPENAI_API_KEY'] },
  { id:'calendly',    name:'Calendly',    icon:'📅', category:'Scheduling',   desc:'Appointment & meeting scheduling',         keywords:['appointment','schedule','booking','calendar','meeting','availability','slot'],                requiredEnvVars:['VITE_CALENDLY_URL'] },
  { id:'plaid',       name:'Plaid',       icon:'🏦', category:'Banking',      desc:'Bank account linking & ACH transfers',     keywords:['bank','ach','transfer','deposit','account','financial','payroll'],                           requiredEnvVars:['PLAID_CLIENT_ID','PLAID_SECRET'] },
  { id:'shipstation', name:'ShipStation', icon:'📦', category:'Shipping',     desc:'Multi-carrier shipping & label printing',  keywords:['ship','shipping','label','carrier','fedex','ups','usps','delivery','package','fulfillment'],  requiredEnvVars:['SHIPSTATION_API_KEY'] },
  { id:'zapier',      name:'Zapier',      icon:'⚡', category:'Automation',   desc:'No-code automation & workflow triggers',   keywords:['automate','workflow','trigger','connect','integration','task','action','event'],              requiredEnvVars:['ZAPIER_WEBHOOK_URL'] },
]

type IntDef = typeof ALL_INTEGRATIONS[0]
type IntState = { status: string; message: string; files: number; pages: string[] }
const SC: Record<string,string> = { idle:'text-gray-400', generating:'text-blue-400', validating:'text-yellow-400', injecting:'text-purple-400', done:'text-emerald-400', error:'text-red-400' }

export default function IntegrationsTab({ project, connectedIntegrations, setConnectedIntegrations }: {
  project: any
  connectedIntegrations: any[]
  setConnectedIntegrations: React.Dispatch<React.SetStateAction<any[]>>
}) {
  const [intStates, setIntStates] = useState<Record<string, IntState>>({})
  const [busy, setBusy] = useState(false)
  const [showEnv, setShowEnv] = useState<string | null>(null)

  const spec = (() => { try { return JSON.parse(project?.spec || '{}') } catch { return {} } })()
  const projectText = ((project?.transcript ?? '') + ' ' + JSON.stringify(spec)).toLowerCase()
  const suggested = ALL_INTEGRATIONS.filter(i => i.keywords.some(k => projectText.includes(k)))
  const rest = ALL_INTEGRATIONS.filter(i => !suggested.find(s => s.id === i.id))

  const handleIntegrate = async (int: IntDef) => {
    if (busy) return
    setBusy(true)
    setIntStates(p => ({ ...p, [int.id]: { status: 'generating', message: 'Agent starting...', files: 0, pages: [] } }))
    try {
      const { runIntegrationAgent } = await import('../lib/agents/integrationAgent')
      const result = await runIntegrationAgent(
        int as any, project!.name, spec, [],
        (msg: string) => setIntStates(p => ({ ...p, [int.id]: { ...p[int.id], status: 'injecting', message: msg } }))
      )
      setIntStates(p => ({ ...p, [int.id]: { status: 'done', message: `${result.filesGenerated.length} files generated${result.pagesPatched.length ? ', patched: ' + result.pagesPatched.join(', ') : ''}`, files: result.filesGenerated.length, pages: result.pagesPatched } }))
      await supabase.from('project_integrations').upsert({ project_id: project!.id, service_name: int.name, auth_type: 'api_key', status: 'connected' })
      setConnectedIntegrations((p: any[]) => p.find((x: any) => x.service_name === int.name) ? p : [...p, { service_name: int.name, status: 'connected' }])
      toast.success(`✅ ${int.name} integrated! ${result.filesGenerated.length} files generated.`)
    } catch (e: any) {
      setIntStates(p => ({ ...p, [int.id]: { status: 'error', message: e.message, files: 0, pages: [] } }))
      toast.error(`${int.name} integration failed: ${e.message}`)
    } finally { setBusy(false) }
  }

  const IntCard = ({ int }: { int: IntDef }) => {
    const isConnected = connectedIntegrations.some((ci: any) => ci.service_name === int.name)
    const st = intStates[int.id]
    return (
      <div className={`flex flex-col p-4 bg-[#0B0F19] rounded-xl border transition-all ${isConnected ? 'border-emerald-500/30' : 'border-[#1E293B] hover:border-purple-500/30'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{int.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold">{int.name}</p>
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{int.category}</span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">{int.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected
              ? <span className="text-xs text-emerald-400 font-semibold">✓ Connected</span>
              : <button onClick={() => handleIntegrate(int)} disabled={busy}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                  {st && st.status !== 'done' && st.status !== 'idle' ? '⟳ Running' : '⚡ Integrate'}
                </button>
            }
            <button onClick={() => setShowEnv(showEnv === int.id ? null : int.id)} className="p-1.5 text-gray-500 hover:text-gray-300">ℹ</button>
          </div>
        </div>
        {st && st.status !== 'idle' && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <p className={`text-xs font-mono ${SC[st.status]}`}>{st.status === 'done' ? '✓' : st.status === 'error' ? '✗' : '⟳'} {st.message}</p>
          </div>
        )}
        {showEnv === int.id && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-400 mb-1 font-semibold">Required env vars (add to Vercel):</p>
            {int.requiredEnvVars.map((v: string) => (
              <code key={v} className="block text-xs text-yellow-300 bg-gray-900 px-2 py-0.5 rounded mt-1">{v}</code>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/20 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🤖</span>
          <div>
            <h2 className="text-white font-bold text-lg">Integration Super Agent</h2>
            <p className="text-slate-400 text-xs mt-0.5">Click ⚡ Integrate — the agent generates a React hook + widget, patches your pages, and saves everything automatically.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {['🔌 Generates real code', '🔧 Patches existing pages', '🛡️ Validates & retries', '📦 Deploy-ready files'].map(f => (
            <span key={f} className="text-xs text-slate-400 bg-gray-800/60 px-2 py-1 rounded-lg">{f}</span>
          ))}
        </div>
      </div>

      {connectedIntegrations.length > 0 && (
        <div className="bg-[#131B2B] border border-emerald-500/20 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 text-sm">✅ Connected ({connectedIntegrations.length})</h3>
          <div className="flex flex-wrap gap-2">
            {connectedIntegrations.map((ci: any) => {
              const int = ALL_INTEGRATIONS.find(i => i.name === ci.service_name)
              return <span key={ci.id || ci.service_name} className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/20">{int?.icon} {ci.service_name}</span>
            })}
          </div>
        </div>
      )}

      {suggested.length > 0 && (
        <div className="bg-[#131B2B] border border-blue-500/20 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1 text-sm">✨ Recommended for This Project</h3>
          <p className="text-slate-500 text-xs mb-4">Detected from your transcript and spec</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{suggested.map(i => <IntCard key={i.id} int={i} />)}</div>
        </div>
      )}

      <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 text-sm">All Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{rest.map(i => <IntCard key={i.id} int={i} />)}</div>
      </div>
    </div>
  )
}
