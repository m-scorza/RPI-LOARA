import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-card rounded-2xl shadow-sm border border-slate-200 p-12 max-w-md w-full">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard size={32} className="text-teal-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-500">
          Em construcao — Fase 2
        </p>
        <p className="text-sm text-slate-400 mt-4">
          O dashboard consolidado com KPIs de todos os parceiros sera implementado na proxima fase.
        </p>
      </div>
    </div>
  )
}
