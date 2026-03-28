import { HashRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/authStore'
import PinAuth from './components/PinAuth'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ParceirosLista from './pages/ParceirosLista'
import ParceiroPerfil from './pages/ParceiroPerfil'
import CondutorRPI from './pages/CondutorRPI'
import ViewRPI from './pages/ViewRPI'
import Agenda from './pages/Agenda'
import Configuracoes from './pages/Configuracoes'

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return (
      <>
        <PinAuth
          onAuthenticate={() => {
            // PinAuth already validates the PIN internally.
            // When onAuthenticate is called, the PIN is correct.
            // We call authenticate with the correct PIN to set the store state.
            const correctPin = import.meta.env.VITE_APP_PIN || '1234'
            useAuthStore.getState().authenticate(correctPin)
          }}
        />
        <Toaster position="bottom-right" richColors />
      </>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parceiros" element={<ParceirosLista />} />
          <Route path="/parceiros/:id" element={<ParceiroPerfil />} />
          <Route path="/parceiros/:id/rpi/nova" element={<CondutorRPI />} />
          <Route path="/parceiros/:id/rpi/:rpiId" element={<ViewRPI />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors />
    </HashRouter>
  )
}
