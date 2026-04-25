import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/appStore'
import {
  TrendingUp, Cpu, Globe, Zap, RefreshCw, Clock
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { formatDistanceToNow, subMonths, startOfMonth, format } from 'date-fns'

export default function Analytics() {
  const { projects } = useStore()
  const [loading, setLoading] = useState(true)
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single()
        if (!ws) return
        setWorkspaceId(ws.id)
        const { data: ps } = await supabase
          .from('projects')
          .select('id, name, status, created_at, web_app_url, mobile_app_url, desktop_app_url')
          .eq('workspace_id', ws.id)
          .order('created_at', { ascending: false })
        setAllProjects(ps ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Use store projects as real-time source, fall back to fetched
  const ps = projects.length > 0 ? projects : allProjects

  // KPI stats
  const total = ps.length
  const deployed = ps.filter(p => p.status === 'deployed').length
  const building = ps.filter(p => ['building', 'analyzing', 'recording'].includes(p.status)).length
  const failed = ps.filter(p => p.status === 'failed').length
  const successRate = total > 0 ? Math.round((deployed / total) * 100) : 0

  // Line chart: projects per month (last 6 months)
  const now = new Date()
  const lineData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const label = format(month, 'MMM')
    const start = startOfMonth(month)
    const end = startOfMonth(subMonths(month, -1))
    const count = ps.filter(p => {
      const d = new Date(p.created_at)
      return d >= start && d < end
    }).length
    return { month: label, projects: count }
  })

  // Pie chart: platform distribution
  const hasMobile = ps.filter(p => p.mobile_app_url).length
  const hasDesktop = ps.filter(p => p.desktop_app_url).length
  const webOnly = Math.max(0, total - hasMobile - hasDesktop)
  const pieData = [
    { name: 'Web', value: webOnly || Math.max(1, total), color: '#60A5FA' },
    { name: 'Mobile', value: hasMobile, color: '#34D399' },
    { name: 'Desktop', value: hasDesktop, color: '#A78BFA' },
  ].filter(d => d.value > 0)

  // Bar chart: status distribution
  const barData = [
    { name: 'Recording', count: ps.filter(p => p.status === 'recording').length, fill: '#60A5FA' },
    { name: 'Analyzing', count: ps.filter(p => p.status === 'analyzing').length, fill: '#FBBF24' },
    { name: 'Building', count: ps.filter(p => p.status === 'building').length, fill: '#A78BFA' },
    { name: 'Deployed', count: deployed, fill: '#34D399' },
    { name: 'Failed', count: failed, fill: '#F87171' },
  ].filter(d => d.count > 0)

  const STATS = [
    { label: 'Total Projects', value: String(total), delta: null, icon: Cpu, color: 'text-blue-400' },
    { label: 'Deployed Live', value: String(deployed), delta: null, icon: Globe, color: 'text-emerald-400' },
    { label: 'Success Rate', value: `${successRate}%`, delta: null, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'In Progress', value: String(building), delta: null, icon: Zap, color: 'text-yellow-400' },
  ]

  if (loading && ps.length === 0) return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={24} className="text-blue-400 animate-spin" />
        <p className="text-slate-400 text-sm">Loading analytics…</p>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time project metrics for your workspace.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-sm">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {total === 0 ? (
        <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-16 text-center">
          <Cpu size={32} className="mx-auto mb-3 text-slate-600 opacity-50" />
          <p className="text-slate-500 text-sm">No projects yet — create your first project to see analytics.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Line: projects over time */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 text-sm">Projects Created (Last 6 Months)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12, color: '#F1F5F9' }} />
                  <Line type="monotone" dataKey="projects" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: platform split */}
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 text-sm">Deployment Platforms</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12, color: '#F1F5F9' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar: status distribution */}
          {barData.length > 0 && (
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5 mb-4">
              <h3 className="text-white font-semibold mb-4 text-sm">Projects by Status</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} barSize={36}>
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12, color: '#F1F5F9' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-project table */}
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">All Projects</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-[#1E293B]">
                  <th className="text-left pb-3">Project</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-left pb-3">Platforms</th>
                  <th className="text-left pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {ps.map((p: any) => (
                  <tr key={p.id} className="border-b border-[#1E293B]/50 hover:bg-[#1E293B]/30 cursor-pointer transition-colors" onClick={() => window.location.href = `/project/${p.id}`}>
                    <td className="py-3 text-white font-medium text-sm">{p.name}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold capitalize ${
                        p.status === 'deployed' ? 'bg-emerald-500/10 text-emerald-400' :
                        p.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-3 text-slate-400 text-xs">
                      <span className="flex items-center gap-1">
                        {p.web_app_url && <Globe size={11} className="text-emerald-400" />}
                        {p.mobile_app_url && <span>📱</span>}
                        {p.desktop_app_url && <span>🖥</span>}
                        {!p.web_app_url && !p.mobile_app_url && !p.desktop_app_url && '—'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 text-xs flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
