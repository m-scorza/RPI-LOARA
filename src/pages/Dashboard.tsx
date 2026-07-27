import { useDashboard } from '../hooks/useDashboard'
import { formatCurrency, formatNumber, GERENTE_NOME } from '../lib/format'
import KPICard from '../components/KPICard'
import FunnelChart from '../components/FunnelChart'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Calendar, TrendingUp, ArrowRight, Sparkles, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { stats, proximasRpis, loading, error } = useDashboard()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 glass-card rounded-3xl border-rose-100 text-center">
        <p className="text-rose-600 font-bold mb-2">Ops! Ocorreu um erro ao carregar os dados.</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    )
  }

  const chartData = stats.monthlyPerformance && stats.monthlyPerformance.length > 0 
    ? stats.monthlyPerformance 
    : [
        { name: 'Jan', total: 0 },
        { name: 'Fev', total: 0 },
        { name: 'Mar', total: 0 },
        { name: 'Abr', total: 0 },
        { name: 'Mai', total: 0 },
        { name: 'Jun', total: 0 },
      ]

  const funnelData = [
    { etapa: 'Lead', count: stats.funnel?.lead || 0, valor: 0 },
    { etapa: 'Qualificado', count: stats.funnel?.qualificado || 0, valor: 0 },
    { etapa: 'Oportunidade', count: stats.funnel?.oportunidade || 0, valor: 0 },
    { etapa: 'Cliente', count: stats.funnel?.cliente || 0, valor: 0 },
    { etapa: 'Crédito', count: stats.funnel?.credito_tomado || 0, valor: stats.creditosTomadosYtd },
  ]

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Welcome Header */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-400 text-sm font-bold uppercase tracking-wider">
              <Sparkles size={16} />
              <span>Visão Geral do Sistema</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              Olá, <span className="text-teal-400">{GERENTE_NOME}</span>! 
            </h1>
            <p className="text-slate-400 font-medium max-w-md">
              Seu faturamento este ano já atingiu <span className="text-emerald-400">75% da meta global</span>. 
              Mantenha o ritmo!
            </p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-center min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">Status Global</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Operacional
                </span>
             </div>
             <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-center min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">Atualização</span>
                <span className="text-white font-bold text-sm">Agora</span>
             </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </section>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Crédito Realizado (YTD)"
          value={formatCurrency(stats.creditoYtd)}
          trend="up"
          color="teal"
          progress={75}
          target="R$ 1.5M"
        />
        <KPICard
          label="Comissão Bruta (YTD)"
          value={formatCurrency(stats.comissaoYtd)}
          trend="up"
          color="emerald"
          progress={68}
          target="R$ 450k"
        />
        <KPICard
          label="Pipeline Total"
          value={formatCurrency(stats.pipelineTotal)}
          trend="neutral"
          color="blue"
        />
        <KPICard
          label="Leads Ativos"
          value={formatNumber(stats.totalLeadsAtivos)}
          trend="up"
          color="violet"
          progress={82}
          target="50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8 text-slate-800">
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                   Performance Mensal
                   <TrendingUp className="text-emerald-500" size={18} />
                </h3>
                <p className="text-xs text-slate-400 font-medium">Faturamento realizado em 2024</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-100 text-[10px] font-bold text-slate-500">
                  <Target size={12} className="text-teal-500" />
                  Meta: R$ 2M
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2DD4BF" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0D9488" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(val) => `R$${Math.round(val/1000)}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-xl">
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 tracking-tight">Agenda de RPIs</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Próximas Reuniões</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/agenda')}
                className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors"
              >
                Ver Agenda
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proximasRpis.length > 0 ? (
                proximasRpis.slice(0, 4).map((rpi, i) => (
                  <div 
                    key={i} 
                    onClick={() => navigate(`/parceiros/${rpi.parceiro_id}`)}
                    className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center font-bold text-xs text-teal-600">
                          {rpi.nome[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{rpi.nome}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(rpi.proxima_rpi).toLocaleDateString()}
                          </p>
                        </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rpi.urgencia === 'atrasada' ? 'bg-rose-100 text-rose-600' :
                      rpi.urgencia === 'urgente' ? 'bg-amber-100 text-amber-600' :
                      rpi.urgencia === 'próxima' ? 'bg-blue-100 text-blue-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {rpi.urgencia}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 col-span-2 text-center text-slate-300">Nenhuma RPI agendada</p>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Column */}
        <div className="space-y-8">
          <div className="glass-panel rounded-3xl p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Pipeline</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Distribuição Comercial</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-slate-200/50">
                <TrendingUp size={20} className="text-teal-500" />
              </div>
            </div>
            
            <div className="flex-1">
              <FunnelChart data={funnelData} />
            </div>

            <div className="mt-8 p-6 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl text-white shadow-xl shadow-teal-500/30 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Insight Analítico</p>
                <p className="text-xs font-bold leading-relaxed mb-6">
                  Seu pipeline atual de {formatCurrency(stats.pipelineTotal)} tem um potencial de conversão de <span className="text-yellow-300">R$ 420k</span> este mês.
                </p>
                <button 
                  onClick={() => navigate('/parceiros')}
                  className="w-full py-3 bg-white text-teal-600 hover:bg-teal-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  Otimizar Pipeline
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                 <TrendingUp size={80} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
