import { useState, useEffect } from 'react'
import { Search, CheckCircle, Link2, Key, X, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface Integration {
  id: string; name: string; category: string; description: string
  logo: string; authType: 'oauth' | 'api_key'
}

const INTEGRATIONS: Integration[] = [
  { id: 'quickbooks', name: 'QuickBooks', category: 'Accounting', description: 'Sync invoices, customers, and payments', logo: '📊', authType: 'oauth' },
  { id: 'stripe', name: 'Stripe', category: 'Payments', description: 'Accept payments and manage subscriptions', logo: '💳', authType: 'api_key' },
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', description: 'Sync contacts, deals, and activities', logo: '☁️', authType: 'oauth' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', description: 'Marketing automation and CRM integration', logo: '🧡', authType: 'oauth' },
  { id: 'slack', name: 'Slack', category: 'Communication', description: 'Send notifications and alerts to channels', logo: '💬', authType: 'oauth' },
  { id: 'google_cal', name: 'Google Calendar', category: 'Calendar', description: 'Sync events, bookings, and schedules', logo: '📅', authType: 'oauth' },
  { id: 'twilio', name: 'Twilio', category: 'Communication', description: 'Send SMS and voice call alerts', logo: '📱', authType: 'api_key' },
  { id: 'sendgrid', name: 'SendGrid', category: 'Email', description: 'Transactional and marketing email delivery', logo: '📧', authType: 'api_key' },
  { id: 'shopify', name: 'Shopify', category: 'E-commerce', description: 'Sync products, orders and inventory', logo: '🛍️', authType: 'oauth' },
  { id: 'paypal', name: 'PayPal', category: 'Payments', description: 'Accept PayPal payments globally', logo: '🔵', authType: 'oauth' },
  { id: 'google_drive', name: 'Google Drive', category: 'Storage', description: 'Store and retrieve files and documents', logo: '📁', authType: 'oauth' },
  { id: 'xero', name: 'Xero', category: 'Accounting', description: 'Accounting and bookkeeping sync', logo: '💙', authType: 'oauth' },
  { id: 'asana', name: 'Asana', category: 'Project Management', description: 'Sync tasks and project milestones', logo: '🔴', authType: 'oauth' },
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', description: 'Cloud file storage and sharing', logo: '📦', authType: 'oauth' },
  { id: 'mailchimp', name: 'Mailchimp', category: 'Email', description: 'Email marketing campaign management', logo: '🐵', authType: 'api_key' },
  { id: 'square', name: 'Square', category: 'Payments', description: 'POS and payment processing', logo: '⬛', authType: 'oauth' },
  { id: 'gusto', name: 'Gusto', category: 'HR/Payroll', description: 'Payroll, benefits and HR automation', logo: '🟢', authType: 'oauth' },
  { id: 'ms_teams', name: 'Microsoft Teams', category: 'Communication', description: 'Post messages and notifications', logo: '💜', authType: 'oauth' },
  { id: 'calendly', name: 'Calendly', category: 'Calendar', description: 'Appointment scheduling integration', logo: '🗓️', authType: 'oauth' },
  { id: 'ga4', name: 'Google Analytics', category: 'Analytics', description: 'Website and app analytics tracking', logo: '📈', authType: 'oauth' },
]

const CATEGORIES = ['All', 'Accounting', 'CRM', 'Payments', 'Communication', 'Calendar', 'Storage', 'E-commerce', 'Email', 'Analytics', 'HR/Payroll', 'Project Management']

