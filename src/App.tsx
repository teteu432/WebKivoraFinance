import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'

const Accounts = lazy(() => import('./pages/Accounts'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Login = lazy(() => import('./pages/Login'))
const Planning = lazy(() => import('./pages/Planning'))
const Reports = lazy(() => import('./pages/Reports'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Settings = lazy(() => import('./pages/Settings'))
const Strategy = lazy(() => import('./pages/Strategy'))
const Transactions = lazy(() => import('./pages/Transactions'))

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="loading-ring" />
      <strong>Web Kivora Finance</strong>
      <span>Carregando...</span>
    </div>
  )
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return isAuthenticated
    ? <AppLayout />
    : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
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

        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? '/dashboard' : '/login'}
              replace
            />
          }
        />
      </Routes>
    </Suspense>
  )
}