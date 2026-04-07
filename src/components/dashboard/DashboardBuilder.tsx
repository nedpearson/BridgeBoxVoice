import { useState } from 'react'
import { Sparkles, LayoutDashboard, BarChart2, Table as TableIcon, Kanban, TrendingUp } from 'lucide-react'
import { AIAnalysis } from '../../lib/anthropic'
import MetricCard from './widgets/MetricCard'
import LineChartWidget from './widgets/LineChartWidget'
import PieChartWidget from './widgets/PieChartWidget'
import DataTableWidget, { DataColumn } from './widgets/DataTableWidget'
import KanbanBoard from './widgets/KanbanBoard'

interface DashboardBuilderProps {
  projectName?: string
  analysis?: AIAnalysis
}

type WidgetType = 'metrics' | 'linechart' | 'piechart' | 'table' | 'kanban'

// Deterministic demo data
const DEMO_LINE_DATA = [
  { name: 'Jan', users: 120, revenue: 8400 },
  { name: 'Feb', users: 185, revenue: 12200 },
  { name: 'Mar', users: 210, revenue: 15600 },
  { name: 'Apr', users: 178, revenue: 13800 },
  { name: 'May', users: 296, revenue: 20400 },
  { name: 'Jun', users: 342, revenue: 24800 },
]

const DEMO_PIE_DATA = [
  { name: 'Web', value: 58, color: '#3B82F6' },
  { name: 'Mobile', value: 28, color: '#8B5CF6' },
  { name: 'API', value: 14, color: '#10B981' },
]

interface ActivityRow extends Record<string, unknown> {
  event: string
  user: string
  timestamp: string
  status: string
}

const DEMO_TABLE_DATA: ActivityRow[] = [
  { event: 'User signup', user: 'alice@example.com', timestamp: '2 mins ago', status: 'New' },
  { event: 'Payment processed', user: 'bob@example.com', timestamp: '14 mins ago', status: 'Success' },
  { event: 'Export requested', user: 'carol@example.com', timestamp: '1 hr ago', status: 'Pending' },
  { event: 'API key generated', user: 'dave@example.com', timestamp: '3 hrs ago', status: 'Done' },
  { event: 'Role changed', user: 'eve@example.com', timestamp: '1 day ago', status: 'Done' },
]

const DEMO_COLUMNS: DataColumn<ActivityRow>[] = [
  { key: 'event', label: 'Event', sortable: true },
  { key: 'user', label: 'User', sortable: true },
  { key: 'timestamp', label: 'When', sortable: false },
  {
    key: 'status',
    label: 'Status',
    render: (v) => {
      const val = v as string
      const colors: Record<string, string> = {
        New: 'bg-blue-500/20 text-blue-400',
        Success: 'bg-emerald-500/20 text-emerald-400',
        Pending: 'bg-amber-500/20 text-amber-400',
        Done: 'bg-slate-700 text-slate-400',
      }
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[val] ?? 'bg-slate-700 text-slate-400'}`}>
          {val}
        </span>
      )
    },
  },
]

const WIDGET_BUTTONS: { type: WidgetType; label: string; icon: React.FC<any> }[] = [
  { type: 'metrics', label: 'Metrics', icon: BarChart2 },
  { type: 'linechart', label: 'Line Chart', icon: TrendingUp },
  { type: 'piechart', label: 'Pie Chart', icon: LayoutDashboard },
  { type: 'table', label: 'Data Table', icon: TableIcon },
  { type: 'kanban', label: 'Kanban', icon: Kanban },
]

export default function DashboardBuilder({ projectName = 'My Project', analysis }: DashboardBuilderProps) {
  const [activeWidget, setActiveWidget] = useState<WidgetType>('metrics')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generateDashboard = async () => {
    setIsGenerating(true)
    await new Promise((r) => setTimeout(r, 1800))
    setIsGenerating(false)
    setGenerated(true)
    setActiveWidget('metrics')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg">{projectName} — Dashboard</h3>
          {analysis && (
            <p className="text-slate-500 text-xs mt-0.5">{analysis.industry} · AI-generated layout</p>
          )}
        </div>
        <button
          onClick={generateDashboard}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'AI Generate Dashboard'}
        </button>
      </div>

      {/* Widget tabs */}
      <div className="flex gap-1 mb-6 bg-[#0C1322] p-1 rounded-xl border border-[#1E293B] w-fit">
        {WIDGET_BUTTONS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setActiveWidget(type)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeWidget === type
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Widget content */}
      <div className="flex-1 overflow-y-auto">
        {activeWidget === 'metrics' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={generated ? '1,342' : '—'}
              change={generated ? 28 : undefined}
              icon={<BarChart2 className="w-4 h-4" />}
              color="blue"
              subtitle="Registered accounts"
            />
            <MetricCard
              title="Monthly Revenue"
              value={generated ? '$24,800' : '—'}
              change={generated ? 18 : undefined}
              icon={<TrendingUp className="w-4 h-4" />}
              color="emerald"
              subtitle="Current billing period"
            />
            <MetricCard
              title="Active Sessions"
              value={generated ? '186' : '—'}
              change={generated ? -4 : undefined}
              icon={<Sparkles className="w-4 h-4" />}
              color="purple"
              subtitle="Right now"
            />
            <MetricCard
              title="Deployments"
              value={generated ? '47' : '—'}
              change={generated ? 12 : undefined}
              icon={<LayoutDashboard className="w-4 h-4" />}
              color="amber"
              subtitle="This month"
            />
          </div>
        )}

        {activeWidget === 'linechart' && (
          <LineChartWidget
            title="Users & Revenue Over Time"
            data={DEMO_LINE_DATA}
            series={[
              { key: 'users', label: 'Users', color: '#3B82F6' },
              { key: 'revenue', label: 'Revenue ($)', color: '#10B981' },
            ]}
            height={280}
          />
        )}

        {activeWidget === 'piechart' && (
          <div className="max-w-sm">
            <PieChartWidget
              title="Traffic by Platform"
              data={DEMO_PIE_DATA}
              height={280}
            />
          </div>
        )}

        {activeWidget === 'table' && (
          <DataTableWidget<ActivityRow>
            title="Recent Activity"
            columns={DEMO_COLUMNS}
            data={DEMO_TABLE_DATA}
            pageSize={5}
            searchable
          />
        )}

        {activeWidget === 'kanban' && (
          <div className="h-96">
            <KanbanBoard title="Project Tasks" />
          </div>
        )}
      </div>
    </div>
  )
}
