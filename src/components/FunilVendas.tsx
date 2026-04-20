import { useState, useMemo, useEffect } from 'react'
import { Users, Phone, Handshake, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Parceiro, FunilVendasSnapshot } from '../types/database'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import { formatCurrency } from '../lib/format'

interface FunilVendasProps {
  parceiro: Parceiro
  ritmoInicial?: number
  dadosReais?: {
    cadastrosDiaMedio: number
    reunioesSemanaMedia: number
    clientesMesMedia: number
  }
  onRitmoChange: (ritmo: number, snapshot: FunilVendasSnapshot) => void
  readOnly?: boolean
}

function calcularFunil(ritmo: number, tiqueteMedio: number, comissaoLiquida: number) {
  const cadastrosDia = ritmo
  const prospeccoesSemana = ritmo * 5
  const contatosMes = prospeccoesSemana * 4
  const reunioesSemana = ritmo
  const reunioesMes = ritmo * 4
  const clientesMes = ritmo

  const conversoes = [
    { pct: 100, clientes: Math.ceil(clientesMes * 0.25), credito: tiqueteMedio },
    { pct: 75, clientes: Math.ceil(clientesMes * 0.25), credito: tiqueteMedio * 0.75 },
    { pct: 50, clientes: Math.ceil(clientesMes * 0.25), credito: tiqueteMedio * 0.50 },
    { pct: 25, clientes: Math.floor(clientesMes * 0.25), credito: tiqueteMedio * 0.25 },
  ]

  const creditoTotal = conversoes.reduce((s, c) => s + c.clientes * c.credito, 0)
  const comissaoTotal = creditoTotal * comissaoLiquida

  return {
    cadastrosDia,
    prospeccoesSemana,
    contatosMes,
    reunioesSemana,
    reunioesMes,
    clientesMes,
    conversoes,
    creditoTotal,
    comissaoTotal,
  }
}

const RITMOS = [1, 2, 3, 4, 5, 6]

