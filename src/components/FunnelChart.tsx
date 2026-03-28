import { formatCurrency } from '../lib/format'

interface FunnelChartProps {
  data: { etapa: string; count: number; valor: number }[]
}

const FUNNEL_COLORS = [
  'bg-teal-500',
  'bg-teal-600',
  'bg-blue-500',
  'bg-blue-600',
  'bg-violet-500',
  'bg-violet-600',
]

const FUNNEL_TEXT_COLORS = [
  'text-teal-700',
  'text-teal-800',
  'text-blue-700',
  'text-blue-800',
  'text-violet-700',
  'text-violet-800',
]

export default function FunnelChart({ data }: FunnelChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-2">
      {data.map((item, index) => {
        const widthPercent = Math.max(20, (item.count / maxCount) * 100)
        const colorClass = FUNNEL_COLORS[index % FUNNEL_COLORS.length]
        const textColor = FUNNEL_TEXT_COLORS[index % FUNNEL_TEXT_COLORS.length]

        return (
          <div key={item.etapa} className="flex items-center gap-3">
            <div className="w-full flex flex-col items-center">
              <div
                className={`${colorClass} rounded-md h-10 flex items-center justify-center transition-all duration-500 mx-auto`}
                style={{ width: `${widthPercent}%` }}
              >
                <span className="text-white text-xs font-bold px-2 truncate">
                  {item.count}
                </span>
              </div>
              <div className="flex items-center justify-between w-full mt-0.5 px-1">
                <span className={`text-xs font-medium ${textColor}`}>
                  {item.etapa}
                </span>
                <span className="text-xs text-slate-400">
                  {formatCurrency(item.valor)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
