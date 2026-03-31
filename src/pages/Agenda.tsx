import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, Clock, Play } from 'lucide-react'
import { isSupabaseConfigured, localParceiros, localRPIs } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import type { Parceiro, Categoria, RPI } from '../types/database'
import EmptyState from '../components/EmptyState'

interface AgendaItem {
  parceiro: Parceiro
  ultimaRPI: RPI | null
  proximaDate: string | null
  diasRestantes: number | null
  urgencia: 'atrasada' | 'urgente' | 'próxima' | 'no_prazo' | 'nunca'
}

const URGENCIA_STYLES: Record<string, string> = {
  atrasada: 'bg-rose-100 text-rose-700',
  urgente: 'bg-amber-100 text-amber-700',
  'próxima': 'bg-blue-100 text-blue-700',
  no_prazo: 'bg-emerald-100 text-emerald-700',
  nunca: 'bg-slate-100 text-slate-500',
}

const URGENCIA_LABELS: Record<string, string> = {
  atrasada: 'Atrasada',
  urgente: 'Urgente',
  'próxima': 'Próxima',
  no_prazo: 'No prazo',
  nunca: 'Pendente',
}

const CATEGORIA_STYLES: Record<Categoria, string> = {
  Ouro: 'bg-amber-100 text-amber-700',
  Prata: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-700',
}

const URGENCIA_ORDER: Record<string, number> = {
  atrasada: 0,
  urgente: 1,
  nunca: 2,
  'próxima': 3,
  no_prazo: 4,
}

export default function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategoria, setFilterCategoria] = useState<'Todos' | 'Ouro' | 'Prata'>('Todos')
  const [filterUrgencia, setFilterUrgencia] = useState<string>('Todos')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      let parceirosData: Parceiro[]

      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('parceiros')
          .select('*')
          .eq('status', 'ativo')
          .in('categoria', ['Prata', 'Ouro'])
          .order('nome')
        parceirosData = (data as Parceiro[]) || []
      } else {
        parceirosData = localParceiros.selectAll()
          .filter((p) => p.status === 'ativo' && ['Prata', 'Ouro'].includes(p.categoria))
          .sort((a, b) => a.nome.localeCompare(b.nome))
      }

      if (parceirosData.length === 0) { setLoading(false); return }

      const agendaItems: AgendaItem[] = []

      for (const p of parceirosData) {
        let ultimaRPI: RPI | null = null

        if (isSupabaseConfigured) {
          const { data: rpis } = await supabase
            .from('rpis')
            .select('*')
            .eq('parceiro_id', p.id)
            .eq('status', 'finalizada')
            .order('data_reuniao', { ascending: false })
            .limit(1)
          ultimaRPI = rpis && rpis.length > 0 ? rpis[0] as RPI : null
        } else {
          const rpis = localRPIs.selectWhere({ parceiro_id: p.id } as Partial<RPI>)
            .filter((r) => r.status === 'finalizada')
            .sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao))
          ultimaRPI = rpis[0] || null
        }
        let proximaDate: string | null = null
        let diasRestantes: number | null = null
        let urgencia: AgendaItem['urgencia'] = 'nunca'

        if (ultimaRPI) {
          const ultima = new Date(ultimaRPI.data_reuniao)
          const proxima = new Date(ultima)
          proxima.setDate(proxima.getDate() + 45)
          proximaDate = proxima.toISOString().split('T')[0]

          const today = new Date()
          today.setHours(0, 0, 0, 0)
          diasRestantes = Math.floor((proxima.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diasRestantes < 0) urgencia = 'atrasada'
          else if (diasRestantes <= 7) urgencia = 'urgente'
          else if (diasRestantes <= 15) urgencia = 'próxima'
          else urgencia = 'no_prazo'
        }

        agendaItems.push({ parceiro: p, ultimaRPI, proximaDate, diasRestantes, urgencia })
      }

      // Sort by urgency
      agendaItems.sort((a, b) => URGENCIA_ORDER[a.urgencia] - URGENCIA_ORDER[b.urgencia])
      setItems(agendaItems)
      setLoading(false)
    }
    fetchData()
  }, [])

  const filtered = items.filter((item) => {
    if (filterCategoria !== 'Todos' && item.parceiro.categoria !== filterCategoria) return false
    if (filterUrgencia !== 'Todos' && item.urgencia !== filterUrgencia) return false
    return true
  })

  const atrasadas = items.filter((i) => i.urgencia === 'atrasada' || i.urgencia === 'nunca').length
  const realizadasMes = items.filter((i) => {
    if (!i.ultimaRPI) return false
    const d = new Date(i.ultimaRPI.data_reuniao)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda de RPIs</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe as reuniões agendadas e atrasadas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">RPIs este mês</p>
              <p className="text-xl font-bold text-slate-800">{realizadasMes} / {items.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">RPIs atrasadas</p>
              <p className="text-xl font-bold text-slate-800">{atrasadas}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Parceiros ativos</p>
              <p className="text-xl font-bold text-slate-800">{items.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value as typeof filterCategoria)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="Todos">Todas categorias</option>
          <option value="Ouro">Ouro</option>
          <option value="Prata">Prata</option>
        </select>
        <select
          value={filterUrgencia}
          onChange={(e) => setFilterUrgencia(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="Todos">Todas urgências</option>
          <option value="atrasada">Atrasada</option>
          <option value="urgente">Urgente</option>
          <option value="próxima">Próxima</option>
          <option value="no_prazo">No prazo</option>
          <option value="nunca">Pendente</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <EmptyState
            icon={Calendar}
            title="Nenhuma RPI encontrada"
            description="Cadastre parceiros Prata ou Ouro para ver a agenda de RPIs."
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Parceiro</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Última RPI</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Próxima RPI</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Dias</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Urgência</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => (
                <tr key={item.parceiro.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/parceiros/${item.parceiro.id}`)} className="text-sm font-medium text-slate-800 hover:text-teal-600">
                      {item.parceiro.nome}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_STYLES[item.parceiro.categoria]}`}>
                      {item.parceiro.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.ultimaRPI ? formatDate(item.ultimaRPI.data_reuniao) : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.proximaDate ? formatDate(item.proximaDate) : 'Pendente'}
                  </td>
                  <td className="px-6 py-4">
                    {item.diasRestantes !== null ? (
                      <span className={`text-sm font-medium ${item.diasRestantes < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {item.diasRestantes < 0 ? `${Math.abs(item.diasRestantes)}d atraso` : `${item.diasRestantes}d`}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${URGENCIA_STYLES[item.urgencia]}`}>
                      {URGENCIA_LABELS[item.urgencia]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/parceiros/${item.parceiro.id}/rpi/nova`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100"
                    >
                      <Play size={12} />
                      Iniciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
