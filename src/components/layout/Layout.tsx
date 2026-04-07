import { Outlet } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/appStore'
import Sidebar from './Sidebar'
import { Workspace } from '../../types/platform'

interface LayoutProps { session: Session }

export default function Layout({ session }: LayoutProps) {
  const { setWorkspace, setProjects } = useStore()

  useEffect(() => {
    const load = async () => {
      const { data: ws } = await supabase
        .from('workspaces').select('*').limit(1).single()
      if (ws) setWorkspace(ws as Workspace)

      const { data: ps } = await supabase
        .from('projects').select('*')
        .eq('workspace_id', ws?.id)
        .order('created_at', { ascending: false })
      if (ps) setProjects(ps as any[])
    }
    load()
  }, [session.user.id, setWorkspace, setProjects])

  return (
    <div className="flex h-screen bg-[#0B0F19] overflow-hidden">
      <Sidebar session={session} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
