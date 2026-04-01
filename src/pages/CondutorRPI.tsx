import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Clock, Check, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useParceiros } from '../hooks/useParceiros'
import { useLeads } from '../hooks/useLeads'
import { useRPIs } from '../hooks/useRPIs'
import { useAcoes } from '../hooks/useAcoes'
import { formatCurrency, formatDate } from '../lib/format'
import { generateHubSpotText, generatePlanoAcaoText, generateRelatorioText } from '../lib/generators'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import type { Parceiro, Acao, Responsavel, Prioridade, CategoriaAcao } from '../types/database'
import { ETAPAS_FUNIL } from '../types/database'
import PipelineKanban from '../components/PipelineKanban'
import ActionList from '../components/ActionList'
import CopyButton from '../components/CopyButton'
import EntregavelFormatado from '../components/EntregavelFormatado'

const BLOCKS = [
  { id: 0, label: 'Preparação' },
  { id: 2, label: 'Dúvidas' },
  { id: 3, label: 'Andamento' },
  { id: 4, label: 'Indicações' },
  { id: 5, label: 'Plano de Ação' },
  { id: 6, label: 'Finalização' },
]

const DUVIDAS_CHECKLIST = [
  { id: 'indicacao', label: 'Processo de indicação (FAREGE)', playbook: 'farege' },
  { id: 'varredura', label: 'Varredura e documentação', playbook: 'varredura' },
  { id: 'inteligencia_credito', label: 'Inteligência de crédito', playbook: 'inteligencia_credito' },
  { id: 'assessoria_mkt', label: 'Assessoria de marketing', playbook: 'assessoria_mkt' },
  { id: 'processo_vendas', label: 'Processo de vendas', playbook: 'processo_vendas' },
  { id: 'prazos', label: 'Prazos e SLAs', playbook: 'prazos_sla' },
  { id: 'comissao', label: 'Comissionamento e pagamentos', playbook: 'comissionamento' },
  { id: 'outros', label: 'Outros', playbook: null },
]

