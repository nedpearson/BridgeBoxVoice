import { useState, useCallback } from 'react'
import { X, Key, Globe, Shield, Loader2, AlertCircle } from 'lucide-react'
import { Integration } from './IntegrationCard'

interface OAuthFlowProps {
  integration: Integration
  projectId: string
  onSuccess: (integration: Integration, credentials: Record<string, string>) => void
  onCancel: () => void
}

type FlowStep = 'method' | 'form' | 'oauth_pending' | 'success' | 'error'

export default function OAuthFlow({ integration, projectId: _projectId, onSuccess, onCancel }: OAuthFlowProps) {
  const [step, setStep] = useState<FlowStep>(
    integration.authType === 'oauth2' ? 'method' : 'form'
  )
  const [apiKey, setApiKey] = useState('')
  const [webhookUrl] = useState(`https://app.bridgebox.ai/webhooks/${_projectId}`)
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleOAuth = useCallback(() => {
    setStep('oauth_pending')
    setIsConnecting(true)

    // In production, this would open a popup to the OAuth provider
    // and listen for the postMessage callback with the auth code
    const oauthUrls: Record<string, string> = {
      quickbooks: 'https://appcenter.intuit.com/connect/oauth2',
      stripe: 'https://connect.stripe.com/oauth/authorize',
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      salesforce: 'https://login.salesforce.com/services/oauth2/authorize',
    }

    const provider = integration.id.toLowerCase()
    const oauthUrl = oauthUrls[provider] ?? '#'

    // Simulate the OAuth popup + callback for demo purposes
    if (oauthUrl !== '#') {
      window.open(oauthUrl, 'oauth', 'width=600,height=700,scrollbars=yes')
    }

    // Simulate success after delay (in prod would wait for postMessage)
    setTimeout(() => {
      setIsConnecting(false)
      onSuccess(integration, { access_token: 'demo_token_' + Date.now() })
    }, 3000)
  }, [integration, onSuccess])

  const handleApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }
    setIsConnecting(true)
    setError('')

    // Simulate API key validation
    await new Promise((r) => setTimeout(r, 1000))
    setIsConnecting(false)
    onSuccess(integration, { api_key: apiKey })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0D1526] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{integration.logoEmoji ?? '🔌'}</span>
            <div>
              <h2 className="text-white font-semibold">Connect {integration.name}</h2>
              <p className="text-slate-400 text-xs">{integration.category}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Method selector (for OAuth integrations that also support API key) */}
          {step === 'method' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm mb-4">Choose how to connect {integration.name}:</p>
              <button
                onClick={handleOAuth}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">OAuth 2.0 (Recommended)</p>
                  <p className="text-slate-500 text-xs">Authorize via {integration.name}'s official login</p>
                </div>
              </button>
              <button
                onClick={() => setStep('form')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-slate-600 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1E293B] flex items-center justify-center">
                  <Key className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">API Key</p>
                  <p className="text-slate-500 text-xs">Paste your API key manually</p>
                </div>
              </button>
            </div>
          )}

          {/* API Key form */}
          {step === 'form' && (
            <div className="space-y-4">
              {integration.authType === 'webhook' ? (
                <>
                  <p className="text-slate-400 text-sm">
                    Add this webhook URL to your {integration.name} account:
                  </p>
                  <div className="bg-[#0B0F19] rounded-xl p-4 flex items-center gap-3">
                    <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <code className="text-blue-300 text-xs break-all">{webhookUrl}</code>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Requests will be signed with HMAC-SHA256 for security</span>
                  </div>
                  <button
                    onClick={() => onSuccess(integration, { webhook_url: webhookUrl })}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                  >
                    I've Added the Webhook
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      {integration.name} API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                    />
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Keys are encrypted at rest and never logged</span>
                  </div>
                  <button
                    onClick={handleApiKey}
                    disabled={isConnecting}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isConnecting ? 'Validating...' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* OAuth pending */}
          {step === 'oauth_pending' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-3xl">
                  {integration.logoEmoji ?? '🔌'}
                </div>
                <Loader2 className="absolute -bottom-1 -right-1 w-6 h-6 text-blue-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Waiting for authorization...</p>
                <p className="text-slate-400 text-sm mt-1">
                  Complete the login in the popup window
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div className="text-center">
                <p className="text-white font-medium">Connection Failed</p>
                <p className="text-slate-400 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => { setStep('method'); setError('') }}
                className="px-6 py-2 rounded-xl border border-[#1E293B] text-white text-sm hover:bg-[#1E293B] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
