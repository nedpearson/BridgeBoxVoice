import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number // percentage, positive = up
  icon?: React.ReactNode
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose'
}

const COLOR_MAP = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
} as const

export default function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  color = 'blue',
}: MetricCardProps) {
  const colors = COLOR_MAP[color]

  const ChangeIcon =
    change === undefined ? null :
    change > 0 ? TrendingUp :
    change < 0 ? TrendingDown : Minus

  const changeColor =
    change === undefined ? '' :
    change > 0 ? 'text-emerald-400' :
    change < 0 ? 'text-red-400' : 'text-slate-400'

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        {icon && (
          <div className={`w-9 h-9 rounded-xl bg-[#0B0F19] flex items-center justify-center ${colors.text}`}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <p className="text-white text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>

      {ChangeIcon && change !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${changeColor}`}>
          <ChangeIcon className="w-3.5 h-3.5" />
          <span className="font-medium">{Math.abs(change)}%</span>
          <span className="text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  )
}
