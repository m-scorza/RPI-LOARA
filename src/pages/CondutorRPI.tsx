import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Clock, Check, X, Plus, ChevronRight, HelpCircle, BookOpen, Activity, Target, Zap, Layout as LayoutIcon, ClipboardList, Flag, Users, ShieldCheck, TrendingUp, AlertCircle, Download } from 'lucide-react'
import { useRPIStore } from '../stores/rpiStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useParceiros } from '../hooks/useParceiros'
import { useLeads } from '../hooks/useLeads'
import { useRPIs } from '../hooks/useRPIs'
import { useAcoes } from '../hooks/useAcoes'
import { useAcompanhamento } from '../hooks/useAcompanhamento'
import { usePlaybooks } from '../hooks/usePlaybooks'
import { useSettings } from '../hooks/useSettings'
import { formatCurrency, formatDate } from '../lib/format'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Dialog from '@radix-ui/react-dialog'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { generateHubSpotText, generatePlanoAcaoText, generateRelatorioText } from '../lib/generators'
import { generateWithAI, type DeliverableType } from '../lib/aiGenerators'
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

const LeadFormSchema = z.object({
  nome_empresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  cnpj: z.string().optional(),
  demanda: z.coerce.number().optional().nullable(),
  dentro_farege: z.boolean().default(true),
})

type LeadFormData = z.infer<typeof LeadFormSchema>

const AcaoFormSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  responsavel: z.enum(['Parceiro', 'Gerente', 'Ambos']),
  prazo: z.string().optional(),
  prioridade: z.enum(['alta', 'média', 'baixa']),
  categoria: z.enum(['indicação', 'documentação', 'treinamento', 'processo', 'relacionamento', 'outro']),
})

