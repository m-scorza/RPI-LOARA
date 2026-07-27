import { useState } from 'react'
import { X } from 'lucide-react'
import type { Lead, EtapaFunil, OrigemLead } from '../types/database'

interface LeadFormProps {
  lead?: Lead | null
  onClose: () => void
  onSave: (data: Partial<Lead> & { nome_empresa: string }) => void
  defaultEtapa?: EtapaFunil
}

export default function LeadForm({ lead, onClose, onSave, defaultEtapa = 'Lead' }: LeadFormProps) {
  const [form, setForm] = useState({
    nome_empresa: lead?.nome_empresa || '',
    cnpj: lead?.cnpj || '',
    faturamento_anual: lead?.faturamento_anual ?? '',
    demanda: lead?.demanda ?? '',
    etapa: lead?.etapa || defaultEtapa,
    origem: (lead?.origem || 'Indicação Parceiro') as OrigemLead,
    observacoes: lead?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field: string, value: string | number) => setForm((f) => ({ ...f, [field]: value }))
  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome_empresa.trim()) return
    setSaving(true)
    await onSave({
      nome_empresa: form.nome_empresa,
      cnpj: form.cnpj || null,
      faturamento_anual: form.faturamento_anual ? Number(form.faturamento_anual) : null,
      demanda: form.demanda ? Number(form.demanda) : null,
      etapa: form.etapa as EtapaFunil,
      origem: form.origem,
      observacoes: form.observacoes || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Nome da Empresa *</label>
            <input type="text" required value={form.nome_empresa} onChange={(e) => set('nome_empresa', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>CNPJ</label>
              <input type="text" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Origem</label>
              <select value={form.origem} onChange={(e) => set('origem', e.target.value)} className={inputCls}>
                <option value="Indicação Parceiro">Indicação Parceiro</option>
                <option value="Prospecção Própria">Prospecção Própria</option>
                <option value="Carteira Existente">Carteira Existente</option>
                <option value="Evento">Evento</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Faturamento Anual (R$)</label>
              <input type="number" value={form.faturamento_anual} onChange={(e) => set('faturamento_anual', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Demanda (R$)</label>
              <input type="number" value={form.demanda} onChange={(e) => set('demanda', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} className={inputCls} />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.nome_empresa.trim()} className="px-5 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50">
              {saving ? 'Salvando...' : lead ? 'Salvar' : 'Adicionar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
