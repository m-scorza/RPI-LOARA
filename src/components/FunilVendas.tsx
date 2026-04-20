import { useState, useMemo, useEffect } from 'react'
import { Users, Phone, Handshake, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Parceiro, FunilVendasSnapshot } from '../types/database'
import { calculateRevenueProjection } from '../lib/revenueEngine'
import { formatCurrency } from '../lib/format'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

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

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cascade Visual */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo Operacional Mensal</p>
          <div className="space-y-4">
            <CascadeItem
              icon={<Users size={18} />}
              color="bg-teal-50 text-teal-600"
              label="Prospecções"
              value={funil.prospeccoesSemana * 4}
              detail="Volume total de contatos/mês"
            />
            <div className="flex justify-center -my-2"><div className="w-0.5 h-6 bg-slate-100" /></div>
            <CascadeItem
              icon={<Phone size={18} />}
              color="bg-blue-50 text-blue-600"
              label="Reuniões"
              value={funil.reunioesMes}
              detail="Volume total de reuniões/mês"
            />
            <div className="flex justify-center -my-2"><div className="w-0.5 h-6 bg-slate-100" /></div>
            <CascadeItem
              icon={<Handshake size={18} />}
              color="bg-violet-50 text-violet-600"
              label="Fechamentos"
              value={funil.clientesMes}
              detail="Novos contratos/mês"
            />
          </div>
        </div>

        {/* Projection Chart */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={80} className="text-white" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Projeção de Performance (R$)</p>
          
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Ponderado', valor: funil.creditoTotal * comissaoLiquida },
                  { name: 'Meta', valor: proj.metaReceitaMensal }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl shadow-2xl">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{payload[0].payload.name}</p>
                          <p className="text-sm font-black text-white">{formatCurrency(Number(payload[0].value))}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="valor" radius={[12, 12, 12, 12]} barSize={40}>
                  <Cell fill="#2DD4BF" />
                  <Cell fill="#1E293B" stroke="#334155" strokeWidth={2} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1">Gap para Meta</p>
                <p className="text-2xl font-black text-white tracking-tighter">
                  {atingeMeta ? 'Meta Atingida' : formatCurrency(proj.metaReceitaMensal - funil.comissaoTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Atingimento</p>
                <p className={`text-sm font-black ${atingeMeta ? 'text-teal-400' : 'text-rose-400'}`}>
                  {Math.round((funil.comissaoTotal / proj.metaReceitaMensal) * 100)}%
                </p>
              </div>
            </div>
          </div>
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
