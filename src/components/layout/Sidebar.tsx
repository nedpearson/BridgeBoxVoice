import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useStore } from '../../store/appStore'
import {
  LayoutDashboard, Store, BarChart3, CreditCard, Settings, LogOut, Mic, ChevronRight, Shield, Users, HelpCircle, Camera, QrCode, X
} from 'lucide-react'
import QRCode from 'react-qr-code'

interface SidebarProps { session: Session }

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/marketplace', label: 'Integrations', icon: Store },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/captures', label: 'Captures', icon: Camera },
  { to: '/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const enterpriseNav = [
  { to: '/team', label: 'Team', icon: Users },
  { to: '/enterprise', label: 'Enterprise', icon: Shield, accent: true },
  { to: '/help', label: 'Help Center', icon: HelpCircle },
]

export default function Sidebar({ session }: SidebarProps) {
  const navigate = useNavigate()
  const { workspace } = useStore()
  const [showQR, setShowQR] = useState(false)

  const signOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0C1322] border-r border-[#1E293B] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M2 12V17M22 12V17M12 12V22" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Bridgebox Voice</p>
            <p className="text-[#60A5FA] text-xs font-semibold mt-0.5">Voice AI</p>
          </div>
        </div>
      </div>

      {/* New Project CTA */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(37,99,235,0.25)] text-sm"
        >
          <Mic className="w-4 h-4" />
          New Voice Project
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {nav.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1E293B] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131B2B]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#60A5FA]' : ''}`} />
                {label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-slate-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Enterprise Nav */}
      <nav className="px-3 pb-3 space-y-1">
        <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Enterprise</p>
        {enterpriseNav.map(({ to, label, icon: Icon, accent }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? accent ? 'bg-purple-900/30 text-purple-300' : 'bg-[#1E293B] text-white'
                  : accent ? 'text-purple-400/70 hover:text-purple-300 hover:bg-purple-900/20' : 'text-slate-400 hover:text-slate-200 hover:bg-[#131B2B]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 ${isActive && accent ? 'text-purple-400' : isActive ? 'text-[#60A5FA]' : ''}`} />
                {label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-slate-500" />}
                {!isActive && accent && <span style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 4, color: '#A78BFA', fontWeight: 700, marginLeft: 'auto' }}>ADMIN</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Workspace & User */}
      <div className="px-4 py-4 border-t border-[#1E293B] space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 font-bold text-xs">
              {(workspace?.name ?? session.user.email ?? 'W')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{workspace?.name ?? 'My Workspace'}</p>
            <p className="text-slate-500 text-[11px] truncate font-mono">{workspace?.plan ?? 'starter'}</p>
          </div>
        </div>
        <button
          onClick={() => setShowQR(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-xl text-sm font-medium transition-all"
        >
          <QrCode className="w-4 h-4" />
          Client Connect QR
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-xl text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
          <div className="bg-[#0C1322] border border-[#1E293B] rounded-2xl p-8 max-w-sm w-full text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connect Client Device</h2>
            <p className="text-slate-400 text-sm mb-6">Scan this QR code with a mobile device or tablet to instantly open BridgeBox on that screen.</p>
            
            <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-xl">
              <QRCode value={typeof window !== 'undefined' ? window.location.href : ''} size={200} />
            </div>
            
            <p className="text-slate-500 text-xs break-all px-4">{typeof window !== 'undefined' ? window.location.href : ''}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
