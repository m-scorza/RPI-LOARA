import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Users, Pencil, Trash2, Filter, ChevronRight } from 'lucide-react'
import { useParceiros } from '../hooks/useParceiros'
import type { Parceiro, Categoria } from '../types/database'
import EmptyState from '../components/EmptyState'
import ParceiroForm from './ParceiroForm'

const CATEGORIA_STYLES: Record<Categoria, string> = {
  Ouro: 'bg-amber-100 text-amber-600 border border-amber-200',
  Prata: 'bg-slate-100 text-slate-500 border border-slate-200',
  Bronze: 'bg-orange-100 text-orange-600 border border-orange-200',
}

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  inativo: 'bg-slate-50 text-slate-400 border border-slate-100',
  churned: 'bg-rose-50 text-rose-600 border border-rose-100',
}

export default function ParceirosLista() {
  const { parceiros, loading, createParceiro, updateParceiro, deleteParceiro } = useParceiros()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [showForm, setShowForm] = useState(false)
  const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null)
  const [filterCategoria, setFilterCategoria] = useState<Categoria | 'Todos'>('Todos')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null) setSearch(q)
  }, [searchParams])

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

  const handleDelete = async (id: string) => {
    await deleteParceiro(id)
    setDeletingId(null)
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Parceiros</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Rede de parceiros estratégicos e performance por categoria
          </p>
        </div>
        <button
          onClick={() => { setEditingParceiro(null); setShowForm(true) }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white text-sm font-bold rounded-2xl hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20 active:scale-95"
        >
          <Plus size={18} />
          Novo Parceiro
        </button>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {(['Todos', 'Ouro', 'Prata', 'Bronze'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategoria(cat)}
              className={`px-5 py-2 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                filterCategoria === cat
                  ? 'bg-[#0F172A] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nome, região ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 text-sm font-medium border-none bg-white rounded-2xl shadow-sm focus:ring-4 focus:ring-teal-500/10 placeholder:text-slate-300 transition-all"
          />
        </div>

        <button className="p-3.5 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-600 transition-all shadow-sm">
          <Filter size={18} />
        </button>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="glass-card rounded-3xl p-20 text-center animate-pulse">
           <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-4" />
           <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Carregando parceiros...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-3xl">
          <EmptyState
            icon={Users}
            title={parceiros.length === 0 ? 'Sua rede está vazia' : 'Busca sem resultados'}
            description={
              parceiros.length === 0
                ? 'Comece adicionando seu primeiro parceiro estratégico.'
                : 'Não encontramos nenhum parceiro com esses critérios.'
            }
            action={parceiros.length === 0 ? {
              label: 'Cadastrar Parceiro',
              onClick: () => { setEditingParceiro(null); setShowForm(true) },
            } : undefined}
          />
        </div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/50">
                <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Parceiro</th>
                <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Região</th>
                <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="text-right px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/parceiros/${p.id}`)}
                  className="hover:bg-slate-50/50 cursor-pointer transition-all group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-teal-500/5 text-teal-600 font-bold text-sm flex items-center justify-center border border-teal-500/10">
                         {p.nome[0]}
                       </div>
                       <div>
                         <span className="text-sm font-black text-slate-700 block group-hover:text-teal-600 transition-colors">{p.nome}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.contato_nome || 'Sem contato'}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${CATEGORIA_STYLES[p.categoria]}`}>
                      {p.categoria}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-[13px] font-bold text-slate-500">{p.regiao || '—'}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingParceiro(p); setShowForm(true) }}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      
                      {deletingId === p.id ? (
                        <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-md shadow-rose-500/20"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(p.id)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      
                      <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                      
                      <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-between items-center px-8">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mostrando {filtered.length} parceiros</span>
             <div className="flex gap-2">
                <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30" disabled><ChevronRight size={16} className="rotate-180" /></button>
                <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400"><ChevronRight size={16} /></button>
             </div>
          </div>
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
