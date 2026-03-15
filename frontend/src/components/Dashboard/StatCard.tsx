import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: string
  trend?: { value: number; label: string }
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = '#3b6ef6', trend }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 card-glow animate-slide-up"
      style={{ background: '#0f1420', border: '1px solid #1c2540' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#4a5680' }}>
            {title}
          </p>
          <p className="font-display font-bold text-3xl text-white leading-none">{value}</p>
          {subtitle && (
            <p className="text-xs mt-2" style={{ color: '#8899bb' }}>{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs font-mono" style={{ color: trend.value >= 0 ? '#4ade80' : '#f87171' }}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs" style={{ color: '#4a5680' }}>{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  )
}
