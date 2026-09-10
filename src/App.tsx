import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import Accounts from './pages/Accounts'
import CalendarPage from './pages/CalendarPage'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import Planning from './pages/Planning'
import Reports from './pages/Reports'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'
import Strategy from './pages/Strategy'
import Transactions from './pages/Transactions'

function LoadingScreen() {
  return <div className="app-loading"><div className="loading-ring"/><strong>Web Kivora Finance</strong><span>Carregando sua conta...</span></div>
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transacoes" element={<Transactions />} />
        <Route path="/contas" element={<Accounts />} />
        <Route path="/planejamento" element={<Planning />} />
        <Route path="/estrategia" element={<Strategy />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
