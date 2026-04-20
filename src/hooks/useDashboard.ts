import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/localStore'

export interface DashboardStats {
  creditoYtd: number
  comissaoYtd: number
  leadsYtd: number
  creditosTomadosYtd: number
  pipelineTotal: number
  pipelinePonderado: number
  totalLeadsAtivos: number
  funnel: {
    lead: number
    qualificado: number
    oportunidade: number
    cliente: number
    doc: number
    credito_tomado: number
  }
}

export interface ProximaRpi {
  parceiro_id: string
  nome: string
  categoria: string
  proxima_rpi: string
  urgencia: 'atrasada' | 'urgente' | 'próxima' | 'no_prazo'
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    creditoYtd: 0,
    comissaoYtd: 0,
    leadsYtd: 0,
    creditosTomadosYtd: 0,
    pipelineTotal: 0,
    pipelinePonderado: 0,
    totalLeadsAtivos: 0
  })
  const [proximasRpis, setProximasRpis] = useState<ProximaRpi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!isSupabaseConfigured) {
        // Fallback or empty data for local mode
        setLoading(false)
        return
      }

      // Fetch YTD stats
      const { data: ytdData, error: ytdError } = await supabase
        .from('vw_parceiro_ytd')
        .select('*')

      if (ytdError) throw ytdError

      // Fetch Pipeline stats
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('vw_pipeline_parceiro')
        .select('*')

      if (pipelineError) throw pipelineError

      // Fetch Upcoming RPIs
      const { data: rpiData, error: rpiError } = await supabase
        .from('vw_proximas_rpis')
        .select('*')
        .limit(10)

      if (rpiError) throw rpiError

      // Aggregate YTD
      const aggregatedYtd = (ytdData || []).reduce((acc, curr) => ({
        creditoYtd: acc.creditoYtd + (curr.credito_ytd || 0),
        comissaoYtd: acc.comissaoYtd + (curr.comissao_ytd || 0),
        leadsYtd: acc.leadsYtd + (curr.leads_ytd || 0),
        creditosTomadosYtd: acc.creditosTomadosYtd + (curr.creditos_tomados_ytd || 0),
      }), { creditoYtd: 0, comissaoYtd: 0, leadsYtd: 0, creditosTomadosYtd: 0 })

      // Aggregate Pipeline
      const aggregatedPipeline = (pipelineData || []).reduce((acc, curr) => ({
        pipelineTotal: acc.pipelineTotal + (curr.demanda_total || 0),
        pipelinePonderado: acc.pipelinePonderado + (curr.credito_ponderado || 0),
        totalLeadsAtivos: acc.totalLeadsAtivos + (curr.leads_ativos || 0),
        funnel: {
          lead: acc.funnel.lead + (curr.em_lead || 0),
          qualificado: acc.funnel.qualificado + (curr.em_qualificado || 0),
          oportunidade: acc.funnel.oportunidade + (curr.em_oportunidade || 0),
          cliente: acc.funnel.cliente + (curr.em_cliente || 0),
          doc: acc.funnel.doc + (curr.em_doc || 0),
          credito_tomado: acc.funnel.credito_tomado + (curr.em_credito_tomado || 0),
        }
      }), { 
        pipelineTotal: 0, 
        pipelinePonderado: 0, 
        totalLeadsAtivos: 0,
        funnel: { lead: 0, qualificado: 0, oportunidade: 0, cliente: 0, doc: 0, credito_tomado: 0 }
      })

      setStats({
        ...aggregatedYtd,
        ...aggregatedPipeline
      })
      setProximasRpis(rpiData as ProximaRpi[])

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return { stats, proximasRpis, loading, error, refresh: fetchDashboardData }
}
