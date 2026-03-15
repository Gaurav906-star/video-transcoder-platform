import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useAnalytics, useJobsOverTime, useProfileDistribution, useProcessingTimes } from '../hooks/useApi'
import { PROFILE_COLORS, formatSecondsToTime } from '../utils/helpers'

// ── Shared chart theme ────────────────────────────────────
const CHART_STYLE = {
  background: '#0f1420',
  border: '1px solid #1c2540',
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#151c2e', border: '1px solid #1c2540', borderRadius: 8, color: '#e8edf8', fontSize: 12 },
  labelStyle: { color: '#8899bb' },
  cursor: { fill: 'rgba(59,110,246,0.06)' },
}

const AXIS_STYLE = { fill: '#4a5680', fontSize: 11, fontFamily: 'JetBrains Mono' }

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={CHART_STYLE}>
      <h3 className="font-display font-semibold text-white text-sm">{title}</h3>
      {subtitle && <p className="text-xs mt-0.5 mb-4" style={{ color: '#4a5680' }}>{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: analytics } = useAnalytics()
  const { data: overTime }  = useJobsOverTime()
  const { data: profileDist } = useProfileDistribution()
  const { data: procTimes }   = useProcessingTimes()

  // Fill missing profile colours
  const pieColors = (profileDist ?? []).map(
    d => PROFILE_COLORS[d.profile] ?? '#3b6ef6'
  )

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Success Rate',    value: `${analytics?.success_rate ?? 0}%`,       color: '#4ade80' },
          { label: 'Avg. Process',    value: formatSecondsToTime(analytics?.avg_processing_seconds ?? null), color: '#22d3ee' },
          { label: 'Raw Ingested',    value: `${analytics?.total_raw_gb ?? 0} GB`,     color: '#fbbf24' },
          { label: 'Output Produced', value: `${analytics?.total_processed_gb ?? 0} GB`, color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={CHART_STYLE}>
            <p className="text-2xl font-display font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: '#4a5680' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Jobs over time */}
      <ChartCard title="Jobs Completed Over Time" subtitle="Last 30 days">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={overTime ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b6ef6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b6ef6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2540" />
            <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="count" name="Jobs"
              stroke="#3b6ef6" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Profile distribution + processing times side by side */}
      <div className="grid grid-cols-2 gap-6">

        {/* Pie chart */}
        <ChartCard title="Jobs by Profile" subtitle="Completed job distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={profileDist ?? []}
                dataKey="count"
                nameKey="profile"
                cx="50%" cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={3}
                label={({ profile, percent }) =>
                  `${profile} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {(profileDist ?? []).map((_, i) => (
                  <Cell key={i} fill={pieColors[i] ?? '#3b6ef6'} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                formatter={(val) => <span style={{ color: '#8899bb', fontSize: 11 }}>{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bar chart – avg processing time */}
        <ChartCard title="Avg. Processing Time by Profile" subtitle="Seconds per completed job">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={procTimes ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2540" />
              <XAxis dataKey="profile" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: number) => [`${v}s`, 'Avg time']}
              />
              <Bar dataKey="avg_seconds" name="Avg (s)" radius={[4, 4, 0, 0]}>
                {(procTimes ?? []).map((entry, i) => (
                  <Cell key={i} fill={PROFILE_COLORS[entry.profile] ?? '#3b6ef6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Processing times table */}
      {(procTimes ?? []).length > 0 && (
        <ChartCard title="Detailed Processing Benchmarks">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2540' }}>
                {['Profile', 'Avg Time', 'Min Time', 'Max Time'].map(h => (
                  <th key={h} className="pb-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#4a5680' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {procTimes!.map(row => (
                <tr key={row.profile} style={{ borderBottom: '1px solid #151c2e' }}>
                  <td className="py-2.5">
                    <span className="font-mono text-xs px-2 py-1 rounded"
                      style={{ background: `${PROFILE_COLORS[row.profile] ?? '#3b6ef6'}18`,
                               color: PROFILE_COLORS[row.profile] ?? '#3b6ef6' }}>
                      {row.profile}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs" style={{ color: '#e8edf8' }}>
                    {formatSecondsToTime(row.avg_seconds)}
                  </td>
                  <td className="py-2.5 font-mono text-xs" style={{ color: '#4ade80' }}>
                    {formatSecondsToTime(row.min_seconds)}
                  </td>
                  <td className="py-2.5 font-mono text-xs" style={{ color: '#f87171' }}>
                    {formatSecondsToTime(row.max_seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      )}
    </div>
  )
}
