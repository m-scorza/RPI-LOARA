import { formatCurrency } from '../lib/format'

interface FunnelChartProps {
  data: { etapa: string; count: number; valor: number }[]
}

const FUNNEL_GRADIENTS = [
  'from-teal-400 to-teal-600 shadow-teal-500/20',
  'from-teal-500 to-teal-700 shadow-teal-600/20',
  'from-blue-400 to-blue-600 shadow-blue-500/20',
  'from-blue-500 to-blue-700 shadow-blue-600/20',
  'from-violet-400 to-violet-600 shadow-violet-500/20',
  'from-violet-500 to-violet-700 shadow-violet-600/20',
]

export default function FunnelChart({ data }: FunnelChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-4 py-4">
      {data.map((item, index) => {
        const widthPercent = Math.max(25, (item.count / maxCount) * 100)
        const gradientClass = FUNNEL_GRADIENTS[index % FUNNEL_GRADIENTS.length]

        return (
          <div key={item.etapa} className="group relative">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-teal-600 transition-colors">
                {item.etapa}
              </span>
              {item.valor > 0 && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                  {formatCurrency(item.valor)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div
                className={`bg-gradient-to-r ${gradientClass} rounded-xl h-9 flex items-center justify-center transition-all duration-700 shadow-lg relative overflow-hidden`}
                style={{ width: `${widthPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-white text-xs font-black drop-shadow-sm">
                  {item.count}
                </span>
              </div>
              <div className="flex-1 h-[1px] bg-slate-100 group-hover:bg-teal-100 transition-colors" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
