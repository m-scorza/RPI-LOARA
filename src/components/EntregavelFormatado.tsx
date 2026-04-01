import type { Parceiro, Acao, Lead } from '../types/database'
import { formatCurrency, formatDate, GERENTE_NOME } from '../lib/format'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import { ETAPAS_FUNIL } from '../types/database'

interface EntregavelProps {
  tipo: 'plano' | 'relatorio' | 'hubspot'
  parceiro: Parceiro
  rpiData: {
    numero_sequencial: number
    data_reuniao: string
    notas_gerais?: string | null
    proxima_rpi_prevista?: string | null
  }
  acoes: Array<Partial<Acao>>
  leads: Lead[]
  discussionNotes?: string
}

const PRIORIDADE_STYLES: Record<string, string> = {
  alta: 'bg-rose-100 text-rose-700',
  média: 'bg-amber-100 text-amber-700',
  baixa: 'bg-slate-100 text-slate-600',
}

const RESPONSAVEL_STYLES: Record<string, string> = {
  Parceiro: 'bg-teal-100 text-teal-700',
  Gerente: 'bg-blue-100 text-blue-700',
  Ambos: 'bg-violet-100 text-violet-700',
}

function PlanoFormatado({ parceiro, rpiData, acoes }: EntregavelProps) {
  const proj = calculateRevenueProjection(parceiro)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">LOARA — Plano de Ação</p>
        <p className="text-lg font-bold mt-1">{parceiro.nome} ({parceiro.categoria})</p>
        <div className="flex gap-4 mt-2 text-sm opacity-90">
          <span>RPI #{rpiData.numero_sequencial}</span>
          <span>{formatDate(rpiData.data_reuniao)}</span>
          <span>Gerente: {GERENTE_NOME}</span>
        </div>
      </div>

      {/* Revenue context */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
        <p className="text-sm text-slate-700">
          Meta: <strong className="text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}/mês</strong> em receita
          — {proj.leadsNecessariosMensal} leads/mês, {proj.clientesNecessariosMensal} clientes/mês
        </p>
      </div>

      {/* Actions table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Ações Definidas</h3>
        {acoes.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nenhuma ação definida.</p>
        ) : (
          <div className="space-y-2">
            {acoes.map((a, i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 flex items-start gap-3">
                <span className="text-xs font-bold text-slate-400 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.descricao}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {a.responsavel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESPONSAVEL_STYLES[a.responsavel] || 'bg-slate-100 text-slate-600'}`}>
                        {a.responsavel}
                      </span>
                    )}
                    {a.prioridade && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDADE_STYLES[a.prioridade] || 'bg-slate-100 text-slate-600'}`}>
                        {a.prioridade}
                      </span>
                    )}
                    {a.prazo && (
                      <span className="text-xs text-slate-500">Prazo: {formatDate(a.prazo)}</span>
                    )}
                    {a.categoria && (
                      <span className="text-xs text-slate-400">{a.categoria}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {rpiData.proxima_rpi_prevista && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
          Próxima RPI: <strong>{formatDate(rpiData.proxima_rpi_prevista)}</strong>
        </div>
      )}
    </div>
  )
}

function RelatorioFormatado({ parceiro, rpiData, leads, acoes }: EntregavelProps) {
  const proj = calculateRevenueProjection(parceiro)
  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const totalPipeline = activeLeads.reduce((s, l) => s + (l.demanda || 0), 0)
  const ponderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * l.probabilidade, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Relatório de Status</p>
        <p className="text-lg font-bold mt-1">{parceiro.nome}</p>
        <div className="flex gap-4 mt-2 text-sm opacity-90">
          <span>RPI #{rpiData.numero_sequencial}</span>
          <span>{formatDate(rpiData.data_reuniao)}</span>
          <span>{parceiro.categoria} {parceiro.regiao ? `• ${parceiro.regiao}` : ''}</span>
        </div>
      </div>

      {/* Revenue goal */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Sua Meta</p>
        <p className="text-sm text-slate-700">
          <strong className="text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}/mês</strong> em receita
          ({formatCurrency(proj.metaReceitaAnual)}/ano)
        </p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-slate-800">{formatCurrency(proj.creditoNecessarioMensal)}</p>
            <p className="text-xs text-slate-500">crédito/mês</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-slate-800">{proj.clientesNecessariosMensal}</p>
            <p className="text-xs text-slate-500">clientes/mês</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-slate-800">{proj.leadsNecessariosMensal}</p>
            <p className="text-xs text-slate-500">leads/mês</p>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Pipeline Atual</h3>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {ETAPAS_FUNIL.map((etapa) => {
            const count = activeLeads.filter((l) => l.etapa === etapa).length
            const valor = activeLeads.filter((l) => l.etapa === etapa).reduce((s, l) => s + (l.demanda || 0), 0)
            if (count === 0) return null
            return (
              <div key={etapa} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-b-0">
                <span className="text-sm text-slate-700">{etapa}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-800">{count} leads</span>
                  <span className="text-sm text-slate-500">{formatCurrency(valor)}</span>
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 font-medium">
            <span className="text-sm text-slate-700">Total</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-800">{activeLeads.length} ativos</span>
              <span className="text-sm text-slate-800">{formatCurrency(totalPipeline)}</span>
              <span className="text-xs text-slate-500">({formatCurrency(ponderado)} pond.)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {acoes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Ações</h3>
          <div className="space-y-1.5">
            {acoes.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 font-mono text-xs">{i + 1}.</span>
                <span className="text-slate-700">{a.descricao}</span>
                {a.responsavel && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${RESPONSAVEL_STYLES[a.responsavel] || ''}`}>
                    {a.responsavel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {rpiData.notas_gerais && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{rpiData.notas_gerais}</p>
        </div>
      )}

      {rpiData.proxima_rpi_prevista && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
          Próxima RPI: <strong>{formatDate(rpiData.proxima_rpi_prevista)}</strong>
        </div>
      )}
    </div>
  )
}

function HubSpotFormatado({ parceiro, rpiData, acoes, leads, discussionNotes }: EntregavelProps) {
  const proj = calculateRevenueProjection(parceiro)
  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const ponderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * l.probabilidade, 0)

  const lines: string[] = []
  lines.push(`RPI #${rpiData.numero_sequencial} — ${parceiro.nome} — ${formatDate(rpiData.data_reuniao)}`)
  lines.push(`Gerente: ${GERENTE_NOME}`)
  lines.push('')
  lines.push('META DE RECEITA')
  lines.push(`Meta: ${formatCurrency(proj.metaReceitaMensal)}/mês (${formatCurrency(proj.metaReceitaAnual)}/ano)`)
  lines.push(`Para atingir: ${proj.clientesNecessariosMensal} clientes/mês, ${proj.leadsNecessariosMensal} leads/mês`)
  lines.push('')
  lines.push('PIPELINE')
  lines.push(`${activeLeads.length} leads ativos, ${formatCurrency(ponderado)} ponderado`)
  lines.push('')
  if (discussionNotes) {
    lines.push('ANDAMENTO')
    lines.push(`${discussionNotes}`)
    lines.push('')
  }
  if (acoes.length > 0) {
    lines.push('PLANO DE AÇÃO')
    acoes.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.descricao} — Resp: ${a.responsavel}${a.prazo ? ` — Prazo: ${formatDate(a.prazo)}` : ''}`)
    })
    lines.push('')
  }
  if (rpiData.proxima_rpi_prevista) {
    lines.push(`Próxima RPI: ${formatDate(rpiData.proxima_rpi_prevista)}`)
  }

  return (
    <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 rounded-xl p-4 leading-relaxed">
      {lines.join('\n')}
    </pre>
  )
}

export default function EntregavelFormatado(props: EntregavelProps) {
  switch (props.tipo) {
    case 'plano':
      return <PlanoFormatado {...props} />
    case 'relatorio':
      return <RelatorioFormatado {...props} />
    case 'hubspot':
      return <HubSpotFormatado {...props} />
  }
}
