import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Calendar, Users, Building2, FileText, Trash2, ChevronRight, Target, TrendingUp, Info, DollarSign, Settings } from 'lucide-react'
import { useParceiros } from '../hooks/useParceiros'
import { useLeads } from '../hooks/useLeads'
import { useRPIs } from '../hooks/useRPIs'
import { formatCurrency, formatDate } from '../lib/format'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import type { Parceiro, Lead, Categoria, EtapaFunil } from '../types/database'
import PipelineKanban from '../components/PipelineKanban'
import LeadForm from '../components/LeadForm'
import ParceiroForm from './ParceiroForm'
import EmptyState from '../components/EmptyState'

const CATEGORIA_STYLES: Record<Categoria, string> = {
  Ouro: 'bg-amber-100 text-amber-600 border border-amber-200',
  Prata: 'bg-slate-100 text-slate-500 border border-slate-200',
  Bronze: 'bg-orange-100 text-orange-600 border border-orange-200',
}

const TABS = [
  { id: 'visao', label: 'Visão Geral', icon: Building2 },
  { id: 'pipeline', label: 'Pipeline', icon: Users },
  { id: 'rpis', label: 'Histórico RPIs', icon: FileText },
  { id: 'config', label: 'Configurações', icon: Calendar },
] as const

type TabId = typeof TABS[number]['id']