function Timer({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [startTime])
  if (!startTime) return null
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return (
    <span className="flex items-center gap-1.5 text-sm text-slate-500 font-mono">
      <Clock size={14} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}

export default function CondutorRPI() {
  const { id: parceiroId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [currentBlock, setCurrentBlock] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [rpiId, setRpiId] = useState<string | null>(null)

  // Block data
  const [duvidas, setDuvidas] = useState<Record<string, { checked: boolean; notes: string; resolved: boolean }>>({})
  const [duvidasOutras, setDuvidasOutras] = useState('')
  const [andamentoNotes, setAndamentoNotes] = useState('')
  const [indicacoesCompromisso, setIndicacoesCompromisso] = useState('')
  const [newLeads, setNewLeads] = useState<Array<{ nome_empresa: string; cnpj: string; demanda: string }>>([])
  const [newLeadForm, setNewLeadForm] = useState({ nome_empresa: '', cnpj: '', demanda: '' })

  // Action plan
  const [previousAcoes, setPreviousAcoes] = useState<Acao[]>([])
  const [previousAcoesStatus, setPreviousAcoesStatus] = useState<Record<string, string>>({})
  const [newAcoes, setNewAcoes] = useState<Array<{
    descricao: string; responsavel: Responsavel; prazo: string; prioridade: Prioridade; categoria: CategoriaAcao
  }>>([])
  const [acaoForm, setAcaoForm] = useState({ descricao: '', responsavel: 'Parceiro' as Responsavel, prazo: '', prioridade: 'média' as Prioridade, categoria: 'outro' as CategoriaAcao })

  // Finalization
  const [notasGerais, setNotasGerais] = useState('')
  const [proximaRPI, setProximaRPI] = useState('')
  const [showEntregaveis, setShowEntregaveis] = useState(false)
  const [entregavelTab, setEntregavelTab] = useState(0)
  const [finalizing, setFinalizing] = useState(false)

  const { getParceiro } = useParceiros()
  const { leads, createLead } = useLeads(parceiroId || '')
  const { rpis, createRPI, updateRPI } = useRPIs(parceiroId || '')
  const { getPendingAcoes, createAcao, updateAcao } = useAcoes({ parceiroId: parceiroId || '' })

  // Load parceiro data
  useEffect(() => {
    if (!parceiroId) return
    getParceiro(parceiroId).then((data) => {
      setParceiro(data)
    })
  }, [parceiroId, getParceiro])

  // Load previous pending actions
  useEffect(() => {
    if (!parceiroId) return
    getPendingAcoes(parceiroId).then((acoes) => {
      setPreviousAcoes(acoes)
      const statuses: Record<string, string> = {}
      acoes.forEach((a) => { statuses[a.id] = a.status })
      setPreviousAcoesStatus(statuses)
    })
  }, [parceiroId, getPendingAcoes])

  // Set default proxima RPI date (+45 days)
  useEffect(() => {
    if (!proximaRPI) {
      const d = new Date()
      d.setDate(d.getDate() + 45)
      setProximaRPI(d.toISOString().split('T')[0])
    }
  }, [proximaRPI])

  // Auto-save every 30s
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!rpiId) return
    autoSaveRef.current = setInterval(() => {
      updateRPI(rpiId, {
        bloco_duvidas: duvidas as unknown as Record<string, unknown>,
        bloco_andamento: { notes: andamentoNotes } as unknown as Record<string, unknown>,
        bloco_indicacoes: { compromisso: indicacoesCompromisso, newLeads } as unknown as Record<string, unknown>,
        notas_gerais: notasGerais,
      })
    }, 30000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [rpiId, duvidas, andamentoNotes, indicacoesCompromisso, newLeads, notasGerais, updateRPI])

  const startMeeting = async () => {
    setStartTime(Date.now())
    setCurrentBlock(2)
    // Create RPI record
    const rpi = await createRPI({
      parceiro_id: parceiroId!,
      data_reuniao: new Date().toISOString().split('T')[0],
      tipo: rpis.length === 0 ? 'primeira' : 'regular',
    })
    if (rpi) setRpiId(rpi.id)
  }

  const blockIndex = BLOCKS.findIndex((b) => b.id === currentBlock)
  const canGoBack = blockIndex > 0
  const canGoForward = blockIndex < BLOCKS.length - 1

  const goBack = () => { if (canGoBack) setCurrentBlock(BLOCKS[blockIndex - 1].id) }
  const goForward = () => { if (canGoForward) setCurrentBlock(BLOCKS[blockIndex + 1].id) }

  // Add new lead from Block 4
  const addNewLead = async () => {
    if (!newLeadForm.nome_empresa.trim()) return
    await createLead({
      nome_empresa: newLeadForm.nome_empresa,
      cnpj: newLeadForm.cnpj || null,
      demanda: newLeadForm.demanda ? Number(newLeadForm.demanda) : null,
      parceiro_id: parceiroId!,
    })
    setNewLeads((prev) => [...prev, { ...newLeadForm }])
    setNewLeadForm({ nome_empresa: '', cnpj: '', demanda: '' })
    toast.success('Lead adicionado ao pipeline!')
  }

  // Add new acao
  const addNewAcao = () => {
    if (!acaoForm.descricao.trim()) return
    setNewAcoes((prev) => [...prev, { ...acaoForm, prazo: acaoForm.prazo || proximaRPI }])
    setAcaoForm({ descricao: '', responsavel: 'Parceiro', prazo: '', prioridade: 'média', categoria: 'outro' })
  }

  // Generate deliverables text
  const allAcoes = [
    ...newAcoes,
    ...previousAcoes.filter((a) => previousAcoesStatus[a.id] === 'pendente' || previousAcoesStatus[a.id] === 'em_andamento'),
  ]

  const rpiData = {
    numero_sequencial: rpis.length + 1,
    data_reuniao: new Date().toISOString().split('T')[0],
    notas_gerais: notasGerais,
    proxima_rpi_prevista: proximaRPI,
  }

  const hubspotText = parceiro ? generateHubSpotText(parceiro, rpiData, allAcoes, leads, andamentoNotes) : ''
  const planoText = parceiro ? generatePlanoAcaoText(parceiro, rpiData, allAcoes) : ''
  const relatorioText = parceiro ? generateRelatorioText(parceiro, rpiData, leads, allAcoes) : ''

  // Finalize RPI
  const finalizarRPI = async () => {
    if (!rpiId || !parceiro) return
    setFinalizing(true)

    const activeLeads = leads.filter((l) => l.status === 'Ativo')
    const ponderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * l.probabilidade, 0)
    const totalDemanda = activeLeads.reduce((s, l) => s + (l.demanda || 0), 0)
    const duration = startTime ? Math.floor((Date.now() - startTime) / 60000) : null

    // Update RPI
    await updateRPI(rpiId, {
      status: 'finalizada',
      duracao_minutos: duration,
      notas_gerais: notasGerais,
      proxima_rpi_prevista: proximaRPI,
      snapshot_leads_total: activeLeads.length,
      snapshot_pipeline_total: totalDemanda,
      snapshot_pipeline_ponderado: ponderado,
      bloco_duvidas: duvidas as unknown as Record<string, unknown>,
      bloco_andamento: { notes: andamentoNotes } as unknown as Record<string, unknown>,
      bloco_indicacoes: { compromisso: indicacoesCompromisso } as unknown as Record<string, unknown>,
      plano_acao_texto: planoText,
      hubspot_texto: hubspotText,
      relatorio_texto: relatorioText,
    })

    // Create new acoes in DB
    for (const acao of newAcoes) {
      await createAcao({
        rpi_id: rpiId,
        parceiro_id: parceiroId!,
        descricao: acao.descricao,
        responsavel: acao.responsavel,
        prazo: acao.prazo || null,
        prioridade: acao.prioridade,
        categoria: acao.categoria,
      })
    }

    // Update status of previous acoes
    for (const [aId, status] of Object.entries(previousAcoesStatus)) {
      const original = previousAcoes.find((a) => a.id === aId)
      if (original && original.status !== status) {
        await updateAcao(aId, {
          status: status as Acao['status'],
          data_conclusao: status === 'concluida' ? new Date().toISOString().split('T')[0] : null,
        })
      }
    }

    toast.success('RPI finalizada com sucesso!')
    setFinalizing(false)
    navigate(`/parceiros/${parceiroId}`)
  }

  if (!parceiro) return <div className="text-center py-12 text-slate-400">Carregando...</div>

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(`/parceiros/${parceiroId}`)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} />
          Voltar ao Perfil
        </button>
        <div className="flex items-center gap-6">
          {/* Progress */}
          <div className="flex items-center gap-1">
            {BLOCKS.map((b, i) => (
              <button
                key={b.id}
                onClick={() => { if (startTime || b.id === 0) setCurrentBlock(b.id) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentBlock === b.id
                    ? 'bg-teal-500 text-white'
                    : blockIndex > i
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {blockIndex > i ? <Check size={12} /> : null}
                {b.label}
              </button>
            ))}
          </div>
          <Timer startTime={startTime} />
        </div>
      </div>

      {/* Block Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

        {/* BLOCK 0: Preparação */}
        {currentBlock === 0 && (() => {
          const proj = calculateRevenueProjection(parceiro)
          const activeLeads = leads.filter((l) => l.status === 'Ativo')
          return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Preparação — {parceiro.nome}</h2>
            <p className="text-sm text-slate-500">Revise as informações antes de iniciar a reunião.</p>

            {/* Revenue goal narrative */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>{parceiro.nome}</strong> quer gerar{' '}
                <strong className="text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}/mês</strong> em receita
                ({formatCurrency(proj.metaReceitaAnual)}/ano).
                Para isso, precisa indicar <strong>{proj.leadsNecessariosMensal} leads/mês</strong> e
                fechar <strong>{proj.clientesNecessariosMensal} clientes/mês</strong>.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Meta Receita/Mês</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Leads Necessários/Mês</p>
                <p className="text-xl font-bold text-slate-800">{proj.leadsNecessariosMensal}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Leads Ativos</p>
                <p className="text-xl font-bold text-slate-800">{activeLeads.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Pipeline</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(activeLeads.reduce((s, l) => s + (l.demanda || 0), 0))}</p>
              </div>
            </div>

            {previousAcoes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Ações Pendentes da Última RPI</h3>
                <ActionList acoes={previousAcoes} readOnly />
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={startMeeting}
                className="inline-flex items-center gap-2 px-8 py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors text-lg"
              >
                <Play size={20} />
                Iniciar Reunião
              </button>
            </div>
          </div>
          )
        })()}

        {/* BLOCK 2: Dúvidas e Dificuldades */}
        {currentBlock === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Dúvidas e Dificuldades</h2>
            <p className="text-sm text-slate-500">Registre dúvidas discutidas com o parceiro.</p>

            <div className="space-y-3">
              {DUVIDAS_CHECKLIST.map((item) => {
                const d = duvidas[item.id] || { checked: false, notes: '', resolved: true }
                return (
                  <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setDuvidas((prev) => ({
                        ...prev,
                        [item.id]: { ...d, checked: !d.checked },
                      }))}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${d.checked ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>
                        {d.checked && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </button>
                    {d.checked && (
                      <div className="px-4 pb-4 space-y-2">
                        <textarea
                          placeholder="Detalhes da dúvida e resolução..."
                          value={d.notes}
                          onChange={(e) => setDuvidas((prev) => ({ ...prev, [item.id]: { ...d, notes: e.target.value } }))}
                          rows={2}
                          className={inputCls}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={!d.resolved}
                            onChange={(e) => setDuvidas((prev) => ({ ...prev, [item.id]: { ...d, resolved: !e.target.checked } }))}
                            className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                          />
                          Requer ação posterior (será adicionado ao plano de ação)
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Outras dúvidas/dificuldades</label>
              <textarea value={duvidasOutras} onChange={(e) => setDuvidasOutras(e.target.value)} rows={3} className={inputCls} placeholder="Notas livres..." />
            </div>
          </div>
        )}

        {/* BLOCK 3: Andamento das Operações */}
        {currentBlock === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Andamento das Operações</h2>

            {/* Summary */}
            <div className="flex gap-4">
              {ETAPAS_FUNIL.map((etapa) => {
                const count = leads.filter((l) => l.etapa === etapa && l.status === 'Ativo').length
                return (
                  <div key={etapa} className="bg-slate-50 rounded-lg px-3 py-2 text-center flex-1">
                    <p className="text-lg font-bold text-slate-800">{count}</p>
                    <p className="text-xs text-slate-500 truncate">{etapa}</p>
                  </div>
                )
              })}
            </div>

            <PipelineKanban leads={leads} readOnly />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pontos discutidos sobre operações</label>
              <textarea value={andamentoNotes} onChange={(e) => setAndamentoNotes(e.target.value)} rows={4} className={inputCls} placeholder="Resumo das discussões..." />
            </div>
          </div>
        )}

        {/* BLOCK 4: Futuras Indicações */}
        {currentBlock === 4 && (() => {
          const proj = calculateRevenueProjection(parceiro)
          return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Futuras Indicações</h2>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-sm text-slate-700">
                Para atingir <strong className="text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}/mês</strong>,
                você precisa indicar <strong>{proj.leadsNecessariosMensal} leads/mês</strong>.
              </p>
              <p className="text-sm text-teal-700 mt-2">Leads indicados nesta RPI: <strong>{newLeads.length}</strong></p>
            </div>

            {/* Quick add form */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Adicionar nova indicação</h3>
              <div className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="Nome da empresa *" value={newLeadForm.nome_empresa} onChange={(e) => setNewLeadForm((f) => ({ ...f, nome_empresa: e.target.value }))} className={inputCls} />
                <input type="text" placeholder="CNPJ (opcional)" value={newLeadForm.cnpj} onChange={(e) => setNewLeadForm((f) => ({ ...f, cnpj: e.target.value }))} className={inputCls} />
                <input type="number" placeholder="Demanda (R$)" value={newLeadForm.demanda} onChange={(e) => setNewLeadForm((f) => ({ ...f, demanda: e.target.value }))} className={inputCls} />
              </div>
              <button onClick={addNewLead} disabled={!newLeadForm.nome_empresa.trim()} className="inline-flex items-center gap-1 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50">
                <Plus size={16} />
                Adicionar Lead
              </button>
            </div>

            {newLeads.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Leads adicionados nesta RPI</h3>
                <div className="space-y-2">
                  {newLeads.map((l, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2 text-sm">
                      <span className="font-medium text-slate-700">{l.nome_empresa}</span>
                      {l.demanda && <span className="text-slate-500">{formatCurrency(Number(l.demanda))}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compromisso do parceiro para próximo período</label>
              <textarea value={indicacoesCompromisso} onChange={(e) => setIndicacoesCompromisso(e.target.value)} rows={3} className={inputCls} placeholder='Ex: "Vai indicar 5 empresas da região de Limeira"' />
            </div>
          </div>
          )
        })()}

        {/* BLOCK 5: Plano de Ação */}
        {currentBlock === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Plano de Ação</h2>

            {/* Previous actions */}
            {previousAcoes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Ações da RPI Anterior</h3>
                <div className="space-y-2">
                  {previousAcoes.map((acao) => (
                    <div key={acao.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{acao.descricao}</p>
                        <p className="text-xs text-slate-500">{acao.responsavel} • {acao.prazo ? formatDate(acao.prazo) : 'Sem prazo'}</p>
                      </div>
                      <select
                        value={previousAcoesStatus[acao.id] || acao.status}
                        onChange={(e) => setPreviousAcoesStatus((prev) => ({ ...prev, [acao.id]: e.target.value }))}
                        className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
                      >
                        <option value="concluida">Concluída</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="pendente">Pendente (herdar)</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New action form */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Nova Ação</h3>
              <input type="text" placeholder="Descrição da ação *" value={acaoForm.descricao} onChange={(e) => setAcaoForm((f) => ({ ...f, descricao: e.target.value }))} className={inputCls} />
              <div className="grid grid-cols-4 gap-3">
                <select value={acaoForm.responsavel} onChange={(e) => setAcaoForm((f) => ({ ...f, responsavel: e.target.value as Responsavel }))} className={inputCls}>
                  <option value="Parceiro">Parceiro</option>
                  <option value="Gerente">Gerente</option>
                  <option value="Ambos">Ambos</option>
                </select>
                <input type="date" value={acaoForm.prazo} onChange={(e) => setAcaoForm((f) => ({ ...f, prazo: e.target.value }))} className={inputCls} />
                <select value={acaoForm.prioridade} onChange={(e) => setAcaoForm((f) => ({ ...f, prioridade: e.target.value as Prioridade }))} className={inputCls}>
                  <option value="alta">Alta</option>
                  <option value="média">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
                <select value={acaoForm.categoria} onChange={(e) => setAcaoForm((f) => ({ ...f, categoria: e.target.value as CategoriaAcao }))} className={inputCls}>
                  <option value="indicação">Indicação</option>
                  <option value="documentação">Documentação</option>
                  <option value="treinamento">Treinamento</option>
                  <option value="processo">Processo</option>
                  <option value="relacionamento">Relacionamento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <button onClick={addNewAcao} disabled={!acaoForm.descricao.trim()} className="inline-flex items-center gap-1 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50">
                <Plus size={16} />
                Adicionar Ação
              </button>
            </div>

            {/* New actions list */}
            {newAcoes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Novas Ações ({newAcoes.length})</h3>
                <div className="space-y-2">
                  {newAcoes.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{a.descricao}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-700">{a.responsavel}</span>
                          <span className="text-xs text-slate-500">{a.prazo ? formatDate(a.prazo) : 'Sem prazo'}</span>
                          <span className="text-xs text-slate-400">{a.prioridade}</span>
                        </div>
                      </div>
                      <button onClick={() => setNewAcoes((prev) => prev.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BLOCK 6: Finalização */}
        {currentBlock === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Finalização</h2>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-teal-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-teal-700">{newLeads.length}</p>
                <p className="text-xs text-teal-600">Leads adicionados</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{newAcoes.length}</p>
                <p className="text-xs text-blue-600">Ações definidas</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-violet-700">
                  {Object.values(duvidas).filter((d) => d.checked).length}
                </p>
                <p className="text-xs text-violet-600">Tópicos discutidos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Próxima RPI prevista</label>
                <input type="date" value={proximaRPI} onChange={(e) => setProximaRPI(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas gerais da reunião</label>
              <textarea value={notasGerais} onChange={(e) => setNotasGerais(e.target.value)} rows={4} className={inputCls} placeholder="Observações gerais..." />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEntregaveis(true)}
                className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
              >
                Gerar Entregáveis
              </button>
              <button
                onClick={finalizarRPI}
                disabled={finalizing}
                className="px-6 py-3 bg-teal-500 text-white font-medium rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors"
              >
                {finalizing ? 'Finalizando...' : 'Finalizar RPI'}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {currentBlock !== 0 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <button onClick={goBack} disabled={!canGoBack} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-30">
              <ArrowLeft size={16} />
              Anterior
            </button>
            {canGoForward && (
              <button onClick={goForward} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700">
                Próximo
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Entregáveis Modal */}
      {showEntregaveis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Entregáveis</h2>
              <button onClick={() => setShowEntregaveis(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {['Plano de Ação', 'Relatório de Status', 'Texto HubSpot'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setEntregavelTab(i)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    entregavelTab === i ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <EntregavelFormatado
                tipo={entregavelTab === 0 ? 'plano' : entregavelTab === 1 ? 'relatorio' : 'hubspot'}
                parceiro={parceiro}
                rpiData={rpiData}
                acoes={allAcoes}
                leads={leads}
                discussionNotes={andamentoNotes}
              />
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end">
              <CopyButton
                text={entregavelTab === 0 ? planoText : entregavelTab === 1 ? relatorioText : hubspotText}
                label="Copiar para clipboard"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