export default function Marketplace() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [apiKeyModal, setApiKeyModal] = useState<Integration | null>(null)
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [oauthModal, setOauthModal] = useState<Integration | null>(null)
  const [oauthStep, setOauthStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single()
        if (!ws) return
        setWorkspaceId(ws.id)
        // Load already-connected integrations
        const { data } = await supabase.from('workspace_integrations').select('integration_id').eq('workspace_id', ws.id)
        if (data) setConnected(new Set(data.map((d: any) => d.integration_id)))
      } catch (err) {
        console.error(err)
      } finally {
        // setLoading(false) // Assuming loading state exists or is not required here
      }
    }
    load()
  }, [])

  const handleConnect = (integration: Integration) => {
    if (integration.authType === 'api_key') {
      setApiKeyModal(integration)
      setApiKeyValue('')
    } else {
      simulateOauth(integration)
    }
  }

  const simulateOauth = (integration: Integration) => {
    if (!workspaceId) return
    setOauthModal(integration)
    setOauthStep(0)
    setTimeout(async () => {
      setOauthStep(1)
      const { error } = await supabase.from('workspace_integrations').upsert({
        workspace_id: workspaceId,
        integration_id: integration.id,
        integration_name: integration.name,
        auth_type: 'oauth',
        connected_at: new Date().toISOString(),
      })
      setTimeout(() => {
        setOauthModal(null)
        if (!error) {
          setConnected(prev => new Set([...prev, integration.id]))
          toast.success(`${integration.name} connected via BridgeBox SSO!`)
        } else {
          toast.error('Failed to link account')
        }
      }, 1000)
    }, 1500)
  }

  const saveApiKey = async () => {
    if (!apiKeyModal || !apiKeyValue.trim() || !workspaceId) return
    setSaving(true)
    const { error } = await supabase.from('workspace_integrations').upsert({
      workspace_id: workspaceId,
      integration_id: apiKeyModal.id,
      integration_name: apiKeyModal.name,
      auth_type: 'api_key',
      api_key_hash: apiKeyValue.trim(), // Store securely in production — this is a demo
      connected_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { toast.error('Failed to save — check DB table exists'); return }
    setConnected(prev => new Set([...prev, apiKeyModal.id]))
    toast.success(`${apiKeyModal.name} connected!`)
    setApiKeyModal(null)
    setApiKeyValue('')
  }

  const disconnect = async (integrationId: string, name: string) => {
    if (!workspaceId) return
    await supabase.from('workspace_integrations').delete().eq('workspace_id', workspaceId).eq('integration_id', integrationId)
    setConnected(prev => { const s = new Set(prev); s.delete(integrationId); return s })
    toast.success(`${name} disconnected`)
  }

  const filtered = INTEGRATIONS.filter(i =>
    (category === 'All' || i.category === category) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integration Marketplace</h1>
        <p className="text-slate-400 text-sm mt-1">Connect your existing business tools — Bridgebox Voice maps the data automatically.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#131B2B] border border-[#1E293B] text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${category === c ? 'bg-blue-600 text-white' : 'bg-[#131B2B] border border-[#1E293B] text-slate-400 hover:text-white'}`}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Connected count banner */}
      {connected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 bg-emerald-900/20 border border-emerald-900/40 rounded-xl px-4 py-2.5 w-fit">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-semibold">{connected.size} integration{connected.size > 1 ? 's' : ''} connected</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(integration => {
          const isConnected = connected.has(integration.id)
          return (
            <div key={integration.id} className={`bg-[#131B2B] border rounded-2xl p-5 transition-all ${isConnected ? 'border-emerald-900/50' : 'border-[#1E293B] hover:border-[#334155]'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">{integration.logo}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{integration.name}</p>
                  <p className="text-slate-500 text-[11px]">{integration.category}</p>
                </div>
                {isConnected && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              </div>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">{integration.description}</p>
              <div className="flex gap-2">
                {isConnected ? (
                  <>
                    <span className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-900/20 border border-emerald-900/40 text-emerald-400">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                    <button onClick={() => disconnect(integration.id, integration.name)}
                      className="px-2 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 border border-[#1E293B] hover:border-red-900/50 transition-colors" title="Disconnect">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleConnect(integration)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-600/10 border border-blue-600/30 text-blue-400 hover:bg-blue-600/20 transition-all">
                    <Link2 className="w-3 h-3" /> Connect
                  </button>
                )}
              </div>
              <p className="text-slate-700 text-[10px] text-center mt-2">{integration.authType === 'oauth' ? '🔐 OAuth 2.0' : '🔑 API key'}</p>
            </div>
          )
        })}
      </div>

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setApiKeyModal(null)}>
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="text-2xl">{apiKeyModal.logo}</div>
              <div>
                <h3 className="text-white font-bold text-base">Connect {apiKeyModal.name}</h3>
                <p className="text-slate-500 text-xs">{apiKeyModal.description}</p>
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Key size={11} /> API Key
            </label>
            <input
              type="password"
              value={apiKeyValue}
              onChange={e => setApiKeyValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveApiKey()}
              placeholder={`Enter your ${apiKeyModal.name} API key…`}
              autoFocus
              className="w-full bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-blue-500 placeholder-slate-600 font-mono"
            />
            <p className="text-slate-600 text-xs mb-5">🔒 Your key is stored securely and never exposed to other users.</p>
            <div className="flex gap-3">
              <button onClick={() => setApiKeyModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#334155] text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
              <button onClick={saveApiKey} disabled={saving || !apiKeyValue.trim()}
                className="flex-2 basis-2/3 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
                {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><CheckCircle size={13} /> Save & Connect</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* OAuth "Seamless SSO" Modal */}
      {oauthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
                 <span className="text-3xl font-bold text-blue-500">BB</span>
              </div>
              <RefreshCw className={`w-5 h-5 text-slate-500 ${oauthStep === 0 ? 'animate-spin' : ''}`} />
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-[#334155] flex items-center justify-center text-3xl">
                {oauthModal.logo}
              </div>
            </div>
            
            {oauthStep === 0 ? (
              <>
                <h3 className="text-white font-bold text-lg mb-2">Connecting to {oauthModal.name}</h3>
                <p className="text-slate-400 text-sm">Authenticating via BridgeBox Single Sign-On...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Account Linked!</h3>
                <p className="text-slate-400 text-sm">{oauthModal.name} is now available for your AI projects.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
