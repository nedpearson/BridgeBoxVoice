import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export interface PieSlice {
  name: string
  value: number
  color: string
}

interface PieChartWidgetProps {
  title: string
  data: PieSlice[]
  height?: number
  showLegend?: boolean
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-white text-xs font-medium">{item.name}</p>
      <p className="text-slate-400 text-xs">{item.value.toLocaleString()} ({item.payload.percent}%)</p>
    </div>
  )
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function PieChartWidget({
  title,
  data,
  height = 220,
  showLegend = true,
}: PieChartWidgetProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const enriched = data.map((d) => ({ ...d, percent: ((d.value / total) * 100).toFixed(1) }))

  return (
    <div className="bg-[#0C1322] rounded-2xl border border-[#1E293B] p-5">
      <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={enriched}
            cx="50%"
            cy="50%"
            innerRadius={showLegend ? 0 : 40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={<CustomLabel />}
          >
            {enriched.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#94A3B8' }}
              iconType="circle"
              iconSize={8}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
