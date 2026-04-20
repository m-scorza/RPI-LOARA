import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Bell,
  Search,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { GERENTE_NOME } from '../lib/format'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/parceiros', label: 'Parceiros', icon: Users },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  
  const currentRoute = NAV_ITEMS.find(item => 
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  )

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#0F172A] text-white transition-all duration-500 ease-in-out z-20 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-500">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-teal-500/20">L</div>
              <span className="text-xl font-bold tracking-tighter">
                LOARA<span className="text-teal-500">RPI</span>
              </span>
            </div>
          )}
          {collapsed && (
             <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-white mx-auto shadow-lg shadow-teal-500/20">L</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 space-y-2 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={22} className={`shrink-0 transition-transform duration-300 group-hover:scale-110`} />
              {!collapsed && <span className="animate-in slide-in-from-left-2 duration-300">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User / Bottom Section */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all w-full ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut size={22} className="shrink-0" />
            {!collapsed && <span>Sair da Conta</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div className="h-6 w-[1px] bg-slate-100 mx-2" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest animate-in fade-in slide-in-from-left-4">
              {currentRoute?.label || 'Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-slate-400 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <Search size={16} />
              <input type="text" placeholder="Pesquisar..." className="bg-transparent border-none outline-none text-xs text-slate-600 w-40" />
            </div>
            
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800">Olá, {GERENTE_NOME}</p>
                <p className="text-[10px] text-teal-600 font-medium">Gerente Regional</p>
              </div>
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white">
                {GERENTE_NOME[0]}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative p-8">
           <Outlet />
        </main>
      </div>
    </div>
  )
}
