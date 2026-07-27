import { useState, useEffect } from 'react'
import { Save, Lock, TrendingUp, DollarSign, Percent, Sparkles, Sliders, ShieldCheck } from 'lucide-react'
import { useSettings, type SystemSettings } from '../hooks/useSettings'
import { toast } from 'sonner'

export default function Configuracoes() {
  const { settings, saveSettings, loading } = useSettings()
  const [formData, setFormData] = useState<SystemSettings>(settings)

  useEffect(() => {
    if (!loading) setFormData(settings)
  }, [loading, settings])

  const handleSave = () => {
    saveSettings(formData)
    toast.success('Configurações salvas com sucesso!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  const inputCls = 'w-full px-4 py-3 text-sm font-bold text-slate-700 bg-white/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all placeholder:text-slate-300'
  const labelCls = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1'
  const sectionCls = 'glass-card rounded-3xl p-8 space-y-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all'

  return (
    <div className="max-w-5xl space-y-10 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-teal-500 text-[10px] font-black uppercase tracking-widest">
            <Sliders size={14} />
            <span>Preferências Globais</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Configurações</h1>
          <p className="text-sm font-medium text-slate-500">
            Ajuste as premissas analíticas e parâmetros financeiros da operação
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#0F172A] text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Save size={18} />
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Premissas de Funil */}
        <section className={sectionCls}>
          <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-500/10">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">Premissas de Funil</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculo de Conversão</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={labelCls}>Conversão Lead → Qualificado (%)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.conv_lead_qualificado * 100} 
                  onChange={(e) => setFormData({...formData, conv_lead_qualificado: Number(e.target.value) / 100})}
                  className={inputCls}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Conversão Qualificado → Oportunidade (%)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.conv_qualificado_oportunidade * 100} 
                  onChange={(e) => setFormData({...formData, conv_qualificado_oportunidade: Number(e.target.value) / 100})}
                  className={inputCls}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Conversão Oportunidade → Cliente (%)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.conv_oportunidade_cliente * 100} 
                  onChange={(e) => setFormData({...formData, conv_oportunidade_cliente: Number(e.target.value) / 100})}
                  className={inputCls}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ciclo Médio (Dias)</label>
                <input 
                  type="number" 
                  value={formData.tempo_medio_fechamento} 
                  onChange={(e) => setFormData({...formData, tempo_medio_fechamento: Number(e.target.value)})}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Prob. Documentação (%)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.conv_doc_credito * 100} 
                    onChange={(e) => setFormData({...formData, conv_doc_credito: Number(e.target.value) / 100})}
                    className={inputCls}
                  />
                  <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Parâmetros Financeiros */}
        <section className={sectionCls}>
          <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-500/10">
              <DollarSign size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">Finanças</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base de Cálculos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={labelCls}>Taxa de Produto Base (%)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.taxa_produto * 100} 
                  onChange={(e) => setFormData({...formData, taxa_produto: Number(e.target.value) / 100})}
                  className={inputCls}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Comissão Bruta Base (%)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  step="0.0001"
                  value={formData.comissao_bruta * 100} 
                  onChange={(e) => setFormData({...formData, comissao_bruta: Number(e.target.value) / 100})}
                  className={inputCls}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Tíquete Médio Padrão (R$)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  value={formData.tiquete_medio} 
                  onChange={(e) => setFormData({...formData, tiquete_medio: Number(e.target.value)})}
                  className={inputCls}
                />
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Imposto estimado (%)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.imposto_comissao * 100} 
                  onChange={(e) => setFormData({...formData, imposto_comissao: Number(e.target.value) / 100})}
                  className={inputCls}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
              </div>
            </div>
          </div>
        </section>

        {/* Metas Globais */}
        <section className={sectionCls}>
          <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-600 shadow-sm border border-violet-500/10">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">Metas e Performance</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Objetivos Globais</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={labelCls}>Meta Anual de Crédito (R$)</label>
              <input 
                type="number" 
                value={formData.meta_anual_credito} 
                onChange={(e) => setFormData({...formData, meta_anual_credito: Number(e.target.value)})}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Meta Mensal Gerente (R$)</label>
              <input 
                type="number" 
                value={formData.meta_receita_mensal} 
                onChange={(e) => setFormData({...formData, meta_receita_mensal: Number(e.target.value)})}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Segurança */}
        <section className={sectionCls}>
          <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-500/10">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">Segurança</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso Privado</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>PIN de Acesso ao Sistema</label>
            <div className="relative group">
              <input 
                type="password" 
                maxLength={6}
                value={formData.app_pin} 
                onChange={(e) => setFormData({...formData, app_pin: e.target.value})}
                className={`${inputCls} tracking-[0.5em] text-lg font-black`}
                placeholder="******"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={14} />
            </div>
            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">
               O PIN garante que os dados de comissionamento permaneçam privados em dispositivos compartilhados.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
