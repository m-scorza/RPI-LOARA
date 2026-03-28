import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { useParceiros } from '../hooks/useParceiros'
import type { Parceiro, Categoria } from '../types/database'
import EmptyState from '../components/EmptyState'
import ParceiroForm from './ParceiroForm'

const CATEGORIA_STYLES: Record<Categoria, string> = {
  Ouro: 'bg-amber-100 text-amber-700',
  Prata: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-700',
}

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700',
  inativo: 'bg-slate-100 text-slate-500',
  churned: 'bg-rose-100 text-rose-700',
}

export default function ParceirosLista() {
  const { parceiros, loading, createParceiro, updateParceiro } = useParceiros()
  const [showForm, setShowForm] = useState(false)
  const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null)
  const [filterCategoria, setFilterCategoria] = useState<Categoria | 'Todos'>('Todos')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = parceiros.filter((p) => {
    if (filterCategoria !== 'Todos' && p.categoria !== filterCategoria) return false
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleSave = async (data: Partial<Parceiro> & { nome: string; categoria: Categoria }) => {
    if (editingParceiro) {
      await updateParceiro(editingParceiro.id, data)
    } else {
      await createParceiro(data)
    }
    setShowForm(false)
    setEditingParceiro(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parceiros</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie seus parceiros de negócios
          </p>
        </div>
        <button
          onClick={() => { setEditingParceiro(null); setShowForm(true) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
        >
          <Plus size={18} />
          Novo Parceiro
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
          {(['Todos', 'Ouro', 'Prata', 'Bronze'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategoria(cat)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filterCategoria === cat
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar parceiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <EmptyState
            icon={Users}
            title={parceiros.length === 0 ? 'Nenhum parceiro cadastrado' : 'Nenhum resultado'}
            description={
              parceiros.length === 0
                ? 'Adicione seu primeiro parceiro para começar.'
                : 'Tente ajustar os filtros.'
            }
            action={parceiros.length === 0 ? {
              label: 'Adicionar Parceiro',
              onClick: () => { setEditingParceiro(null); setShowForm(true) },
            } : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Região</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/parceiros/${p.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-800">{p.nome}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_STYLES[p.categoria]}`}>
                      {p.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.regiao || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.contato_nome || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ParceiroForm
          parceiro={editingParceiro}
          onClose={() => { setShowForm(false); setEditingParceiro(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
