import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Toaster } from 'react-hot-toast'
import Auth from './components/Auth'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectBuilder from './pages/ProjectBuilder'
import Marketplace from './pages/Marketplace'
import Analytics from './pages/Analytics'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import EnterprisePage from './pages/EnterprisePage'
import StatusPage from './pages/StatusPage'
import TeamPage from './pages/TeamPage'
import HelpPage from './pages/HelpPage'
import CapturesPage from './pages/CapturesPage'

// Handles Supabase OAuth redirect (/auth/callback?code=...) and exchanges the code for a session
function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    supabase.auth.getSession().then(() => navigate('/', { replace: true }))
  }, [navigate])
  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner spinner-blue" style={{ width: 44, height: 44, borderWidth: 4 }} />
        <p className="text-slate-400 text-sm font-mono tracking-widest uppercase animate-pulse">Signing in…</p>
      </div>
    </div>
  )
}

function AppRoutes({ session, loading }: { session: Session | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-blue" style={{ width: 44, height: 44, borderWidth: 4 }} />
          <p className="text-slate-400 text-sm font-mono tracking-widest uppercase animate-pulse">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Always-available routes */}
      <Route path="/status" element={<StatusPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {!session ? (
        /* Not signed in — show auth on every route */
        <Route path="*" element={<Auth />} />
      ) : (
        /* Signed in */
        <Route path="/" element={<Layout session={session} />}>
          <Route index element={<Dashboard />} />
          <Route path="project/:projectId" element={<ProjectDetailPage />} />
          <Route path="project/:projectId/record" element={<ProjectBuilder />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="settings" element={<Settings />} />
          <Route path="enterprise" element={<EnterprisePage workspaceId={session.user.user_metadata?.workspace_id ?? 'default'} />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="captures" element={<CapturesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <ErrorBoundary>
      <>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#131B2B', color: '#F1F5F9', border: '1px solid #1E293B' },
            success: { iconTheme: { primary: '#60A5FA', secondary: '#0B0F19' } },
            error: { iconTheme: { primary: '#F87171', secondary: '#0B0F19' } },
          }}
        />
        <BrowserRouter>
          <AppRoutes session={session} loading={loading} />
        </BrowserRouter>
      </>
    </ErrorBoundary>
  )
}

