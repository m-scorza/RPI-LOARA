import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Clock, Check, X, Plus, ChevronRight, HelpCircle, BookOpen, Activity, Target, Zap, Layout as LayoutIcon, ClipboardList, Flag, Users, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useParceiros } from '../hooks/useParceiros'
import { useLeads } from '../hooks/useLeads'
import { useRPIs } from '../hooks/useRPIs'
import { useAcoes } from '../hooks/useAcoes'
import { usePlaybooks } from '../hooks/usePlaybooks'
import { formatCurrency, formatDate } from '../lib/format'
import { generateHubSpotText, generatePlanoAcaoText, generateRelatorioText } from '../lib/generators'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import type { Parceiro, Lead, Acao, Responsavel, Prioridade, CategoriaAcao, FunilVendasSnapshot, Playbook } from '../types/database'
import { ETAPAS_FUNIL } from '../types/database'
import PipelineKanban from '../components/PipelineKanban'
import ActionList from '../components/ActionList'
import CopyButton from '../components/CopyButton'
import EntregavelFormatado from '../components/EntregavelFormatado'
import PlaybookViewer from '../components/PlaybookViewer'
import FunilVendas from '../components/FunilVendas'

interface Block {
  id: string
  label: string
  playbook?: Playbook
}

function buildBlocks(
  duvidas: Record<string, { checked: boolean; notes: string; resolved: boolean }>,
  playbooks: Playbook[],
): Block[] {
  const base: Block[] = [
    { id: 'prep', label: 'Preparação' },
    { id: 'duvidas', label: 'Dúvidas' },
  ]

  // Insert playbook blocks for checked topics
  const playbookBlocks: Block[] = []
  for (const t of DUVIDAS_CHECKLIST) {
    if (duvidas[t.id]?.checked && t.playbook) {
      const pb = playbooks.find((p) => p.slug === t.playbook)
      if (pb) {
        playbookBlocks.push({ id: `playbook_${pb.slug}`, label: pb.titulo, playbook: pb })
      } else {
        // Placeholder for missing playbook
        playbookBlocks.push({ 
          id: `pb_missing_${t.playbook}`, 
          label: 'Playbook não disponível', 
          playbook: { 
            id: `missing_${t.playbook}`,
            slug: t.playbook,
            titulo: 'Playbook não carregado',
            descricao: `O conteúdo para o playbook "${t.playbook}" não foi encontrado.`,
            conteudo: [{ tipo: 'alerta', titulo: 'Indisponível', corpo: 'Este playbook ainda não foi configurado no sistema.' }],
            categoria: 'aviso',
            ativo: true,
            ordem: 99,
          } as Playbook
        })
      }
    }
  }

  const rest: Block[] = [
    { id: 'andamento', label: 'Andamento' },
    { id: 'funil_vendas', label: 'Funil de Vendas' },
    { id: 'indicacoes', label: 'Indicações' },
    { id: 'comissoes', label: 'Comissões' },
    { id: 'plano_acao', label: 'Plano de Ação' },
    { id: 'finalizacao', label: 'Finalização' },
  ]

  return [...base, ...playbookBlocks, ...rest]
}

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
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Ao Vivo</span>
      </div>
      <div className="w-[1px] h-4 bg-slate-800" />
      <span className="flex items-center gap-2 text-sm text-white font-black font-mono tracking-tighter">
        <Clock size={14} className="text-slate-400" />
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  )
}

