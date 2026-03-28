import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  target?: string
  progress?: number
  trend?: 'up' | 'down' | 'neutral'
  color?: 'teal' | 'blue' | 'violet' | 'amber' | 'rose' | 'emerald'
}

const COLOR_MAP: Record<string, { bar: string; bg: string }> = {
  teal: { bar: 'bg-teal-500', bg: 'bg-teal-100' },
  blue: { bar: 'bg-blue-500', bg: 'bg-blue-100' },
  violet: { bar: 'bg-violet-500', bg: 'bg-violet-100' },
  amber: { bar: 'bg-amber-500', bg: 'bg-amber-100' },
  rose: { bar: 'bg-rose-500', bg: 'bg-rose-100' },
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-100' },
}

export default function KPICard({
  label,
  value,
  target,
  progress,
  trend,
  color = 'teal',
}: KPICardProps) {
  const colors = COLOR_MAP[color]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {trend && (
          <span className="flex-shrink-0 ml-2">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500" />}
            {trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>

      {target && (
        <p className="text-xs text-slate-400 mt-0.5">{target}</p>
      )}

      {progress != null && (
        <div className="mt-3">
          <div className={`w-full h-2 rounded-full ${colors.bg}`}>
            <div
              className={`h-2 rounded-full transition-all duration-500 ${colors.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">{Math.round(progress)}%</p>
        </div>
      )}
    </div>
  )
}
