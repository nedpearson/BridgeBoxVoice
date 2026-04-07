import { ExternalLink, Check, Zap } from 'lucide-react'

export interface Integration {
  id: string
  name: string
  category: string
  description: string
  logoUrl?: string
  logoEmoji?: string
  authType: 'oauth2' | 'apikey' | 'webhook' | 'none'
  connected?: boolean
  comingSoon?: boolean
}

interface IntegrationCardProps {
  integration: Integration
  onConnect: (integration: Integration) => void
  onDisconnect?: (integration: Integration) => void
}

export default function IntegrationCard({ integration, onConnect, onDisconnect }: IntegrationCardProps) {
  const { name, category, description, logoEmoji, connected, comingSoon, authType } = integration

  return (
    <div className={`group relative flex flex-col rounded-2xl border p-5 transition-all duration-200 ${
      connected
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : comingSoon
        ? 'border-[#1E293B] bg-[#0C1322] opacity-60'
        : 'border-[#1E293B] bg-[#0C1322] hover:border-blue-500/40 hover:bg-[#0D1526]'
    }`}>
      {/* Connected badge */}
      {connected && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Check className="w-3 h-3" />
          Connected
        </div>
      )}

      {/* Coming Soon badge */}
      {comingSoon && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#1E293B] text-slate-500 text-xs">
          Soon
        </div>
      )}

      {/* Logo + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-[#1E293B] flex items-center justify-center text-2xl flex-shrink-0">
          {logoEmoji ?? '🔌'}
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">{name}</h3>
          <span className="text-xs text-slate-500">{category}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-xs leading-relaxed mb-4 flex-1">{description}</p>

      {/* Auth type badge + action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Zap className="w-3 h-3" />
          {authType === 'oauth2' ? 'OAuth 2.0' :
           authType === 'apikey' ? 'API Key' :
           authType === 'webhook' ? 'Webhook' : 'Free'}
        </div>

        {!comingSoon && (
          connected ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open('#', '_blank')}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#1E293B] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDisconnect?.(integration)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 border border-[#1E293B] transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConnect(integration)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              Connect
            </button>
          )
        )}
      </div>
    </div>
  )
}
