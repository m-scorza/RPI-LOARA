import { ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'

interface MetricComparisonProps {
  label: string
  current: number
  previous: number | null
  format?: 'currency' | 'number' | 'percent'
}

function formatValue(value: number, fmt: 'currency' | 'number' | 'percent'): string {
  switch (fmt) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    case 'number':
    default:
      return formatNumber(value)
  }
}

export default function MetricComparison({
  label,
  current,
  previous,
  format = 'number',
}: MetricComparisonProps) {
  const hasPrevious = previous !== null && previous !== undefined
  const delta = hasPrevious ? current - previous! : 0
  const pctChange = hasPrevious && previous !== 0 ? delta / Math.abs(previous!) : 0
  const improved = delta > 0
  const declined = delta < 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">
        {formatValue(current, format)}
      </p>

      {hasPrevious && delta !== 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {improved ? (
            <ArrowUp className="w-4 h-4 text-emerald-500" />
          ) : declined ? (
            <ArrowDown className="w-4 h-4 text-rose-500" />
          ) : null}
          <span
            className={`text-sm font-medium ${
              improved ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {delta > 0 ? '+' : ''}
            {formatValue(delta, format)}
          </span>
          <span className="text-xs text-slate-400">
            ({pctChange > 0 ? '+' : ''}
            {(pctChange * 100).toFixed(1)}%)
          </span>
        </div>
      )}

      {hasPrevious && delta === 0 && (
        <p className="text-xs text-slate-400 mt-1.5">Sem variacao</p>
      )}

      {!hasPrevious && (
        <p className="text-xs text-slate-400 mt-1.5">Sem dados anteriores</p>
      )}
    </div>
  )
}
