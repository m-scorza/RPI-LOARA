import { Pencil, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import type { Acao, StatusAcao } from '../types/database'
import { formatDate } from '../lib/format'

interface ActionListProps {
  acoes: Acao[]
  onStatusChange?: (id: string, status: StatusAcao) => void
  onEdit?: (acao: Acao) => void
  readOnly?: boolean
}

const STATUS_OPTIONS: { value: StatusAcao; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'atrasada', label: 'Atrasada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const STATUS_STYLES: Record<StatusAcao, string> = {
  pendente: 'bg-slate-100 text-slate-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-emerald-100 text-emerald-700',
  atrasada: 'bg-rose-100 text-rose-700',
  cancelada: 'bg-slate-100 text-slate-400 line-through',
}

const RESPONSAVEL_STYLES: Record<string, string> = {
  Parceiro: 'bg-teal-100 text-teal-700',
  Gerente: 'bg-blue-100 text-blue-700',
  Ambos: 'bg-violet-100 text-violet-700',
}

const PRIORIDADE_STYLES: Record<string, string> = {
  alta: 'bg-rose-100 text-rose-700',
  'média': 'bg-amber-100 text-amber-700',
  baixa: 'bg-slate-100 text-slate-600',
}

function isPastDue(prazo: string | null): boolean {
  if (!prazo) return false
  return new Date(prazo) < new Date(new Date().toDateString())
}

export default function ActionList({ acoes, onStatusChange, onEdit, readOnly = false }: ActionListProps) {
  if (acoes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nenhuma acao cadastrada.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {acoes.map((acao) => {
        const pastDue = isPastDue(acao.prazo) && acao.status !== 'concluida' && acao.status !== 'cancelada'

        return (
          <div
            key={acao.id}
            className={`bg-white rounded-lg border p-4 ${
              pastDue ? 'border-rose-200' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {acao.status === 'concluida' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : pastDue ? (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-800 ${
                  acao.status === 'cancelada' ? 'line-through text-slate-400' : ''
                }`}>
                  {acao.descricao}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RESPONSAVEL_STYLES[acao.responsavel]}`}>
                    {acao.responsavel}
                  </span>

                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORIDADE_STYLES[acao.prioridade]}`}>
                    {acao.prioridade.charAt(0).toUpperCase() + acao.prioridade.slice(1)}
                  </span>

                  {acao.prazo && (
                    <span className={`text-xs ${pastDue ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                      Prazo: {formatDate(acao.prazo)}
                      {pastDue && ' (atrasada)'}
                    </span>
                  )}

                  {acao.categoria && (
                    <span className="text-xs text-slate-400">
                      {acao.categoria}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!readOnly && onStatusChange ? (
                  <select
                    value={acao.status}
                    onChange={(e) => onStatusChange(acao.id, e.target.value as StatusAcao)}
                    className={`text-xs rounded-md border-0 py-1 pl-2 pr-7 font-medium cursor-pointer ${STATUS_STYLES[acao.status]}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[acao.status]}`}>
                    {STATUS_OPTIONS.find((o) => o.value === acao.status)?.label}
                  </span>
                )}

                {!readOnly && onEdit && (
                  <button
                    onClick={() => onEdit(acao)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
