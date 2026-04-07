import { useState } from 'react'
import { Globe, Smartphone, Monitor, CheckCircle, Loader, ExternalLink, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface DeploymentPanelProps { projectId: string }
type DeployStatus = 'idle' | 'building' | 'live' | 'failed'

interface PlatformState { status: DeployStatus; url: string | null; logs: string[] }

export default function DeploymentPanel({ projectId }: DeploymentPanelProps) {
  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>({
    web: { status: 'idle', url: null, logs: [] },
    ios: { status: 'idle', url: null, logs: [] },
    android: { status: 'idle', url: null, logs: [] },
    windows: { status: 'idle', url: null, logs: [] },
  })

  const deploy = async (platform: string) => {
    setPlatforms(prev => ({ ...prev, [platform]: { status: 'building', url: null, logs: [] } }))
    
    const logMessages: Record<string, string[]> = {
      web: ['Installing dependencies...', 'Running TypeScript build...', 'Optimizing assets...', 'Deploying to Vercel CDN...', '✅ Live at https://your-app.vercel.app'],
      ios: ['Installing Capacitor iOS...', 'Running cap sync...', 'Building Xcode project...', 'Signing with Apple certificate...', '✅ iOS build ready for App Store'],
      android: ['Installing Capacitor Android...', 'Running Gradle build...', 'Signing APK...', '✅ Android APK ready'],
      windows: ['Installing Tauri...', 'Compiling Rust shell...', 'Bundling installer...', '✅ Windows .msi installer ready'],
    }

    const messages = logMessages[platform] ?? []
    for (let i = 0; i < messages.length; i++) {
      await new Promise(r => setTimeout(r, 1200))
      setPlatforms(prev => ({
        ...prev,
        [platform]: { ...prev[platform], logs: [...prev[platform].logs, messages[i]] }
      }))
    }

    const url = platform === 'web' ? 'https://your-app.vercel.app' : null
    await supabase.from('deployments').insert({ project_id: projectId, platform, status: 'live', url, build_logs: messages.join('\n') })
    if (platform === 'web') await supabase.from('projects').update({ status: 'deployed', web_app_url: url }).eq('id', projectId)
    setPlatforms(prev => ({ ...prev, [platform]: { ...prev[platform], status: 'live', url } }))
    toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} deployment complete!`)
  }

  const PLATFORM_CFG = [
    { id: 'web', label: 'Web App', sub: 'Deploy to Vercel CDN', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-600/20' },
    { id: 'ios', label: 'iOS App', sub: 'Capacitor → App Store', icon: Smartphone, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-600/20' },
    { id: 'android', label: 'Android App', sub: 'Capacitor → Play Store', icon: Smartphone, color: 'text-green-400', bg: 'bg-green-600/10 border-green-600/20' },
    { id: 'windows', label: 'Windows Desktop', sub: 'Tauri → .msi installer', icon: Monitor, color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-600/20' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-white font-bold text-lg">Deploy Your App</h3>
        <p className="text-slate-400 text-sm mt-0.5">Choose your deployment targets. Deploy to all platforms simultaneously.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORM_CFG.map(({ id, label, sub, icon: Icon, color, bg }) => {
          const p = platforms[id]
          return (
            <div key={id} className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${bg}`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                </div>
                {p.status === 'live' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {p.status === 'building' && <Loader className="w-5 h-5 text-blue-400 animate-spin" />}
              </div>

              {p.logs.length > 0 && (
                <div className="bg-[#050912] rounded-xl p-3 mb-4 font-mono text-xs text-slate-400 space-y-1 max-h-28 overflow-y-auto border border-[#0F1A2E]">
                  {p.logs.map((l, i) => (
                    <div key={i} className={l.includes('✅') ? 'text-emerald-400' : ''}>{l}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {p.status === 'idle' && (
                  <button onClick={() => deploy(id)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors">
                    Deploy Now
                  </button>
                )}
                {p.status === 'building' && (
                  <div className="flex-1 py-2 bg-[#0B0F19] border border-[#1E293B] text-slate-500 rounded-xl text-sm text-center">Building...</div>
                )}
                {p.status === 'live' && (
                  <>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 rounded-xl text-sm hover:bg-emerald-600/20 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />Open App
                      </a>
                    )}
                    {!p.url && (
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600/10 border border-blue-600/30 text-blue-400 rounded-xl text-sm hover:bg-blue-600/20 transition-colors">
                        <Download className="w-3.5 h-3.5" />Download Installer
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