export default function FunilVendas({
  parceiro,
  ritmoInicial = 4,
  dadosReais,
  onRitmoChange,
  readOnly = false,
}: FunilVendasProps) {
  const [ritmo, setRitmo] = useState(ritmoInicial)
  const proj = calculateRevenueProjection(parceiro)
  const comissaoLiquida = proj.comissaoLiquida

  const funil = useMemo(
    () => calcularFunil(ritmo, parceiro.tiquete_medio, comissaoLiquida),
    [ritmo, parceiro.tiquete_medio, comissaoLiquida],
  )

  const atingeMeta = funil.comissaoTotal >= proj.metaReceitaMensal

  // Notify parent of changes
  useEffect(() => {
    const snapshot: FunilVendasSnapshot = {
      ritmo,
      cadastros_dia: funil.cadastrosDia,
      prospeccoes_semana: funil.prospeccoesSemana,
      contatos_mes: funil.contatosMes,
      reunioes_semana: funil.reunioesSemana,
      reunioes_mes: funil.reunioesMes,
      clientes_mes: funil.clientesMes,
      conversoes: funil.conversoes,
      credito_projetado_mes: funil.creditoTotal,
      comissao_projetada_mes: funil.comissaoTotal,
      atinge_meta: atingeMeta,
    }
    onRitmoChange(ritmo, snapshot)
  }, [ritmo, funil, atingeMeta, onRitmoChange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Funil de Vendas — Modelo de Ritmo</h2>
        {ritmo === 1 && (
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
            Padrão Ouro: 1x1x1x1
          </div>
        )}
      </div>

      {/* Ritmo selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Ritmo</p>
        <div className="flex gap-2">
          {RITMOS.map((r) => (
            <button
              key={r}
              onClick={() => !readOnly && setRitmo(r)}
              disabled={readOnly}
              className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all ${
                ritmo === r
                  ? 'bg-violet-500 text-white shadow-lg scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${r === 1 ? 'ring-2 ring-amber-400' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Modelo {ritmo}x{ritmo}x{ritmo}x{ritmo}
        </p>
      </div>

      {/* Cascade */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Cascata</p>

        <div className="space-y-3">
          <CascadeItem
            icon={<Users size={18} />}
            color="bg-teal-100 text-teal-700"
            label="Cadastros/dia"
            value={funil.cadastrosDia}
            detail={`= ${funil.prospeccoesSemana} prospecções/semana = ~${funil.contatosMes} contatos/mês`}
          />
          <div className="flex justify-center"><div className="w-0.5 h-4 bg-slate-200" /></div>
          <CascadeItem
            icon={<Phone size={18} />}
            color="bg-blue-100 text-blue-700"
            label="Reuniões qualificadas/semana"
            value={funil.reunioesSemana}
            detail={`= ${funil.reunioesMes} reuniões/mês`}
          />
          <div className="flex justify-center"><div className="w-0.5 h-4 bg-slate-200" /></div>
          <CascadeItem
            icon={<Handshake size={18} />}
            color="bg-violet-100 text-violet-700"
            label="Clientes novos/mês"
            value={funil.clientesMes}
          />
        </div>
      </div>

      {/* Conversão grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Conversões por Operação</p>
        <div className="grid grid-cols-4 gap-3">
          {funil.conversoes.map((c) => (
            <div key={c.pct} className={`rounded-lg p-3 text-center ${
              c.pct === 100 ? 'bg-emerald-50 border border-emerald-200' :
              c.pct === 75 ? 'bg-teal-50 border border-teal-200' :
              c.pct === 50 ? 'bg-blue-50 border border-blue-200' :
              'bg-violet-50 border border-violet-200'
            }`}>
              <p className="text-lg font-bold text-slate-800">{c.pct}%</p>
              <p className="text-sm font-medium text-slate-700">{formatCurrency(c.credito)}</p>
              <p className="text-xs text-slate-500">{c.clientes} cliente{c.clientes !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projection */}
      <div className={`rounded-xl p-5 border ${
        atingeMeta
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-rose-50 border-rose-200'
      }`}>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Projeção Mensal</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">Crédito</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(funil.creditoTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Comissão líquida</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(funil.comissaoTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Meta receita</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-slate-800">{formatCurrency(proj.metaReceitaMensal)}</p>
              {atingeMeta ? (
                <CheckCircle2 size={20} className="text-emerald-500" />
              ) : (
                <AlertCircle size={20} className="text-rose-500" />
              )}
            </div>
            <p className={`text-xs font-medium mt-0.5 ${atingeMeta ? 'text-emerald-600' : 'text-rose-600'}`}>
              {atingeMeta ? 'ATINGE A META' : `Faltam ${formatCurrency(proj.metaReceitaMensal - funil.comissaoTotal)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Retroalimentação */}
      {dadosReais && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            <TrendingUp size={14} className="inline mr-1" />
            Retroalimentação (últimos 45 dias)
          </p>
          <div className="grid grid-cols-3 gap-4">
            <RetroComparison label="Cadastros/dia" combinado={ritmo} realizado={dadosReais.cadastrosDiaMedio} />
            <RetroComparison label="Reuniões/sem" combinado={ritmo} realizado={dadosReais.reunioesSemanaMedia} />
            <RetroComparison label="Clientes/mês" combinado={ritmo} realizado={dadosReais.clientesMesMedia} />
          </div>
        </div>
      )}
    </div>
  )
}

function CascadeItem({ icon, color, label, value, detail }: {
  icon: React.ReactNode
  color: string
  label: string
  value: number
  detail?: string
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${color}`}>
      {icon}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {detail && <p className="text-xs opacity-75 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

function RetroComparison({ label, combinado, realizado }: {
  label: string
  combinado: number
  realizado: number
}) {
  const diff = realizado - combinado
  const positive = diff >= 0

  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-400">Combinado: <strong className="text-slate-700">{combinado}</strong></p>
      <p className={`text-sm ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        Realizado: <strong>{realizado.toFixed(1)}</strong>
        <span className="text-xs ml-1">({positive ? '+' : ''}{diff.toFixed(1)})</span>
      </p>
    </div>
  )
}