export default function CondutorRPI() {
  const { id: parceiroId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [currentBlockId, setCurrentBlockId] = useState('prep')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [rpiId, setRpiId] = useState<string | null>(null)
  const [rpiNum, setRpiNum] = useState<number | null>(null)

  // Funil de vendas state
  const [funilRitmo, setFunilRitmo] = useState(1)
  const [funilSnapshot, setFunilSnapshot] = useState<FunilVendasSnapshot | null>(null)

  // Block data
  const [duvidas, setDuvidas] = useState<Record<string, { checked: boolean; notes: string; resolved: boolean }>>({})
  const [duvidasOutras, setDuvidasOutras] = useState('')
  const [andamentoNotes, setAndamentoNotes] = useState('')
  const [indicacoesCompromisso, setIndicacoesCompromisso] = useState('')
  const [newLeads, setNewLeads] = useState<Lead[]>([])
  const [newLeadForm, setNewLeadForm] = useState({ nome_empresa: '', cnpj: '', demanda: '', dentro_farege: true })

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
  const { leads, createLead, moveLead } = useLeads(parceiroId || '')
  const { rpis, createRPI, updateRPI } = useRPIs(parceiroId || '')
  const { getPendingAcoes, createAcao, updateAcao } = useAcoes({ parceiroId: parceiroId || '' })
  const { playbooks } = usePlaybooks()

  // S0-4: Toast if playbooks not loaded
  useEffect(() => {
    if (playbooks.length === 0) {
      toast.warning('Playbooks não carregados.')
    }
  }, [playbooks])

  // Dynamic blocks based on checked dúvidas
  const blocks = useMemo(() => buildBlocks(duvidas, playbooks), [duvidas, playbooks])
  const blockIndex = blocks.findIndex((b: Block) => b.id === currentBlockId)
  const currentBlock = blocks[blockIndex] || blocks[0]
  const canGoBack = blockIndex > 0
  const canGoForward = blockIndex < blocks.length - 1

  const goBack = () => { if (canGoBack) setCurrentBlockId(blocks[blockIndex - 1].id) }
  const goForward = () => { if (canGoForward) setCurrentBlockId(blocks[blockIndex + 1].id) }

  const handleFunilRitmoChange = useCallback((ritmo: number, snapshot: FunilVendasSnapshot) => {
    setFunilRitmo(ritmo)
    setFunilSnapshot(snapshot)
  }, [])

  // Load parceiro data
  useEffect(() => {
    if (!parceiroId) return
    getParceiro(parceiroId).then((data: Parceiro | null) => {
      setParceiro(data)
    })
  }, [parceiroId, getParceiro])

  // Load previous pending actions
  useEffect(() => {
    if (!parceiroId) return
    getPendingAcoes(parceiroId).then((acoes: Acao[]) => {
      setPreviousAcoes(acoes)
      const statuses: Record<string, string> = {}
      acoes.forEach((a: Acao) => { statuses[a.id] = a.status })
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
    if (parceiro?.categoria === 'Bronze') {
      toast.error('Parceiros Bronze não podem realizar RPIs.')
      navigate(`/parceiros/${parceiroId}`)
      return
    }
    try {
      // Create RPI record
      const rpi = await createRPI({
        parceiro_id: parceiroId!,
        data_reuniao: new Date().toISOString().split('T')[0],
        tipo: rpis.length === 0 ? 'primeira' : 'regular',
      })
      
      if (!rpi) {
        toast.error('Erro ao iniciar RPI. Tente novamente.')
        return
      }

      setRpiId(rpi.id)
      setRpiNum(rpi.numero_sequencial)
      setStartTime(Date.now())
      setCurrentBlockId('duvidas')
    } catch (error) {
      console.error('Error starting meeting:', error)
      toast.error('Ocorreu um erro ao iniciar a sessão.')
    }
  }

  // Add new lead from Block 4
  const addNewLead = async () => {
    if (!newLeadForm.nome_empresa.trim()) return
    try {
      const result = await createLead({
        nome_empresa: newLeadForm.nome_empresa,
        cnpj: newLeadForm.cnpj || null,
        demanda: newLeadForm.demanda ? Number(newLeadForm.demanda) : null,
        parceiro_id: parceiroId!,
        dentro_farege: newLeadForm.dentro_farege,
      })

      if (!result) {
        toast.error('Erro ao salvar lead.')
        return
      }

      setNewLeads((prev) => [...prev, result])
      setNewLeadForm({ nome_empresa: '', cnpj: '', demanda: '', dentro_farege: true })
      toast.success('Lead adicionado ao pipeline!')
    } catch (error) {
      console.error('Error adding lead:', error)
      toast.error('Ocorreu um erro ao salvar o lead.')
    }
  }

  // Add new acao
  const addNewAcao = () => {
    if (!acaoForm.descricao.trim()) return
    setNewAcoes((prev: Partial<Acao>[]) => [...prev, { ...acaoForm, prazo: acaoForm.prazo || proximaRPI }])
    setAcaoForm({ descricao: '', responsavel: 'Parceiro', prazo: '', prioridade: 'média', categoria: 'outro' })
  }

  // Generate deliverables text
  const allAcoes = [
    ...newAcoes,
    ...previousAcoes.filter((a: Acao) => previousAcoesStatus[a.id] === 'pendente' || previousAcoesStatus[a.id] === 'em_andamento'),
  ]

  const rpiData = {
    numero_sequencial: rpiNum || rpis.length + 1,
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

    const activeLeads = leads.filter((l: Lead) => l.status === 'Ativo')
    const ponderado = activeLeads.reduce((s: number, l: Lead) => s + (l.demanda || 0) * (l.probabilidade || 0), 0)
    const totalDemanda = activeLeads.reduce((s: number, l: Lead) => s + (l.demanda || 0), 0)
    const duration = startTime ? Math.floor((Date.now() - startTime) / 60000) : null

    // Collect used playbook slugs
    const playbooksUsados = DUVIDAS_CHECKLIST
      .filter((t: any) => duvidas[t.id]?.checked && t.playbook)
      .map((t: any) => t.playbook!)

    try {
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
        funil_vendas_ritmo: funilRitmo,
        funil_vendas_snapshot: funilSnapshot,
        playbooks_usados: playbooksUsados,
        plano_acao_texto: planoText,
        hubspot_texto: hubspotText,
        relatorio_texto: relatorioText,
      })

      // Create new acoes in DB
      const acaoPromises = newAcoes.map(acao => createAcao({
        rpi_id: rpiId,
        parceiro_id: parceiroId!,
        descricao: acao.descricao,
        responsavel: acao.responsavel,
        prazo: acao.prazo || null,
        prioridade: acao.prioridade,
        categoria: acao.categoria,
      }))

      // Update status of previous acoes
      const updatePromises = Object.entries(previousAcoesStatus).map(([aId, status]) => {
        const original = previousAcoes.find((a: Acao) => a.id === aId)
        if (original && original.status !== status) {
          return updateAcao(aId, {
            status: status as Acao['status'],
            data_conclusao: status === 'concluida' ? new Date().toISOString().split('T')[0] : null,
          })
        }
        return Promise.resolve()
      })

      const results = await Promise.allSettled([...acaoPromises, ...updatePromises])
      const hasErrors = results.some(r => r.status === 'rejected')
      
      if (hasErrors) {
        toast.warning('Algumas ações não foram salvas. Verifique e tente novamente.')
      } else {
        toast.success('RPI finalizada com sucesso!')
      }
      
      setFinalizing(false)
      navigate(`/parceiros/${parceiroId}`)
    } catch (error) {
      console.error('Error finalizing RPI:', error)
      toast.error('Erro ao finalizar RPI. Verifique sua conexão.')
      setFinalizing(false)
    }
  }

  if (!parceiro) return <div className="text-center py-12 text-slate-400">Carregando...</div>

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(`/parceiros/${parceiroId}`)} 
              className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 hover:shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sessão Estratégica</h2>
              <p className="text-lg font-black text-slate-800 tracking-tight leading-none mt-0.5">{parceiro.nome}</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {/* Steps Indicator */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {blocks.map((b: Block, i: number) => (
                  <button
                    key={b.id}
                    onClick={() => { if (startTime || b.id === 'prep') setCurrentBlockId(b.id) }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      currentBlock.id === b.id
                        ? 'bg-[#0F172A] text-white shadow-md'
                        : blockIndex > i
                        ? 'text-teal-600 hover:bg-teal-50'
                        : 'text-slate-400 opacity-60'
                    }`}
                  >
                  {blockIndex > i && <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 text-white rounded-full flex items-center justify-center border-2 border-white"><Check size={8} /></div>}
                  {b.playbook && <BookOpen size={12} className={currentBlock.id === b.id ? 'text-violet-400' : 'text-violet-500'} />}
                  <span className="hidden xl:inline">{b.label}</span>
                  {currentBlock.id === b.id && <span className="xl:hidden">{b.label}</span>}
                </button>
              ))}
            </div>
          </div>

          <Timer startTime={startTime} />
        </div>
      </div>

      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto animate-fade-in pb-24">

        {/* BLOCK: Preparação */}
        {currentBlock.id === 'prep' && (() => {
          const proj = calculateRevenueProjection(parceiro!)
          const activeLeads = leads.filter((l: Lead) => l.status === 'Ativo')
          return (
            <div className="space-y-10 max-w-4xl mx-auto">
              <div className="space-y-2 text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Preparação Estratégica</h3>
                <div className="flex items-center justify-center gap-4">
                   <p className="text-slate-500 font-medium tracking-tight">Revise as metas e o histórico antes de iniciar a sessão com {parceiro.nome}.</p>
                   {funilRitmo >= 1 && (
                     <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saúde: Engajado</span>
                     </div>
                   )}
                </div>
              </div>

              {/* Revenue goal narrative */}
              <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm group-hover:shadow-md transition-all duration-300">
                  <div className="flex items-start gap-6">
                    <div className="p-4 bg-teal-50 rounded-2xl text-teal-600">
                      <Target size={28} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-2 leading-none">Visão do Parceiro</h4>
                      <p className="text-xl font-medium text-slate-700 leading-relaxed tracking-tight">
                        A meta é gerar <strong className="text-slate-900 font-black">{formatCurrency(proj.metaReceitaMensal)}/mês</strong> em receita.
                        Para isso, o parceiro deve focar em indicar <strong className="text-slate-900 font-black">{proj.leadsNecessariosMensal} novos leads</strong> para converter <strong className="text-slate-900 font-black">{proj.clientesNecessariosMensal} novos clientes</strong> a cada ciclo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Meta Mensal', value: formatCurrency(proj.metaReceitaMensal), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Leads/Mês', value: proj.leadsNecessariosMensal, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Leads Ativos', value: activeLeads.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Pipeline Total', value: formatCurrency(activeLeads.reduce((s: number, l: Lead) => s + (l.demanda || 0), 0)), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i: number) => (
                  <div key={i} className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <stat.icon size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>

              {previousAcoes.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600">
                      <ClipboardList size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ações Pendentes</h3>
                  </div>
                  <ActionList acoes={previousAcoes} readOnly />
                </div>
              )}

              <div className="flex justify-center pt-6">
                <button
                  onClick={startMeeting}
                  className="group relative inline-flex items-center gap-3 px-12 py-5 bg-[#0F172A] text-white font-black rounded-[2rem] hover:bg-slate-800 transition-all shadow-xl hover:shadow-slate-200 active:scale-95"
                >
                  <Play size={20} className="fill-white" />
                  <span className="uppercase tracking-[0.15em] text-xs">Iniciar RPI</span>
                </button>
              </div>
            </div>
          )
        })()}

        {/* BLOCK: Dúvidas e Dificuldades */}
        {currentBlock.id === 'duvidas' && (
          <div className="space-y-10 max-w-4xl mx-auto">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dúvidas e Barreiras</h2>
              <p className="text-slate-500 font-medium">Selecione os temas que geram maior dificuldade para o parceiro hoje.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DUVIDAS_CHECKLIST.map((item: any) => {
                const d = duvidas[item.id] || { checked: false, notes: '', resolved: true }
                return (
                  <div 
                    key={item.id} 
                    className={`relative group p-6 rounded-3xl border transition-all duration-300 ${
                      d.checked 
                        ? 'bg-white border-teal-500/30 shadow-md ring-4 ring-teal-500/5' 
                        : 'bg-white/50 border-slate-100 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <label className="flex items-start gap-4 cursor-pointer">
                      <div className="relative mt-1">
                        <input
                          type="checkbox"
                          checked={d.checked}
                          onChange={() => setDuvidas((prev: any) => ({
                            ...prev,
                            [item.id]: { ...d, checked: !d.checked },
                          }))}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                          d.checked ? 'bg-teal-500 border-teal-500 scale-110 shadow-lg' : 'bg-white border-slate-200'
                        }`}>
                          {d.checked && <Check size={14} className="text-white font-black" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-black transition-colors ${d.checked ? 'text-slate-800' : 'text-slate-600'}`}>
                          {item.label}
                        </span>
                        {item.playbook && (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[9px] font-black uppercase tracking-widest">
                            <BookOpen size={10} /> Playbook
                          </div>
                        )}
                        
                        {d.checked && (
                          <div className="mt-4 space-y-4 animate-fade-in">
                            <textarea
                              placeholder="Notas sobre a dificuldade e resolução..."
                              value={d.notes}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDuvidas((prev: any) => ({ ...prev, [item.id]: { ...d, notes: e.target.value } }))}
                              rows={2}
                              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                            />
                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                setDuvidas((prev: any) => ({ ...prev, [item.id]: { ...d, resolved: !d.resolved } }))
                              }}
                              className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                                !d.resolved 
                                  ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-500/20' 
                                  : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Flag size={12} />
                              {!d.resolved ? 'Ação Necessária' : 'Resolvido no Ato'}
                            </button>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
              <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                <Activity size={14} /> Notas Adicionais
              </label>
              <textarea 
                value={duvidasOutras} 
                onChange={(e) => setDuvidasOutras(e.target.value)} 
                rows={3} 
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all placeholder-slate-600"
                placeholder="Exemplo: Parceiro comentou sobre nova estratégia de expansão..." 
              />
            </div>
          </div>
        )}

        {/* BLOCK: Playbook */}
        {currentBlock.playbook && (
          <PlaybookViewer playbook={currentBlock.playbook} onComplete={goForward} />
        )}

        {/* BLOCK: Andamento das Operações */}
        {currentBlock.id === 'andamento' && (
          <div className="space-y-10 max-w-6xl mx-auto">
            <div className="flex items-end justify-between border-b border-slate-100 pb-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Status das Operações</h2>
                <div className="flex items-center gap-4">
                  <p className="text-slate-500 font-medium">Pipeline atual e análise visual das etapas.</p>
                  {leads.filter(l => l.status === 'Ativo').length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-600 rounded-full border border-violet-100 ring-4 ring-violet-500/5">
                      <span className="text-[10px] font-black uppercase tracking-widest">Conformidade FAREGE:</span>
                      <span className="text-xs font-black">
                        {Math.round((leads.filter(l => l.status === 'Ativo' && l.dentro_farege).length / leads.filter(l => l.status === 'Ativo').length) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {ETAPAS_FUNIL.map((etapa: string) => {
                  const count = leads.filter((l: Lead) => l.etapa === etapa && l.status === 'Ativo').length
                  return (
                    <div key={etapa} className="bg-white border border-slate-100 rounded-2xl px-4 py-2 text-center min-w-[100px] shadow-sm">
                      <p className="text-lg font-black text-slate-800 leading-tight">{count}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{etapa}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-4 shadow-sm overflow-hidden">
              <PipelineKanban 
                leads={leads.filter(l => l.status === 'Ativo')} 
                onMove={async (id, etapa) => {
                  const lead = leads.find(l => l.id === id)
                  if (lead) await moveLead(id, etapa)
                }}
              />
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
              <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                <ClipboardList size={14} /> Insights da Discussão
              </label>
              <textarea 
                value={andamentoNotes} 
                onChange={(e) => setAndamentoNotes(e.target.value)} 
                rows={4} 
                className="w-full bg-white border border-slate-200 rounded-3xl px-6 py-5 text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm font-medium"
                placeholder="Registre pontos específicos discutidos sobre leads em andamento..." 
              />
            </div>
          </div>
        )}

        {/* BLOCK: Funil de Vendas */}
        {currentBlock.id === 'funil_vendas' && (
          <FunilVendas
            parceiro={parceiro}
            ritmoInicial={funilRitmo}
            onRitmoChange={handleFunilRitmoChange}
          />
        )}

        {/* BLOCK: Futuras Indicações */}
        {currentBlock.id === 'indicacoes' && (() => {
          const proj = calculateRevenueProjection(parceiro)
          return (
            <div className="space-y-10 max-w-4xl mx-auto">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Expansão do Pipeline</h2>
                <p className="text-slate-500 font-medium">Adicione novas oportunidades identificadas durante a sessão.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-[#0F172A] to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <Target size={120} />
                  </div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Eficiência de Indicações</h3>
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-tighter text-teal-400">{newLeads.length}</span>
                      <span className="text-sm font-medium text-slate-400 leading-none">novos leads nesta sessão</span>
                    </div>
                    <div className="h-[1px] bg-slate-700 w-full" />
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      O parceiro precisa de <strong className="text-white">{proj.leadsNecessariosMensal} leads/mês</strong> 
                      para manter o ritmo de crescimento desejado.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-4">
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Empresa *" 
                      value={newLeadForm.nome_empresa} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeadForm((f: any) => ({ ...f, nome_empresa: e.target.value }))} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="CNPJ" 
                        value={newLeadForm.cnpj} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeadForm((f: any) => ({ ...f, cnpj: e.target.value }))} 
                        className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm"
                      />
                      <input 
                        type="number" 
                        placeholder="Demanda R$" 
                        value={newLeadForm.demanda} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeadForm((f: any) => ({ ...f, demanda: e.target.value }))} 
                        className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-3 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                      <input 
                        type="checkbox" 
                        checked={newLeadForm.dentro_farege}
                        onChange={(e) => setNewLeadForm((f: any) => ({ ...f, dentro_farege: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Processo FAREGE</span>
                    </label>
                  </div>
                  <button 
                    onClick={addNewLead} 
                    disabled={!newLeadForm.nome_empresa.trim()} 
                    className="w-full flex items-center justify-center gap-2 py-4 bg-teal-500 text-white font-black rounded-2xl hover:bg-teal-600 shadow-lg shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-widest text-xs"
                  >
                    <Plus size={16} /> Adicionar ao Pitch
                  </button>
                </div>
              </div>

              {newLeads.length > 0 && (
                <div className="animate-fade-in group">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Activity size={12} /> Recentemente Adicionados
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {newLeads.map((l: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm hover:border-teal-500/30 transition-all group/item">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover/item:bg-teal-50 group-hover/item:text-teal-500 transition-colors">
                            <LayoutIcon size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-slate-800 tracking-tight">{l.nome_empresa}</p>
                              {l.dentro_farege && <span className="text-[8px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 uppercase tracking-widest">FAREGE</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">{l.cnpj || 'Sem CNPJ'}</p>
                          </div>
                        </div>
                        {l.demanda && <span className="text-xs font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg">{formatCurrency(Number(l.demanda))}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 rounded-[2.5rem] p-8 mt-12">
                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  <Flag size={14} /> Compromisso de Prospecção
                </label>
                <textarea 
                  value={indicacoesCompromisso} 
                  onChange={(e) => setIndicacoesCompromisso(e.target.value)} 
                  rows={3} 
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-6 py-5 text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all font-medium placeholder-slate-600"
                  placeholder='Defina o próximo passo... Ex: "Mapear top 5 players de agronegócio na região"' 
                />
              </div>
            </div>
          )
        })()}

        {/* BLOCK: Comissões */}
        {currentBlock.id === 'comissoes' && (() => {
          const taxaLoara = parceiro.taxa_loara || 0.06
          const loaraNet = taxaLoara * 0.78
          const share = parceiro.categoria === 'Ouro' ? 0.40 : 0.30
          const sharePonderado = loaraNet * share
          
          const comissaoLiq = sharePonderado * (1 - (parceiro.imposto_comissao || 0.2138))
          const activeLeads = leads.filter(l => l.status === 'Ativo')
          
          const pipelinePonderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * (l.probabilidade || 0) * comissaoLiq, 0)
          const pipelineTotal = activeLeads.reduce((s, l) => s + (l.demanda || 0) * comissaoLiq, 0)
          
          return (
            <div className="space-y-10 max-w-4xl mx-auto">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Comissões e Resultados</h2>
                <p className="text-slate-500 font-medium">Transparência total sobre a régua de ganhos da parceria.</p>
              </div>

              {/* Logical Chain Display */}
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-2 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-transparent pointer-events-none" />
                
                <div className="bg-slate-800/50 rounded-[2rem] p-6 text-center border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Taxa Loara</p>
                  <p className="text-2xl font-black text-white">{(taxaLoara * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-600 font-medium mt-1">Margem Gross</p>
                </div>

                <div className="bg-slate-800/50 rounded-[2rem] p-6 text-center border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Loara Net (78%)</p>
                  <p className="text-2xl font-black text-blue-400">{(loaraNet * 100).toFixed(2)}%</p>
                  <p className="text-[10px] text-slate-600 font-medium mt-1">Pós-Impostos</p>
                </div>

                <div className="bg-teal-500/10 rounded-[2rem] p-6 text-center border border-teal-500/20">
                  <p className="text-[9px] font-black text-teal-500 uppercase tracking-widest mb-1">Sua Parte ({ (share * 100).toFixed(0) }%)</p>
                  <p className="text-2xl font-black text-teal-400">{(sharePonderado * 100).toFixed(3)}%</p>
                  <p className="text-[10px] text-teal-600/50 font-medium mt-1">Comissão Bruta Partner</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Historico */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Clock size={12} /> Histórico de Ganhos
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-end gap-2 h-32 pt-4">
                      {[35, 45, 30, 60, 40, 55].map((h, i) => (
                        <div key={i} className="flex-1 bg-slate-50 rounded-lg relative group overflow-hidden">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-teal-500/20 group-hover:bg-teal-500/40 transition-all" 
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <span>Out</span><span>Nov</span><span>Dez</span><span>Jan</span><span>Fev</span><span>Mar</span>
                    </div>
                  </div>
                </div>

                {/* Projeção */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <TrendingUp size={100} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 relative z-10">Projeção de Pipeline</h3>
                  <div className="space-y-8 relative z-10">
                    <div>
                      <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1">Ganhos em Potencial</p>
                      <p className="text-3xl font-black tracking-tighter">{formatCurrency(pipelineTotal)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ganhos Prováveis</p>
                        <p className="text-xl font-black text-teal-400 tracking-tight">{formatCurrency(pipelinePonderado)}</p>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" 
                          style={{ width: `${(pipelinePonderado / (pipelineTotal || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
                <div className="text-amber-500 shrink-0"><AlertCircle size={20} /></div>
                <div>
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Aviso Legal</h4>
                  <p className="text-xs font-medium text-amber-900/60 leading-relaxed">
                    Os valores acima são estimativas baseadas no seu pipeline atual e taxas de fechamento. O recebimento efetivo depende da aprovação e liquidação das operações pelo comitê de crédito.
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {currentBlock.id === 'plano_acao' && (
          <div className="space-y-10 max-w-4xl mx-auto">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Plano de Execução</h2>
              <p className="text-slate-500 font-medium">Defina as próximas missões e atualize as pendentes.</p>
            </div>

            {/* Previous actions */}
            {previousAcoes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity size={12} /> Ações Herdeiras
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {previousAcoes.map((acao: Acao) => (
                    <div key={acao.id} className="group flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 tracking-tight">{acao.descricao}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">
                          {acao.responsavel} • {acao.prazo ? formatDate(acao.prazo) : 'Sem prazo'}
                        </p>
                      </div>
                      <select
                        value={previousAcoesStatus[acao.id] || acao.status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreviousAcoesStatus((prev: any) => ({ ...prev, [acao.id]: e.target.value }))}
                        className="text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100 px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer"
                      >
                        <option value="concluida">Concluída</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="pendente">Pendente</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sugestões Contextuais */}
            {(() => {
              const unresolved = Object.entries(duvidas).filter(([_, d]) => d.checked && !d.resolved)
              const needsRitmo = (funilRitmo || 0) < 2
              if (unresolved.length === 0 && !needsRitmo) return null

              return (
                <div className="bg-violet-50 border border-violet-100 p-8 rounded-[2.5rem] mb-10 animate-fade-in">
                  <h4 className="text-xs font-black text-violet-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Zap size={14} className="fill-violet-400" /> Sugestões Inteligentes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unresolved.map(([id, d]) => {
                      const item = DUVIDAS_CHECKLIST.find(i => i.id === id)
                      return (
                        <div key={id} className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-violet-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                          <div>
                            <p className="text-xs font-black text-slate-800 tracking-tight leading-none mb-1">Resolver: {item?.label}</p>
                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Barreira identificada na sessão</p>
                          </div>
                          <button 
                            onClick={() => {
                              setAcaoForm(f => ({ ...f, descricao: `Resolver barreira: ${item?.label}`, categoria: item?.playbook ? 'treinamento' : 'processo' as any }))
                              toast.success('Sugestão aplicada!')
                            }}
                            className="p-2 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )
                    })}
                    {needsRitmo && (
                      <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-violet-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                        <div>
                          <p className="text-xs font-black text-slate-800 tracking-tight leading-none mb-1">Campanha de Originação</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Impulsionar ritmo para 1x1x1x1</p>
                        </div>
                        <button 
                          onClick={() => {
                            setAcaoForm(f => ({ ...f, descricao: "Realizar campanha de prospecção focada em novos leads (Aceleração de Ritmo)", categoria: 'indicação' }))
                            toast.success('Sugestão aplicada!')
                          }}
                          className="p-2 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* New action form */}
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                  <Plus size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nova Missão</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <input 
                  type="text" 
                  placeholder="O que precisa ser feito? *" 
                  value={acaoForm.descricao} 
                  onChange={(e) => setAcaoForm((f) => ({ ...f, descricao: e.target.value }))} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm"
                />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Responsável</label>
                    <select value={acaoForm.responsavel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAcaoForm((f: any) => ({ ...f, responsavel: e.target.value as Responsavel }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700">
                      <option value="Parceiro">Parceiro</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Prazo</label>
                    <input type="date" value={acaoForm.prazo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcaoForm((f: any) => ({ ...f, prazo: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Prioridade</label>
                    <select value={acaoForm.prioridade} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAcaoForm((f: any) => ({ ...f, prioridade: e.target.value as Prioridade }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700">
                      <option value="alta">Alta</option>
                      <option value="média">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoria</label>
                    <select value={acaoForm.categoria} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAcaoForm((f: any) => ({ ...f, categoria: e.target.value as CategoriaAcao }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700">
                      <option value="indicação">Indicação</option>
                      <option value="documentação">Documentação</option>
                      <option value="treinamento">Treinamento</option>
                      <option value="processo">Processo</option>
                      <option value="relacionamento">Relacionamento</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={addNewAcao} 
                disabled={!acaoForm.descricao.trim()} 
                className="w-full py-4 bg-[#0F172A] text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-[10px]"
              >
                Gerar Nova Ação
              </button>
            </div>

            {/* New actions list */}
            {newAcoes.length > 0 && (
              <div className="space-y-4 pt-4 animate-fade-in">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Zap size={12} className="text-amber-500" /> Novas Definições ({newAcoes.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {newAcoes.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm group">
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 tracking-tight">{a.descricao}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-teal-50 text-teal-600 rounded-md">
                            {a.responsavel}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {a.prazo ? formatDate(a.prazo) : 'Sem prazo'}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            a.prioridade === 'alta' ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {a.prioridade}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setNewAcoes((prev: any[]) => prev.filter((_: any, j: number) => j !== i))} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BLOCK: Finalização */}
        {currentBlock.id === 'finalizacao' && (
          <div className="space-y-12 max-w-4xl mx-auto py-6">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-500/5">
                <Check size={40} strokeWidth={3} />
              </div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Sessão Concluída!</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Tudo pronto. Revise o resumo e gere os entregáveis para concluir o ciclo.</p>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: newLeads.length, label: 'Novos Leads', icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
                { value: newAcoes.length, label: 'Ações Criadas', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
                { 
                  value: `${Math.round((leads.filter(l => l.status === 'Ativo' && l.dentro_farege).length / (leads.filter(l => l.status === 'Ativo').length || 1)) * 100)}%`, 
                  label: 'Conformidade FAREGE', 
                  icon: ShieldCheck, 
                  color: 'text-violet-600', 
                  bg: 'bg-violet-50' 
                },
              ].map((item: any, i: number) => (
                <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8 text-center shadow-sm hover:shadow-md transition-all">
                  <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <item.icon size={24} />
                  </div>
                  <p className="text-4xl font-black text-slate-800 tracking-tight mb-1">{item.value}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-8 bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas da Consultoria</label>
                  <textarea 
                    value={notasGerais} 
                    onChange={(e) => setNotasGerais(e.target.value)} 
                    rows={4} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
                    placeholder="Observações complementares..." 
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Próxima Sessão</label>
                    <input 
                      type="date" 
                      value={proximaRPI} 
                      onChange={(e) => setProximaRPI(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-black text-slate-700" 
                    />
                  </div>
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                    <div className="text-amber-500 shrink-0"><Activity size={20} /></div>
                    <p className="text-xs font-medium text-amber-800 leading-relaxed">
                      Lembre-se de enviar o entregável para o canal oficial do parceiro após finalizar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setShowEntregaveis(true)}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 text-slate-800 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  <BookOpen size={18} /> Visualizar Entregáveis
                </button>
                <button
                  onClick={finalizarRPI}
                  disabled={finalizing}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-[#0F172A] text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-[10px]"
                >
                  <Check size={18} /> {finalizing ? 'Salvando Sessão...' : 'Finalizar RPI'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        {currentBlock.id !== 'prep' && !currentBlock.playbook && (
          <div className="max-w-4xl mx-auto flex justify-between mt-12 pt-8 border-t border-slate-100">
            <button 
              onClick={goBack} 
              disabled={!canGoBack} 
              className="flex items-center gap-3 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 disabled:opacity-30 transition-all active:scale-95"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            {canGoForward && (
              <button 
                onClick={goForward} 
                className="flex items-center gap-3 px-10 py-4 bg-white border border-slate-100 shadow-sm rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-teal-600 hover:shadow-md hover:border-teal-500/20 transition-all active:scale-95"
              >
                Prosseguir <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Entregáveis Modal */}
      {showEntregaveis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">Entregáveis da Sessão</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{parceiro.nome} — RPI #{rpis.length + 1}</p>
              </div>
              <button onClick={() => setShowEntregaveis(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-10 pt-4">
              {['Plano de Ação', 'Relatório de Status', 'HubSpot / CRM'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setEntregavelTab(i)}
                  className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-t-[1.5rem] transition-all ${
                    entregavelTab === i 
                      ? 'bg-slate-50 text-[#0F172A] border-b-2 border-[#0F172A]' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-10 py-8 bg-slate-50">
              <div className="bg-white rounded-[2rem] p-8 shadow-inner min-h-full border border-slate-200/50">
                <EntregavelFormatado
                  tipo={entregavelTab === 0 ? 'plano' : entregavelTab === 1 ? 'relatorio' : 'hubspot'}
                  parceiro={parceiro}
                  rpiData={rpiData}
                  acoes={allAcoes}
                  leads={leads}
                  discussionNotes={andamentoNotes}
                />
              </div>
            </div>

            <div className="px-10 py-8 border-t border-slate-100 flex items-center justify-between gap-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Pronto para copiar e enviar ao parceiro
              </p>
              <CopyButton
                text={entregavelTab === 0 ? planoText : entregavelTab === 1 ? relatorioText : hubspotText}
                label="Copiar Agora"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
