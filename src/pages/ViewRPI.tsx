import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { isSupabaseConfigured, localRPIs } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import type { RPI } from '../types/database'
import { useAcoes } from '../hooks/useAcoes'
import ActionList from '../components/ActionList'
import CopyButton from '../components/CopyButton'

export default function ViewRPI() {
  const { id: parceiroId, rpiId } = useParams()
  const navigate = useNavigate()
  const [rpi, setRPI] = useState<RPI | null>(null)
  const [loading, setLoading] = useState(true)
  const { acoes } = useAcoes({ rpiId: rpiId || '' })

  useEffect(() => {
    if (!rpiId) return
    if (isSupabaseConfigured) {
      supabase.from('rpis').select('*').eq('id', rpiId).single().then(({ data }) => {
        setRPI(data as RPI | null)
        setLoading(false)
      })
    } else {
      setRPI(localRPIs.selectById(rpiId))
      setLoading(false)
    }
  }, [rpiId])

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando...</div>
  if (!rpi) return <div className="text-center py-12 text-slate-500">RPI não encontrada.</div>

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6 lg:p-8">
      <button onClick={() => navigate(`/parceiros/${parceiroId}`)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft size={16} /> Voltar ao Perfil
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">RPI #{rpi.numero_sequencial}</h1>
            <p className="text-sm text-slate-500">{formatDate(rpi.data_reuniao)} {rpi.duracao_minutos ? `• ${rpi.duracao_minutos} min` : ''}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            rpi.status === 'finalizada' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {rpi.status === 'finalizada' ? 'Finalizada' : 'Em andamento'}
          </span>
        </div>

        {rpi.notas_gerais && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas Gerais</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{rpi.notas_gerais}</p>
          </div>
        )}

        {rpi.funil_vendas_snapshot && (
          <div className="border border-slate-100 rounded-2xl p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Snapshot do Pipeline no momento da RPI</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Object.entries(rpi.funil_vendas_snapshot as unknown as Record<string, number>).map(([key, value]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">{key.replace('_', ' ')}</p>
                  <p className="text-lg font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {acoes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Plano de Ação</h3>
            <ActionList acoes={acoes} readOnly />
          </div>
        )}

        {/* Deliverables */}
        {(rpi.hubspot_texto || rpi.plano_acao_texto || rpi.relatorio_texto) && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Entregáveis</h3>
            {rpi.plano_acao_texto && (
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Plano de Ação</span>
                  <CopyButton text={rpi.plano_acao_texto} label="Copiar" />
                </div>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{rpi.plano_acao_texto}</pre>
              </div>
            )}
            {rpi.hubspot_texto && (
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Texto HubSpot</span>
                  <CopyButton text={rpi.hubspot_texto} label="Copiar" />
                </div>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{rpi.hubspot_texto}</pre>
              </div>
            )}
          </div>
        )}

        {rpi.proxima_rpi_prevista && (
          <p className="text-sm text-slate-500">Próxima RPI prevista: <strong>{formatDate(rpi.proxima_rpi_prevista)}</strong></p>
        )}
      </div>
    </div>
  )
}
