import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  target?: string
  progress?: number
  trend?: 'up' | 'down' | 'neutral'
  color?: 'teal' | 'blue' | 'violet' | 'amber' | 'rose' | 'emerald'
}

const COLOR_MAP: Record<string, { bar: string; bg: string; text: string }> = {
  teal: { bar: 'bg-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-600' },
  blue: { bar: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600' },
  violet: { bar: 'bg-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-600' },
  amber: { bar: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  rose: { bar: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-600' },
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
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
    <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl ${colors.bg}`}>
          <div className={`w-2 h-2 rounded-full ${colors.bar} animate-pulse`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
            trend === 'up' ? 'bg-emerald-100 text-emerald-600' :
            trend === 'down' ? 'bg-rose-100 text-rose-600' :
            'bg-slate-100 text-slate-500'
          }`}>
            {trend === 'up' && <TrendingUp size={14} />}
            {trend === 'down' && <TrendingDown size={14} />}
            {trend === 'neutral' && <Minus size={14} />}
            {trend === 'up' ? '12.5%' : trend === 'down' ? '3.2%' : '0%'}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className={`text-2xl font-black ${colors.text} tracking-tight group-hover:drop-shadow-sm transition-all`}>
          {value}
        </h3>
        {target && (
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
            Meta: {target}
            <ArrowRight size={10} />
          </p>
        )}
      </div>

      {progress != null && (
         <div className="mt-6 pt-4 border-t border-slate-100/50">
           <div className="flex justify-between items-end mb-2">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atingimento</span>
             <span className="text-xs font-bold text-slate-600">{Math.round(progress)}%</span>
           </div>
           <div className={`w-full h-1.5 rounded-full bg-slate-100 overflow-hidden`}>
             <div
               className={`h-full rounded-full transition-all duration-1000 ease-out ${colors.bar}`}
               style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
             />
           </div>
         </div>
      )}
    </div>
  )
}
