import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Calendar, Users, Building2, FileText } from 'lucide-react'
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
  Ouro: 'bg-amber-100 text-amber-700',
  Prata: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-700',
}

const TABS = [
  { id: 'visao', label: 'Visão Geral', icon: Building2 },
  { id: 'pipeline', label: 'Pipeline', icon: Users },
  { id: 'rpis', label: 'Histórico RPIs', icon: FileText },
  { id: 'config', label: 'Configuração', icon: Calendar },
] as const

type TabId = typeof TABS[number]['id']

export default function ParceiroPerfil() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('visao')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const { getParceiro, updateParceiro } = useParceiros()
  const { leads, createLead, moveLead } = useLeads(id || '')
  const { rpis } = useRPIs(id || '')

  useEffect(() => {
    async function fetch() {
      if (!id) return
      const p = await getParceiro(id)
      setParceiro(p)
      setLoading(false)
    }
    fetch()
  }, [id, getParceiro])

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando...</div>
  if (!parceiro) return <div className="text-center py-12 text-slate-500">Parceiro não encontrado.</div>

  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const totalPipeline = activeLeads.reduce((s, l) => s + (l.demanda || 0), 0)

  const handleMoveLead = async (leadId: string, newEtapa: EtapaFunil) => {
    await moveLead(leadId, newEtapa)
  }

  const handleCreateLead = async (data: Partial<Lead> & { nome_empresa: string }) => {
    await createLead({ ...data, parceiro_id: id! })
    setShowLeadForm(false)
  }

  const handleEditSave = async (data: Partial<Parceiro>) => {
    const updated = await updateParceiro(parceiro.id, data)
    if (updated) setParceiro(updated)
    setShowEditForm(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/parceiros')} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{parceiro.nome}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_STYLES[parceiro.categoria]}`}>
              {parceiro.categoria}
            </span>
          </div>
          {parceiro.regiao && <p className="text-sm text-slate-500 mt-0.5">{parceiro.regiao}</p>}
        </div>
        <button
          onClick={() => navigate(`/parceiros/${id}/rpi/nova`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
        >
          <Play size={16} />
          Iniciar RPI
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === tabId
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'visao' && (() => {
        const proj = calculateRevenueProjection(parceiro)
        return (
        <div className="space-y-6">
          {/* Revenue narrative */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>{parceiro.nome}</strong> quer gerar{' '}
              <strong className="text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}/mês</strong> em receita.
              Para isso, precisa indicar <strong>{proj.leadsNecessariosMensal} leads/mês</strong> e
              fechar <strong>{proj.clientesNecessariosMensal} clientes/mês</strong> ({formatCurrency(proj.creditoNecessarioMensal)}/mês em crédito).
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Meta Receita/Mês</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(proj.metaReceitaMensal)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Leads Necessários/Mês</p>
              <p className="text-2xl font-bold text-slate-800">{proj.leadsNecessariosMensal}</p>
              <p className="text-xs text-slate-400">ativos: {activeLeads.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Pipeline Total</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalPipeline)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">RPIs Realizadas</p>
              <p className="text-2xl font-bold text-slate-800">{rpis.filter((r) => r.status === 'finalizada').length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Dados do Parceiro</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-400">Contato:</span> <span className="text-slate-700 ml-1">{parceiro.contato_nome || '—'}</span></div>
              <div><span className="text-slate-400">Telefone:</span> <span className="text-slate-700 ml-1">{parceiro.contato_telefone || '—'}</span></div>
              <div><span className="text-slate-400">Email:</span> <span className="text-slate-700 ml-1">{parceiro.contato_email || '—'}</span></div>
              <div><span className="text-slate-400">CNPJ:</span> <span className="text-slate-700 ml-1">{parceiro.cnpj_parceiro || '—'}</span></div>
              <div><span className="text-slate-400">Onboarding:</span> <span className="text-slate-700 ml-1">{parceiro.data_onboarding ? formatDate(parceiro.data_onboarding) : '—'}</span></div>
              <div><span className="text-slate-400">Status:</span> <span className="text-slate-700 ml-1">{parceiro.status}</span></div>
            </div>
          </div>
        </div>
        )
      })()}

      {tab === 'pipeline' && (
        <PipelineKanban
          leads={leads}
          onMove={handleMoveLead}
          onAddLead={() => setShowLeadForm(true)}
        />
      )}

      {tab === 'rpis' && (
        <div className="bg-white rounded-xl border border-slate-200">
          {rpis.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma RPI realizada"
              description="Inicie a primeira RPI com este parceiro."
              action={{ label: 'Iniciar RPI', onClick: () => navigate(`/parceiros/${id}/rpi/nova`) }}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {rpis.map((rpi) => (
                <div
                  key={rpi.id}
                  onClick={() => navigate(`/parceiros/${id}/rpi/${rpi.id}`)}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 cursor-pointer"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-800">RPI #{rpi.numero_sequencial}</span>
                    <span className="text-sm text-slate-500 ml-3">{formatDate(rpi.data_reuniao)}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rpi.status === 'finalizada' ? 'bg-emerald-100 text-emerald-700' :
                    rpi.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {rpi.status === 'finalizada' ? 'Finalizada' : rpi.status === 'em_andamento' ? 'Em andamento' : 'Cancelada'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'config' && (() => {
        const proj = calculateRevenueProjection(parceiro)
        return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Configuração do Parceiro</h3>
            <button onClick={() => setShowEditForm(true)} className="px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100">
              Editar
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-400">Meta Receita/Mês:</span> <span className="text-emerald-700 font-semibold ml-1">{formatCurrency(proj.metaReceitaMensal)}</span></div>
            <div><span className="text-slate-400">Crédito Necessário/Mês:</span> <span className="text-slate-700 ml-1">{formatCurrency(proj.creditoNecessarioMensal)}</span></div>
            <div><span className="text-slate-400">Clientes/Mês:</span> <span className="text-slate-700 ml-1">{proj.clientesNecessariosMensal}</span></div>
            <div><span className="text-slate-400">Leads/Mês:</span> <span className="text-slate-700 ml-1">{proj.leadsNecessariosMensal}</span></div>
            <div><span className="text-slate-400">Tíquete Médio:</span> <span className="text-slate-700 ml-1">{formatCurrency(parceiro.tiquete_medio)}</span></div>
            <div><span className="text-slate-400">Comissão Líquida:</span> <span className="text-slate-700 ml-1">{(proj.comissaoLiquida * 100).toFixed(4)}%</span></div>
            <div><span className="text-slate-400">Conv. Lead→Qualif.:</span> <span className="text-slate-700 ml-1">{(parceiro.conv_lead_qualificado * 100).toFixed(0)}%</span></div>
            <div><span className="text-slate-400">Conv. Qualif.→Oport.:</span> <span className="text-slate-700 ml-1">{(parceiro.conv_qualificado_oportunidade * 100).toFixed(0)}%</span></div>
            <div><span className="text-slate-400">Conv. Oport.→Cliente:</span> <span className="text-slate-700 ml-1">{(parceiro.conv_oportunidade_cliente * 100).toFixed(0)}%</span></div>
          </div>
        </div>
        )
      })()}

      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} onSave={handleCreateLead} />
      )}
      {showEditForm && (
        <ParceiroForm parceiro={parceiro} onClose={() => setShowEditForm(false)} onSave={handleEditSave} />
      )}
    </div>
  )
}