export default function ParceiroPerfil() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('visao')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deletingRPIId, setDeletingRPIId] = useState<string | null>(null)

  const { getParceiro, updateParceiro } = useParceiros()
  const { leads, createLead, updateLead, deleteLead, moveLead } = useLeads(id || '')
  const { rpis, deleteRPI } = useRPIs(id || '')

  useEffect(() => {
    async function fetch() {
      if (!id) return
      const p = await getParceiro(id)
      setParceiro(p)
      setLoading(false)
    }
    fetch()
  }, [id, getParceiro])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  )
  
  if (!parceiro) return (
    <div className="glass-card rounded-3xl p-20 text-center">
       <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
       <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Parceiro não encontrado</p>
    </div>
  )

  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const totalPipeline = activeLeads.reduce((s, l) => s + (l.demanda || 0), 0)

  const handleMoveLead = async (leadId: string, newEtapa: EtapaFunil) => {
    await moveLead(leadId, newEtapa)
  }

  const handleCreateLead = async (data: Partial<Lead> & { nome_empresa: string }) => {
    if (editingLead) {
      await updateLead(editingLead.id, data)
    } else {
      await createLead({ ...data, parceiro_id: id! })
    }
    setShowLeadForm(false)
    setEditingLead(null)
  }

  const handleDeleteLead = async (leadId: string) => {
    await deleteLead(leadId)
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setShowLeadForm(true)
  }

  const handleDeleteRPI = async (rpiId: string) => {
    await deleteRPI(rpiId)
    setDeletingRPIId(null)
  }

  const handleEditSave = async (data: Partial<Parceiro>) => {
    const updated = await updateParceiro(parceiro.id, data)
    if (updated) setParceiro(updated)
    setShowEditForm(false)
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <button 
          onClick={() => navigate('/parceiros')} 
          className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-600 hover:shadow-md transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-black text-xl">
               {parceiro.nome[0]}
             </div>
             <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">{parceiro.nome}</h1>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${CATEGORIA_STYLES[parceiro.categoria]}`}>
                  {parceiro.categoria}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-0.5">{parceiro.regiao || 'Brasil'}</p>
             </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/parceiros/${id}/rpi/nova`)}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-teal-500 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20 active:scale-95"
        >
          <Play size={18} fill="currentColor" />
          Executar RPI
        </button>
      </div>

      {/* Modern Tabs */}
      <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm max-w-2xl">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
              tab === tabId
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {tab === 'visao' && (() => {
          const proj = calculateRevenueProjection(parceiro)
          return (
          <div className="space-y-10">
            {/* Insights Banner */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-[32px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative flex flex-col md:flex-row items-center gap-8 bg-white border border-slate-100 rounded-[28px] p-8 shadow-sm">
                 <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 flex-shrink-0">
                    <Target size={40} />
                 </div>
                 <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">O Caminho para o Sucesso</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      Para atingir a meta de <strong className="text-teal-600">{formatCurrency(proj.metaReceitaMensal)}/mês</strong>, 
                      {parceiro.nome} deve converter <strong>{proj.clientesNecessariosMensal} novos contratos</strong> de <strong>{formatCurrency(parceiro.tiquete_medio)}</strong>. 
                      Isso demanda um pipeline ativo de <strong>{proj.leadsNecessariosMensal} novos leads/mês</strong>.
                    </p>
                 </div>
                 <div className="flex flex-col items-center gap-1 px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score RPI</span>
                    <span className="text-3xl font-black text-slate-800">8.4</span>
                 </div>
              </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Meta de Faturamento', value: formatCurrency(proj.metaReceitaMensal), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Indicações/Mês', value: proj.leadsNecessariosMensal, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${activeLeads.length} este mês` },
                { label: 'Pipeline Ativo', value: formatCurrency(totalPipeline), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'RPIs Concluídas', value: rpis.filter((r) => r.status === 'finalizada').length, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((kpi, i) => (
                <div key={i} className="glass-card rounded-3xl p-6 border border-slate-100 hover:shadow-lg transition-all">
                   <div className={`w-10 h-10 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center mb-4`}>
                      <kpi.icon size={20} />
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                   <p className={`text-xl font-black text-slate-800`}>{kpi.value}</p>
                   {kpi.sub && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{kpi.sub}</p>}
                </div>
              ))}
            </div>

            {/* Partner Details */}
            <div className="glass-card rounded-3xl p-8 border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Informações Cadastrais</h3>
                <button 
                  onClick={() => setShowEditForm(true)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#0F172A] border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Editar Perfil
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-12">
                {[
                  { label: 'Principal Contato', value: parceiro.contato_nome || 'Não informado' },
                  { label: 'Canal de Comunicação', value: parceiro.contato_email || 'Não informado' },
                  { label: 'Telefone de Contato', value: parceiro.contato_telefone || 'Não informado' },
                  { label: 'Registro Corporativo', value: parceiro.cnpj_parceiro || 'Não informado' },
                  { label: 'Data de Onboarding', value: parceiro.data_onboarding ? formatDate(parceiro.data_onboarding) : 'Pendente' },
                  { label: 'Status da Parceria', value: parceiro.status, badge: true },
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{item.label}</span>
                    <span className={`text-sm font-bold text-slate-700 ${item.badge ? 'inline-flex px-2 py-0.5 bg-slate-100 rounded-lg text-xs uppercase tracking-wider' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )
        })()}

        {tab === 'pipeline' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PipelineKanban
              leads={leads}
              onMove={handleMoveLead}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              onAddLead={() => { setEditingLead(null); setShowLeadForm(true) }}
            />
          </div>
        )}

        {tab === 'rpis' && (
          <div className="glass-card rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {rpis.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Histórico Vazio"
                description="Desenvolva a parceria executando a primeira Reunião de Planejamento Integrado."
                action={{ label: 'Iniciar Agora', onClick: () => navigate(`/parceiros/${id}/rpi/nova`) }}
              />
            ) : (
              <div className="divide-y divide-slate-100/50">
                {rpis.map((rpi) => (
                  <div
                    key={rpi.id}
                    className="flex flex-col md:flex-row md:items-center justify-between px-8 py-6 hover:bg-slate-50/50 cursor-pointer transition-all group"
                    onClick={() => navigate(`/parceiros/${id}/rpi/${rpi.id}`)}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-teal-500 group-hover:border-teal-200 transition-all shadow-sm">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <span className="text-sm font-black text-slate-700 block group-hover:text-teal-600 transition-all">RPI #{rpi.numero_sequencial}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{formatDate(rpi.data_reuniao)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-4 md:mt-0" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        rpi.status === 'finalizada' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        rpi.status === 'em_andamento' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}>
                        {rpi.status === 'finalizada' ? 'Finalizada' : rpi.status === 'em_andamento' ? 'Em andamento' : 'Cancelada'}
                      </span>
                      
                      {deletingRPIId === rpi.id ? (
                        <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                          <button
                            onClick={() => handleDeleteRPI(rpi.id)}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => setDeletingRPIId(null)}
                            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingRPIId(rpi.id)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      
                      <ChevronRight size={18} className="text-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'config' && (() => {
          const proj = calculateRevenueProjection(parceiro)
          return (
          <div className="glass-card rounded-3xl p-8 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-10 pb-4 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                   <Settings size={20} />
                 </div>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Premissas Analíticas</h3>
               </div>
              <button 
                onClick={() => setShowEditForm(true)} 
                className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-[#0F172A] rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                Editar Parâmetros
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
              {[
                { label: 'Meta Receita/Mês', value: formatCurrency(proj.metaReceitaMensal), highlight: 'text-emerald-600' },
                { label: 'Crédito Necessário', value: formatCurrency(proj.creditoNecessarioMensal) },
                { label: 'Conversão Fechamento', value: `${(parceiro.conv_oportunidade_cliente * 100).toFixed(0)}%` },
                { label: 'Clientes/Mês', value: proj.clientesNecessariosMensal },
                { label: 'Novos Leads/Mês', value: proj.leadsNecessariosMensal },
                { label: 'Tíquete Médio', value: formatCurrency(parceiro.tiquete_medio) },
                { label: 'Conversão Qualificação', value: `${(parceiro.conv_lead_qualificado * 100).toFixed(0)}%` },
                { label: 'Conversão Oportunidade', value: `${(parceiro.conv_qualificado_oportunidade * 100).toFixed(0)}%` },
                { label: 'Comissão Líquida', value: `${(proj.comissaoLiquida * 100).toFixed(4)}%` },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className={`text-sm font-bold text-slate-700 ${item.highlight || ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          )
        })()}
      </div>

      {/* Modals */}
      {showLeadForm && (
        <LeadForm lead={editingLead} onClose={() => { setShowLeadForm(false); setEditingLead(null) }} onSave={handleCreateLead} />
      )}
      {showEditForm && (
        <ParceiroForm parceiro={parceiro} onClose={() => setShowEditForm(false)} onSave={handleEditSave} />
      )}
    </div>
  )
}
