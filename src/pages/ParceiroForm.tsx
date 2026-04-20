import { useState, useMemo } from 'react'
import { X, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import type { Parceiro, Categoria } from '../types/database'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import { formatCurrency } from '../lib/format'

interface ParceiroFormProps {
  parceiro?: Parceiro | null
  onClose: () => void
  onSave: (data: Partial<Parceiro> & { nome: string; categoria: Categoria }) => void
}

export default function ParceiroForm({ parceiro, onClose, onSave }: ParceiroFormProps) {
  const [form, setForm] = useState({
    nome: parceiro?.nome || '',
    categoria: (parceiro?.categoria || 'Prata') as Categoria,
    regiao: parceiro?.regiao || '',
    cnpj_parceiro: parceiro?.cnpj_parceiro || '',
    contato_nome: parceiro?.contato_nome || '',
    contato_telefone: parceiro?.contato_telefone || '',
    contato_email: parceiro?.contato_email || '',
    data_onboarding: parceiro?.data_onboarding || '',
    meta_receita_mensal: parceiro?.meta_receita_mensal ?? 20000,
    meta_anual_credito: parceiro?.meta_anual_credito ?? 10000000,
    meta_anual_clientes: parceiro?.meta_anual_clientes ?? 12,
    tiquete_medio: parceiro?.tiquete_medio ?? 800000,
    taxa_loara: parceiro?.taxa_loara ?? 0.06,
    taxa_produto: parceiro?.taxa_produto ?? 0.06,
    comissao_bruta: parceiro?.comissao_bruta ?? 0.0141516,
    imposto_comissao: parceiro?.imposto_comissao ?? 0.2138,
    conv_lead_qualificado: parceiro?.conv_lead_qualificado ?? 0.60,
    conv_qualificado_oportunidade: parceiro?.conv_qualificado_oportunidade ?? 0.50,
    conv_oportunidade_cliente: parceiro?.conv_oportunidade_cliente ?? 0.65,
    conv_cliente_doc: parceiro?.conv_cliente_doc ?? 0.80,
    conv_doc_credito: parceiro?.conv_doc_credito ?? 0.85,
    tempo_medio_fechamento: parceiro?.tempo_medio_fechamento ?? 120,
    notas: parceiro?.notas || '',
  })

  const [showFinanceiro, setShowFinanceiro] = useState(!!parceiro)
  const [showFunil, setShowFunil] = useState(!!parceiro)
  const [saving, setSaving] = useState(false)

  const set = (field: string, value: string | number) => setForm((f) => ({ ...f, [field]: value }))

  // Live revenue projection based on current form values
    const loaraNet = form.taxa_loara * 0.78
    const share = form.categoria === 'Ouro' ? 0.40 : form.categoria === 'Prata' ? 0.30 : 0
    const partnerGross = loaraNet * share
    
    const fakeParceiro = {
      ...form,
      comissao_bruta: partnerGross,
      meta_receita_mensal: form.meta_receita_mensal,
    } as Parceiro
    return calculateRevenueProjection(fakeParceiro)
  }, [
    form.meta_receita_mensal,
    form.taxa_loara,
    form.categoria,
    form.tiquete_medio,
    form.conv_lead_qualificado,
    form.conv_qualificado_oportunidade,
    form.conv_oportunidade_cliente,
    form.conv_cliente_doc,
    form.conv_doc_credito,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      // Auto-calculate credit goal from revenue goal
      meta_anual_credito: projection.creditoNecessarioAnual,
      meta_anual_clientes: projection.clientesNecessariosAnual,
      regiao: form.regiao || null,
      cnpj_parceiro: form.cnpj_parceiro || null,
      contato_nome: form.contato_nome || null,
      contato_telefone: form.contato_telefone || null,
      contato_email: form.contato_email || null,
      data_onboarding: form.data_onboarding || null,
      notas: form.notas || null,
    } as Partial<Parceiro> & { nome: string; categoria: Categoria })
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {parceiro ? 'Editar Parceiro' : 'Novo Parceiro'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dados Básicos */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Nome *</label>
                <input type="text" required value={form.nome} onChange={(e) => set('nome', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Categoria *</label>
                <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)} className={inputCls}>
                  <option value="Bronze">Bronze</option>
                  <option value="Prata">Prata</option>
                  <option value="Ouro">Ouro</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Região</label>
                <input type="text" value={form.regiao} onChange={(e) => set('regiao', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CNPJ</label>
                <input type="text" value={form.cnpj_parceiro} onChange={(e) => set('cnpj_parceiro', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Contato</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Nome</label>
                <input type="text" value={form.contato_nome} onChange={(e) => set('contato_nome', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input type="text" value={form.contato_telefone} onChange={(e) => set('contato_telefone', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.contato_email} onChange={(e) => set('contato_email', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Data Onboarding */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data Onboarding</label>
              <input type="date" value={form.data_onboarding} onChange={(e) => set('data_onboarding', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* META DE RECEITA — the main input */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">Meta de Receita</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Receita Mensal Desejada (R$)</label>
                <input
                  type="number"
                  value={form.meta_receita_mensal}
                  onChange={(e) => set('meta_receita_mensal', Number(e.target.value))}
                  className={inputCls + ' text-lg font-semibold'}
                  step="1000"
                />
              </div>
              <div className="flex items-end">
                <div className="bg-white rounded-lg px-4 py-2 border border-emerald-200 w-full">
                  <p className="text-xs text-slate-500">Receita Anual</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(projection.metaReceitaAnual)}</p>
                </div>
              </div>
            </div>

            {/* Live projection preview */}
            <div className="bg-white/70 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Para atingir essa meta, você precisa:</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(projection.creditoNecessarioMensal)}</p>
                  <p className="text-xs text-slate-500">crédito/mês</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{projection.clientesNecessariosMensal}</p>
                  <p className="text-xs text-slate-500">clientes/mês</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{projection.leadsNecessariosMensal}</p>
                  <p className="text-xs text-slate-500">leads/mês</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Conversão geral do funil: {(projection.conversaoGeralLeadCliente * 100).toFixed(1)}% &middot;
                Tíquete médio: {formatCurrency(form.tiquete_medio)} &middot;
                Comissão líquida: {(projection.comissaoLiquida * 100).toFixed(4)}%
              </p>
            </div>
          </div>

          {/* Parâmetros Financeiros */}
          <div>
            <button
              type="button"
              onClick={() => setShowFinanceiro(!showFinanceiro)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
            >
              {showFinanceiro ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Parâmetros Financeiros
            </button>
            {showFinanceiro && (
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className={labelCls}>Taxa Loara (%)</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.taxa_loara} onChange={(e) => set('taxa_loara', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Imposto Comissão (Dedução Loara 22%)</label>
                  <div className={inputCls + ' bg-slate-50 text-slate-500 flex items-center'}>22.00% (fixo)</div>
                </div>
                <div>
                  <label className={labelCls}>Share Parceiro</label>
                  <div className={inputCls + ' bg-slate-50 text-slate-500 flex items-center'}>
                    {form.categoria === 'Ouro' ? '40%' : form.categoria === 'Prata' ? '30%' : '0%'}
                  </div>
                </div>
                <div className="col-span-3 p-4 bg-slate-900 rounded-xl text-white space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raciocínio Lógico da Comissão</p>
                   <div className="flex items-center justify-between">
                     <div className="text-center flex-1">
                       <p className="text-lg font-black">{ (form.taxa_loara * 100).toFixed(1) }%</p>
                       <p className="text-[9px] text-slate-500 uppercase">Loara Bruto</p>
                     </div>
                     <div className="text-slate-700">→</div>
                     <div className="text-center flex-1">
                       <p className="text-lg font-black text-blue-400">{ (form.taxa_loara * 0.78 * 100).toFixed(2) }%</p>
                       <p className="text-[9px] text-slate-500 uppercase">Após 22% Imp.</p>
                     </div>
                     <div className="text-slate-700">→</div>
                     <div className="text-center flex-1">
                       <p className="text-lg font-black text-teal-400">
                         { (form.taxa_loara * 0.78 * (form.categoria === 'Ouro' ? 0.4 : form.categoria === 'Prata' ? 0.3 : 0) * 100).toFixed(3) }%
                       </p>
                       <p className="text-[9px] text-slate-500 uppercase">Seu Ganho ({form.categoria === 'Ouro' ? '40%' : '30%'})</p>
                     </div>
                   </div>
                </div>
                <div>
                  <label className={labelCls}>Tíquete Médio (R$)</label>
                  <input type="number" value={form.tiquete_medio} onChange={(e) => set('tiquete_medio', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Taxa Produto (Spread)</label>
                  <input type="number" step="0.0001" value={form.taxa_produto} onChange={(e) => set('taxa_produto', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tempo Médio Fechamento (dias)</label>
                  <input type="number" value={form.tempo_medio_fechamento} onChange={(e) => set('tempo_medio_fechamento', Number(e.target.value))} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Premissas do Funil */}
          <div>
            <button
              type="button"
              onClick={() => setShowFunil(!showFunil)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
            >
              {showFunil ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Premissas do Funil
            </button>
            {showFunil && (
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className={labelCls}>Conv. Lead → Qualificado</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.conv_lead_qualificado} onChange={(e) => set('conv_lead_qualificado', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Conv. Qualif. → Oportunidade</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.conv_qualificado_oportunidade} onChange={(e) => set('conv_qualificado_oportunidade', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Conv. Oport. → Cliente</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.conv_oportunidade_cliente} onChange={(e) => set('conv_oportunidade_cliente', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Conv. Cliente → Doc.</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.conv_cliente_doc} onChange={(e) => set('conv_cliente_doc', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Conv. Doc. → Crédito</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.conv_doc_credito} onChange={(e) => set('conv_doc_credito', Number(e.target.value))} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas</label>
            <textarea rows={3} value={form.notas} onChange={(e) => set('notas', e.target.value)} className={inputCls} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.nome.trim()} className="px-6 py-2.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors">
              {saving ? 'Salvando...' : parceiro ? 'Salvar Alterações' : 'Criar Parceiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
