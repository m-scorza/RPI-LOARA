import type { Parceiro, Acao, Lead } from '../types/database'
import { formatCurrency, formatDate, GERENTE_NOME } from '../lib/format'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import { ETAPAS_FUNIL } from '../types/database'
import { Check, Clock, TrendingUp, Users, Target, FileText, ClipboardList, Layout, Copy } from 'lucide-react'
import { toast } from 'sonner'

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
  customContent?: string
}

const PRIORIDADE_STYLES: Record<string, string> = {
  alta: 'bg-rose-50 text-rose-600 border border-rose-100 ring-4 ring-rose-500/5',
  média: 'bg-amber-50 text-amber-600 border border-amber-100 ring-4 ring-amber-500/5',
  baixa: 'bg-slate-50 text-slate-500 border border-slate-100 ring-4 ring-slate-500/5',
}

const RESPONSAVEL_STYLES: Record<string, string> = {
  Parceiro: 'bg-teal-50 text-teal-600 border border-teal-100',
  Gerente: 'bg-blue-50 text-blue-600 border border-blue-100',
  Ambos: 'bg-violet-50 text-violet-600 border border-violet-100',
}

function AIContent({ content, titulo, subtitulo, numeroRPI, dataRPI, icon: Icon }: { 
  content: string; 
  titulo: string; 
  subtitulo: string;
  numeroRPI: number;
  dataRPI: string;
  icon: any;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[800px]">
      <div className="bg-[#0F172A] p-10 text-white relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
          <Icon size={140} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Inteligência Estratégica ✦</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">{titulo}</h1>
            <p className="text-slate-400 font-medium">{subtitulo}</p>
          </div>
          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="text-teal-500">RPI #{numeroRPI}</span>
              <span>•</span>
              <span>{formatDate(dataRPI)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-10 prose prose-slate max-w-none">
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm font-medium">
          {content}
        </div>
      </div>
    </div>
  )
}

function PlanoFormatado({ parceiro, rpiData, acoes }: EntregavelProps) {
  const proj = calculateRevenueProjection(parceiro)

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[800px]">
      {/* Premium Header */}
      <div className="bg-[#0F172A] p-10 text-white relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
          <ClipboardList size={140} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Plano de Ação Estratégico</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">{parceiro.nome}</h1>
            <p className="text-slate-400 font-medium">Categoria {parceiro.categoria} — {parceiro.regiao || 'Brasil'}</p>
          </div>
          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="text-teal-500">#{rpiData.numero_sequencial}</span>
              <span>•</span>
              <span>{formatDate(rpiData.data_reuniao)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Users size={14} className="text-teal-500/50" />
              <span>Gerente: {GERENTE_NOME}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-10 space-y-12">
        {/* Revenue Bridge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-8 relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp size={40} className="text-emerald-600" />
            </div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Objetivo de Receita</p>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(proj.metaReceitaMensal)}/mês</p>
                <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-teal-500 w-3/4" />
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Este plano foi construído para viabilizar o faturamento anual de <span className="text-slate-800 font-black">{formatCurrency(proj.metaReceitaAnual)}</span>.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ritmo Operacional</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xl font-black text-slate-800">{proj.leadsNecessariosMensal}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads / Mês</p>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-slate-800">{proj.clientesNecessariosMensal}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratos / Mês</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Check size={18} />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Compromissos e Ações</h3>
          </div>
          
          <div className="space-y-4">
            {acoes.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Nenhuma ação prioritária definida para este ciclo.</p>
              </div>
            ) : (
              acoes.map((a, i) => (
                <div key={i} className="group bg-white border border-slate-100 hover:border-teal-500/30 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-teal-500/5 flex items-start gap-6">
                  <div className="w-12 h-12 bg-slate-50 group-hover:bg-teal-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-teal-500 transition-colors shrink-0">
                    <span className="text-sm font-black">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <p className="text-base font-bold text-slate-800 leading-tight">{a.descricao}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${PRIORIDADE_STYLES[a.prioridade || 'baixa']}`}>
                        {a.prioridade}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${RESPONSAVEL_STYLES[a.responsavel || 'Parceiro']}`}>
                        {a.responsavel}
                      </span>
                      {a.prazo && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                          <Clock size={12} />
                          {formatDate(a.prazo)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {rpiData.proxima_rpi_prevista && (
          <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <FileText size={16} />
              <span className="text-xs font-medium">Documento gerado automaticamente pelo Sistema RPI-LOARA</span>
            </div>
            <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Próxima RPI</span>
              <span className="text-sm font-black">{formatDate(rpiData.proxima_rpi_prevista)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RelatorioFormatado({ parceiro, rpiData, leads }: EntregavelProps) {
  const proj = calculateRevenueProjection(parceiro)
  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const totalPipeline = activeLeads.reduce((s, l) => s + (l.demanda || 0), 0)
  const ponderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * l.probabilidade, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[800px]">
      <div className="bg-blue-900 p-10 text-white relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
          <TrendingUp size={140} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Relatório de Status de Performance</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">{parceiro.nome}</h1>
            <p className="text-blue-200 font-medium">{parceiro.categoria} • {parceiro.regiao || 'Brasil'}</p>
          </div>
          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
              <span className="text-blue-400">RPI #{rpiData.numero_sequencial}</span>
              <span>•</span>
              <span>{formatDate(rpiData.data_reuniao)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
              <Users size={14} className="text-blue-400/50" />
              <span>Gerente: {GERENTE_NOME}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-10 space-y-12">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Total Pipeline</p>
            <p className="text-xl font-black text-slate-800 text-center">{formatCurrency(totalPipeline)}</p>
          </div>
          <div className="bg-teal-50 border border-teal-100 p-6 rounded-3xl">
            <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1 text-center">Ponderado</p>
            <p className="text-xl font-black text-slate-800 text-center">{formatCurrency(ponderado)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Leads Ativos</p>
            <p className="text-xl font-black text-slate-800 text-center">{activeLeads.length}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target size={18} />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Caminho para a Meta</h3>
          </div>
          
          <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(proj.metaReceitaMensal)}/mês</p>
                <p className="text-xs text-slate-500 font-medium">Faturamento Alvo em Comissões</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-teal-600">{Math.round((ponderado * proj.comissaoLiquida / (proj.metaReceitaMensal || 1)) * 100)}%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atingimento Estimado</p>
              </div>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-teal-400" 
                style={{ width: `${Math.min(100, (ponderado * proj.comissaoLiquida / (proj.metaReceitaMensal || 1)) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layout size={18} />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Sumário do Funil</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ETAPAS_FUNIL.map((etapa) => {
              const etapaLeads = activeLeads.filter((l) => l.etapa === etapa)
              const count = etapaLeads.length
              const valor = etapaLeads.reduce((s, l) => s + (l.demanda || 0), 0)
              if (count === 0) return null
              return (
                <div key={etapa} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-500/20 transition-all shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{etapa}</p>
                    <p className="text-sm font-black text-slate-800">{count} {count === 1 ? 'Lead' : 'Leads'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">{formatCurrency(valor)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {rpiData.notas_gerais && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Observações Estratégicas</h3>
            </div>
            <div className="p-8 bg-slate-900 rounded-[2rem] text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {rpiData.notas_gerais}
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium">Gerado em {new Date().toLocaleDateString()} pelo RPI-LOARA</span>
          </div>
          {rpiData.proxima_rpi_prevista && (
            <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-3">Próxima RPI</span>
              <span className="text-sm font-black">{formatDate(rpiData.proxima_rpi_prevista)}</span>
            </div>
          )}
        </div>
      </div>
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Copiado para o HubSpot!')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Texto Formatado para o CRM</p>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Copy size={14} /> Copiar Texto
        </button>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8">
        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
          {lines.join('\n')}
        </pre>
      </div>
    </div>
  )
}

export default function EntregavelFormatado(props: EntregavelProps) {
  if (props.customContent) {
    return (
      <AIContent 
        content={props.customContent}
        titulo={props.parceiro.nome}
        subtitulo={props.tipo === 'plano' ? 'Plano de Ação Personalizado' : props.tipo === 'relatorio' ? 'Status Report Estratégico' : 'HubSpot CRM Summary'}
        numeroRPI={props.rpiData.numero_sequencial}
        dataRPI={props.rpiData.data_reuniao}
        icon={props.tipo === 'plano' ? ClipboardList : props.tipo === 'relatorio' ? TrendingUp : FileText}
      />
    )
  }

  switch (props.tipo) {
    case 'plano':
      return <PlanoFormatado {...props} />
    case 'relatorio':
      return <RelatorioFormatado {...props} />
    case 'hubspot':
      return <HubSpotFormatado {...props} />
  }
}