type AcaoFormData = z.infer<typeof AcaoFormSchema>

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

  const { 
    isRunning, 
    parceiroId: storeParceiroId, 
    startTime, 
    currentBlockId, 
    rpiId, 
    rpiNum,
    funilRitmo,
    funilSnapshot,
    duvidas,
    duvidasOutras,
    andamentoNotes,
    indicacoesCompromisso,
    newLeads,
    previousAcoesStatus,
    newAcoes,
    notasGerais,
    proximaRPI,
    maxVisitedBlockIndex,
    startSession,
    updateData,
    setCurrentBlock,
    completeSession
  } = useRPIStore()

  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [lastRPI, setLastRPI] = useState<RPI | null>(null)

  const { 
    register: registerLead, 
    handleSubmit: handleLeadSubmit, 
    reset: resetLeadForm,
    formState: { errors: leadErrors }
  } = useForm<LeadFormData>({
    resolver: zodResolver(LeadFormSchema),
    defaultValues: { dentro_farege: true }
  })

  // Action plan local state (UI only)
  const [previousAcoes, setPreviousAcoes] = useState<Acao[]>([])
  
  const { 
    register: registerAcao, 
    handleSubmit: handleAcaoSubmit, 
    reset: resetAcaoForm,
    setValue: setAcaoValue,
    formState: { errors: acaoErrors }
  } = useForm<AcaoFormData>({
    resolver: zodResolver(AcaoFormSchema),
    defaultValues: { 
      responsavel: 'Parceiro', 
      prioridade: 'média', 
      categoria: 'outro' 
    }
  })

  // UI state
  const [entregavelTab, setEntregavelTab] = useState(0)
  const [finalizing, setFinalizing] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [direction, setDirection] = useState(0) // 1 for forward, -1 for back
  const contentRef = useRef<HTMLDivElement>(null)

  // AI-generated results state
  const [generatedTexts, setGeneratedTexts] = useState<Record<DeliverableType, string>>({
    plano_acao: '',
    relatorio: '',
    hubspot: ''
  })
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const { getParceiro } = useParceiros()
  const { leads, createLead, moveLead } = useLeads(parceiroId || '')
  const { rpis, createRPI, updateRPI, getLastRPI } = useRPIs(parceiroId || '')
  const { getPendingAcoes, createAcao, updateAcao } = useAcoes({ parceiroId: parceiroId || '' })
  const { acompHistorico } = useAcompanhamento(parceiroId || '')
  const { playbooks } = usePlaybooks()
  const { settings } = useSettings()

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

  const goBack = () => { 
    if (canGoBack) {
      setDirection(-1)
      setCurrentBlock(blocks[blockIndex - 1].id, blockIndex - 1) 
    }
  }
  const goForward = () => { 
    if (canGoForward) {
      setDirection(1)
      setCurrentBlock(blocks[blockIndex + 1].id, blockIndex + 1) 
    }
  }

  const handleFunilRitmoChange = useCallback((ritmo: number, snapshot: FunilVendasSnapshot) => {
    updateData({ funilRitmo: ritmo, funilSnapshot: snapshot })
  }, [updateData])

  // S1: Cross-partner session recovery logic
  useEffect(() => {
    if (isRunning && storeParceiroId && storeParceiroId !== parceiroId) {
      toast.warning('Uma sessão para outro parceiro está em execução. Finalize ou descarte-a primeiro.', {
        action: {
          label: 'Descartar Anterior',
          onClick: () => completeSession()
        },
        duration: 8000
      })
      navigate(`/parceiros/${storeParceiroId}/rpi/nova`)
    }
  }, [isRunning, storeParceiroId, parceiroId, navigate, completeSession])

  // Load parceiro data
  useEffect(() => {
    if (!parceiroId) return
    getParceiro(parceiroId).then((data: Parceiro | null) => {
      setParceiro(data)
    })
    getLastRPI().then((data: RPI | null) => {
      setLastRPI(data)
    })
  }, [parceiroId, getParceiro, getLastRPI])

  // Load previous pending actions
  useEffect(() => {
    if (!parceiroId) return
    getPendingAcoes(parceiroId).then((acoes: Acao[]) => {
      setPreviousAcoes(acoes)
      const statuses: Record<string, string> = {}
      acoes.forEach((a: Acao) => { statuses[a.id] = a.status })
      updateData({ previousAcoesStatus: statuses })
    })
  }, [parceiroId, getPendingAcoes])

  // Set default proxima RPI date (+45 days)
  useEffect(() => {
    if (!proximaRPI) {
      const d = new Date()
      d.setDate(d.getDate() + 45)
      updateData({ proximaRPI: d.toISOString().split('T')[0] })
    }
  }, [proximaRPI])

   // Auto-save every 30s
   const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
   useEffect(() => {
     if (!isRunning || !rpiId) return
     autoSaveRef.current = setInterval(() => {
       updateRPI(rpiId, {
         bloco_duvidas: duvidas as unknown as Record<string, unknown>,
         bloco_andamento: { notes: andamentoNotes } as unknown as Record<string, unknown>,
         bloco_indicacoes: { compromisso: indicacoesCompromisso, newLeads } as unknown as Record<string, unknown>,
         notas_gerais: notasGerais,
       })
     }, 30000)
     return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
   }, [isRunning, rpiId, duvidas, andamentoNotes, indicacoesCompromisso, newLeads, notasGerais, updateRPI])

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

      // S1: Initialize session in store
      startSession(parceiroId!, rpi.id, rpi.numero_sequencial)
    } catch (error) {
      console.error('Error starting meeting:', error)
      toast.error('Ocorreu um erro ao iniciar a sessão.')
    }
  }

  // Add new lead from Block 4
  const addNewLead = async (data: LeadFormData) => {
    try {
      const result = await createLead({
        nome_empresa: data.nome_empresa,
        cnpj: data.cnpj || null,
        demanda: data.demanda || null,
        parceiro_id: parceiroId!,
        dentro_farege: data.dentro_farege,
      })

      if (!result) {
        toast.error('Erro ao salvar lead.')
        return
      }

      updateData({ newLeads: [...newLeads, result] })
      resetLeadForm({ nome_empresa: '', cnpj: '', demanda: null, dentro_farege: true })
      toast.success('Lead adicionado ao pipeline!')
    } catch (error) {
      console.error('Error adding lead:', error)
      toast.error('Ocorreu um erro ao salvar o lead.')
    }
  }

  // Add new acao
  const addNewAcao = (data: AcaoFormData) => {
    updateData({ newAcoes: [...newAcoes, { ...data, prazo: data.prazo || proximaRPI }] })
    resetAcaoForm({ descricao: '', responsavel: 'Parceiro', prazo: '', prioridade: 'média', categoria: 'outro' })
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

  const handleGenerateAI = async (forceType?: DeliverableType) => {
    if (!parceiro) return
    setIsGeneratingAI(true)
    
    const context = {
      parceiro,
      rpiData,
      leads,
      acoes: allAcoes,
      discussionNotes: andamentoNotes,
      duvidasChecklist: duvidas
    }

    try {
      if (forceType) {
        const text = await generateWithAI(context, forceType)
        setGeneratedTexts(prev => ({ ...prev, [forceType]: text }))
      } else {
        const [plano, rel, hub] = await Promise.all([
          generateWithAI(context, 'plano_acao'),
          generateWithAI(context, 'relatorio'),
          generateWithAI(context, 'hubspot')
        ])
        setGeneratedTexts({ plano_acao: plano, relatorio: rel, hubspot: hub })
      }
    } catch (error) {
      console.error('Error generating deliverables:', error)
      toast.error('Erro ao gerar entregáveis.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !parceiro) return
    setIsExportingPDF(true)
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      })
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`RPI_${parceiro.nome.replace(/\s+/g, '_')}_${formatDate(new Date().toISOString())}.pdf`)
      toast.success('PDF gerado com sucesso!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Finalize RPI
  const finalizarRPI = async () => {
    if (!rpiId || !parceiro) return
    setFinalizing(true)

    const activeLeads = leads.filter((l: Lead) => l.status === 'Ativo')
    const ponderado = activeLeads.reduce((s: number, l: Lead) => s + (l.demanda || 0) * (l.probabilidade || 0), 0)
    const totalDemanda = activeLeads.reduce((s: number, l: Lead) => s + (l.demanda || 0), 0)
    const duration = startTime ? Math.floor((Date.now() - startTime) / 60000) : null

    // Collect used playbook slugs from store
    const playbooksUsados = DUVIDAS_CHECKLIST
      .filter((t: any) => duvidas[t.id]?.checked && t.playbook)
      .map((t: any) => t.playbook!)

    try {
      // Update RPI in DB
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
        responsavel: acao.responsavel as any,
        prazo: acao.prazo || null,
        prioridade: acao.prioridade as any,
        categoria: acao.categoria as any,
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
        // S1: Complete session (clear store)
        completeSession()
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
                    onClick={() => { 
                      if (b.id === 'prep' || (startTime && i <= maxVisitedBlockIndex)) {
                        setCurrentBlock(b.id, i) 
                      }
                    }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      currentBlockId === b.id
                        ? 'bg-[#0F172A] text-white shadow-md'
                        : i <= maxVisitedBlockIndex
                        ? 'text-teal-600 hover:bg-teal-50'
                        : 'text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                  {blockIndex > i && <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 text-white rounded-full flex items-center justify-center border-2 border-white"><Check size={8} /></div>}
                  {b.playbook && <BookOpen size={12} className={currentBlockId === b.id ? 'text-violet-400' : 'text-violet-500'} />}
                  <span className="hidden xl:inline">{b.label}</span>
                  {currentBlockId === b.id && <span className="xl:hidden">{b.label}</span>}
                </button>
              ))}
            </div>
          </div>

          <Timer startTime={startTime} />
        </div>
      </div>

      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto pb-24">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentBlock.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >

        {/* BLOCK: Preparação */}
        {currentBlock.id === 'prep' && (() => {
          const proj = calculateRevenueProjection(parceiro!, settings)
          const activeLeads = leads.filter((l: Lead) => l.status === 'Ativo')
          return (
            <div className="space-y-10 max-w-4xl mx-auto">
              <div className="space-y-2 text-center">
                   <p className="text-slate-500 font-medium tracking-tight">Revise as metas e o histórico antes de iniciar a sessão com {parceiro.nome}.</p>
                </div>

                {isRunning && storeParceiroId === parceiroId && (
                  <div className="bg-teal-500/10 border border-teal-500/20 p-6 rounded-[2rem] flex items-center justify-between gap-6 animate-pulse shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-teal-500 rounded-2xl text-white">
                        <Zap size={20} fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">Sessão em Andamento</p>
                        <p className="text-xs text-slate-500 font-medium">Detectamos uma sessão ativa iniciada em {new Date(startTime!).toLocaleTimeString()}.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentBlock('duvidas', 1)}
                      className="px-6 py-2.5 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md"
                    >
                      Retomar Sessão
                    </button>
                  </div>
                )}
                   {funilRitmo >= 1 && (
                     <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saúde: Engajado</span>
                     </div>
                   )}

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

              {/* Premium Deliverables Switcher */}
              <div className="space-y-6">
                <div className="flex justify-center p-1.5 bg-slate-100 rounded-2xl w-fit mx-auto">
                  {(['plano', 'relatorio', 'hubspot'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setExportType(t)}
                      className={`px-8 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                        exportType === t 
                          ? 'bg-white text-slate-900 shadow-xl shadow-slate-200 scale-105' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {t === 'plano' ? 'Plano de Ação' : t === 'relatorio' ? 'Status Report' : 'HubSpot CRM'}
                    </button>
                  ))}
                </div>

                <div className="animate-fade-in-up">
                  <EntregavelFormatado
                    tipo={exportType}
                    parceiro={parceiro}
                    rpiData={{
                      numero_sequencial: nextRpiNumber,
                      data_reuniao: new Date().toISOString(),
                      notas_gerais: andamentoNotes,
                      proxima_rpi_prevista: proximaRpiDate
                    }}
                    acoes={[...previousAcoes.map(a => ({ ...a, status: previousAcoesStatus[a.id] || a.status })), ...newAcoes]}
                    leads={leads}
                    discussionNotes={andamentoNotes}
                  />
                </div>
              </div>

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
                          onChange={() => updateData({
                            duvidas: {
                              ...duvidas,
                              [item.id]: { ...d, checked: !d.checked }
                            }
                          })}
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
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData({ 
                                 duvidas: { ...duvidas, [item.id]: { ...d, notes: e.target.value } } 
                               })}
                               rows={2}
                               className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                             />
                             <button
                               onClick={(e: React.MouseEvent) => {
                                 e.preventDefault();
                                 updateData({ duvidas: { ...duvidas, [item.id]: { ...d, resolved: !d.resolved } } })
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
                 onChange={(e) => updateData({ duvidasOutras: e.target.value })} 
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
                 onChange={(e) => updateData({ andamentoNotes: e.target.value })} 
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
            dadosReais={leads.length >= 5 && lastRPI?.funil_vendas_snapshot ? {
              cadastrosDiaMedio: lastRPI.funil_vendas_snapshot.cadastros_dia || 0,
              reunioesSemanaMedia: lastRPI.funil_vendas_snapshot.reunioes_semana || 0,
              clientesMesMedia: lastRPI.funil_vendas_snapshot.clientes_mes || 0
            } : undefined}
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
                    <div className="space-y-1">
                      <input 
                        type="text" 
                        placeholder="Empresa *" 
                        {...registerLead('nome_empresa')}
                        className={`w-full px-5 py-3.5 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm ${leadErrors.nome_empresa ? 'border-rose-500' : 'border-slate-100'}`}
                      />
                      {leadErrors.nome_empresa && <p className="text-[10px] font-black text-rose-500 uppercase ml-2">{leadErrors.nome_empresa.message}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="CNPJ" 
                        {...registerLead('cnpj')}
                        className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm"
                      />
                      <input 
                        type="number" 
                        placeholder="Demanda R$" 
                        {...registerLead('demanda')}
                        className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-3 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                      <input 
                        type="checkbox" 
                        {...registerLead('dentro_farege')}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Processo FAREGE</span>
                    </label>
                  </div>
                  <button 
                    onClick={handleLeadSubmit(addNewLead)} 
                    className="w-full flex items-center justify-center gap-2 py-4 bg-teal-500 text-white font-black rounded-2xl hover:bg-teal-600 shadow-lg shadow-teal-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
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
                   onChange={(e) => updateData({ indicacoesCompromisso: e.target.value })} 
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
                  
                  {acompHistorico.length > 0 ? (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={[...acompHistorico].reverse().map(h => ({ 
                            name: `${String(h.mes).padStart(2, '0')}/${h.ano % 100}`, 
                            valor: h.comissao_realizada 
                          }))}
                        >
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl shadow-xl">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                    <p className="text-xs font-black text-white">{formatCurrency(Number(payload[0].value))}</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="valor" radius={[6, 6, 6, 6]} barSize={32}>
                            {acompHistorico.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === acompHistorico.length - 1 ? '#2DD4BF' : '#F1F5F9'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <div className="p-3 bg-white rounded-2xl text-slate-300 shadow-sm">
                        <Activity size={24} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum histórico disponível.</p>
                    </div>
                  )}
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
                     <div key={acao.id} className="group flex items-center gap-6 bg-white border border-slate-100 rounded-[2rem] px-8 py-6 shadow-sm hover:shadow-xl transition-all hover:border-teal-500/20">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                         previousAcoesStatus[acao.id] === 'concluida' ? 'bg-emerald-50 text-emerald-600' : 
                         previousAcoesStatus[acao.id] === 'cancelada' ? 'bg-slate-50 text-slate-400' :
                         'bg-amber-50 text-amber-600 animate-pulse'
                       }`}>
                         {previousAcoesStatus[acao.id] === 'concluida' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                       </div>
                       <div className="flex-1">
                         <p className="text-base font-black text-slate-800 tracking-tight">{acao.descricao}</p>
                         <div className="flex items-center gap-3 mt-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                             {acao.responsavel} • {acao.prazo ? formatDate(acao.prazo) : 'Sem prazo'}
                           </span>
                           {acao.prioridade && (
                             <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                               acao.prioridade === 'alta' ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                               acao.prioridade === 'média' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                               'bg-slate-50 text-slate-400 border border-slate-100'
                             }`}>
                               {acao.prioridade}
                             </span>
                           )}
                         </div>
                       </div>
                       <select
                         value={previousAcoesStatus[acao.id] || acao.status}
                         onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateData({ previousAcoesStatus: { ...previousAcoesStatus, [acao.id]: e.target.value } })}
                         className="text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100 px-4 py-2.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer hover:bg-white"
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
                              setAcaoValue('descricao', `Resolver barreira: ${item?.label}`)
                              setAcaoValue('categoria', item?.playbook ? 'treinamento' : 'processo' as any)
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
                            setAcaoValue('descricao', "Realizar campanha de prospecção focada em novos leads (Aceleração de Ritmo)")
                            setAcaoValue('categoria', 'indicação')
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
                <div className="space-y-1">
                  <input 
                    type="text" 
                    placeholder="O que precisa ser feito? *" 
                    {...registerAcao('descricao')}
                    className={`w-full px-6 py-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-sm ${acaoErrors.descricao ? 'border-rose-500' : 'border-slate-100'}`}
                  />
                  {acaoErrors.descricao && <p className="text-[10px] font-black text-rose-500 uppercase ml-2">{acaoErrors.descricao.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Responsável</label>
                    <select {...registerAcao('responsavel')} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700">
                      <option value="Parceiro">Parceiro</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Prazo</label>
                    <input type="date" {...registerAcao('prazo')} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Prioridade</label>
                    <select {...registerAcao('prioridade')} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700">
                      <option value="alta">Alta</option>
                      <option value="média">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoria</label>
                    <select {...registerAcao('categoria')} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none text-xs font-bold text-slate-700">
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
                onClick={handleAcaoSubmit(addNewAcao)} 
                className="w-full py-4 bg-[#0F172A] text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[10px]"
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
                    <div key={i} className="flex items-center gap-6 bg-white border border-teal-100 rounded-[2rem] px-8 py-6 shadow-sm group hover:border-teal-500 transition-all">
                      <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                        {a.categoria === 'indicação' ? <TrendingUp size={24} /> :
                         a.categoria === 'documentação' ? <FileText size={24} /> :
                         a.categoria === 'treinamento' ? <Zap size={24} /> :
                         a.categoria === 'processo' ? <Layout size={24} /> :
                         <Activity size={24} />}
                      </div>
                       <div className="flex-1">
                         <p className="text-base font-black text-slate-800 tracking-tight">{a.descricao}</p>
                         <div className="flex items-center gap-3 mt-2">
                           <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                             a.prioridade === 'alta' ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                             a.prioridade === 'média' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                             'bg-slate-50 text-slate-400 border border-slate-100'
                           }`}>
                             {a.prioridade}
                           </span>
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                             {a.responsavel} • {a.prazo ? formatDate(a.prazo) : 'Sem prazo'}
                           </span>
                         </div>
                       </div>
                       <button onClick={() => updateData({ newAcoes: newAcoes.filter((_: any, j: number) => j !== i) })} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                         <Trash2 size={20} />
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
                  onClick={() => {
                    handleGenerateAI()
                    setShowEntregaveis(true)
                  }}
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

            </motion.div>
          </AnimatePresence>

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
      <Dialog.Root open={showEntregaveis} onOpenChange={setShowEntregaveis}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-zoom-in">
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
              <div>
                <Dialog.Title className="text-2xl font-black text-slate-800 tracking-tighter leading-none">Entregáveis da Sessão</Dialog.Title>
                <Dialog.Description className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{parceiro.nome} — RPI #{rpis.length + 1}</Dialog.Description>
              </div>
              <Dialog.Close className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all">
                <X size={20} />
              </Dialog.Close>
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
              <div ref={contentRef} className="bg-white rounded-[2rem] p-8 shadow-inner min-h-full border border-slate-200/50">
                {isGeneratingAI ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando Inteligência Estratégica...</p>
                  </div>
                ) : (
                  <EntregavelFormatado
                    tipo={entregavelTab === 0 ? 'plano' : entregavelTab === 1 ? 'relatorio' : 'hubspot'}
                    parceiro={parceiro}
                    rpiData={rpiData}
                    acoes={allAcoes}
                    leads={leads}
                    discussionNotes={andamentoNotes}
                    // Override with AI text if available
                    customContent={
                      entregavelTab === 0 ? generatedTexts.plano_acao :
                      entregavelTab === 1 ? generatedTexts.relatorio :
                      generatedTexts.hubspot
                    }
                  />
                )}
              </div>
            </div>

            <div className="px-10 py-8 border-t border-slate-100 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {import.meta.env.VITE_ANTHROPIC_API_KEY ? 'Gerado com IA ✦' : 'Gerado via Template'}
                </p>
                <button 
                  onClick={() => handleGenerateAI(entregavelTab === 0 ? 'plano_acao' : entregavelTab === 1 ? 'relatorio' : 'hubspot')}
                  disabled={isGeneratingAI}
                  className="p-2 text-slate-300 hover:text-teal-500 transition-all rounded-lg hover:bg-teal-50"
                  title="Regenerar"
                >
                  <Zap size={14} className={isGeneratingAI ? 'animate-pulse' : ''} />
                </button>
              </div>
              <div className="flex gap-3">
                {entregavelTab < 2 && (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isExportingPDF || isGeneratingAI}
                    className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    <Download size={14} />
                    {isExportingPDF ? 'Gerando...' : 'Baixar PDF'}
                  </button>
                )}
                <CopyButton
                  text={entregavelTab === 0 ? generatedTexts.plano_acao : entregavelTab === 1 ? generatedTexts.relatorio : generatedTexts.hubspot}
                  label="Copiar Texto"
                />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
