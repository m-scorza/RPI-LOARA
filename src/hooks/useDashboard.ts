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
  monthlyPerformance: Array<{ name: string; total: number }>
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
    totalLeadsAtivos: 0,
    monthlyPerformance: [],
    funnel: { lead: 0, qualificado: 0, oportunidade: 0, cliente: 0, doc: 0, credito_tomado: 0 }
  })
  const [proximasRpis, setProximasRpis] = useState<ProximaRpi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!isSupabaseConfigured) {
        // Import local storage tools dynamically or use existing ones
        const { localParceiros, localLeads, localAcompanhamento } = await import('../lib/localStore')
        
        const parceiros = localParceiros.selectAll().filter(p => p.status === 'ativo')
        const leads = localLeads.selectAll()
        const historical = localAcompanhamento.selectAll()
        
        const activeLeads = leads.filter(l => l.status === 'Ativo')
        const totalCreditoTomado = historical.reduce((acc, curr) => acc + (curr.creditos_tomados || 0), 0)
        const totalComissao = historical.reduce((acc, curr) => acc + (curr.comissao_realizada || 0), 0)

        const funnelCounts = activeLeads.reduce((acc, curr) => {
          const etapa = curr.etapa.toLowerCase().replace(' ', '_') as keyof DashboardStats['funnel']
          if (acc[etapa] !== undefined) acc[etapa]++
          return acc
        }, { lead: 0, qualificado: 0, oportunidade: 0, cliente: 0, doc: 0, credito_tomado: 0 })

        // Aggregate monthly performance
        const last6Months = Array.from({ length: 6 }).map((_, i) => {
          const d = new Date()
          d.setMonth(d.getMonth() - i)
          return { month: d.getMonth() + 1, year: d.getFullYear(), name: d.toLocaleString('default', { month: 'short' }) }
        }).reverse()

        const performanceArray = last6Months.map(m => {
          const monthData = historical.filter(h => h.mes === m.month && h.ano === m.year)
          return {
            name: m.name,
            total: monthData.reduce((acc, curr) => acc + (curr.creditos_tomados || 0), 0)
          }
        })

        setStats({
          creditoYtd: totalCreditoTomado,
          comissaoYtd: totalComissao,
          leadsYtd: leads.length,
          creditosTomadosYtd: totalCreditoTomado,
          pipelineTotal: activeLeads.reduce((acc, curr) => acc + (curr.demanda || 0), 0),
          pipelinePonderado: activeLeads.reduce((acc, curr) => acc + (curr.demanda || 0) * curr.probabilidade, 0),
          totalLeadsAtivos: activeLeads.length,
          funnel: funnelCounts,
          monthlyPerformance: performanceArray
        })

        // Mock proximas rpis for local mode by checking partner categories
        const upcomingRpis = parceiros
          .filter(p => p.categoria !== 'Bronze')
          .slice(0, 10)
          .map(p => ({
            parceiro_id: p.id,
            nome: p.nome,
            categoria: p.categoria,
            proxima_rpi: new Date().toISOString(),
            urgencia: 'próxima' as const
          }))
        
        setProximasRpis(upcomingRpis)
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

      // Fetch Global Monthly Performance
      const { data: globalPerf, error: perfError } = await supabase
        .from('acompanhamento_mensal')
        .select('mes, ano, credito_tomado')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
        .limit(50) // Get enough to aggregate

      if (perfError) throw perfError

      // Aggregate global performance
      const last6MonthsArr = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        return { month: d.getMonth() + 1, year: d.getFullYear(), name: d.toLocaleString('default', { month: 'short' }) }
      }).reverse()

      const globalPerformanceArray = last6MonthsArr.map(m => {
        const monthData = (globalPerf || []).filter(h => h.mes === m.month && h.ano === m.year)
        return {
          name: m.name,
          total: monthData.reduce((acc, curr) => acc + (curr.credito_tomado || 0), 0)
        }
      })

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
        ...aggregatedPipeline,
        monthlyPerformance: globalPerformanceArray
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
