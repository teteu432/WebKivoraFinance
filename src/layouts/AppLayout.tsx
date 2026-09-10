import { Bell, CalendarDays, ChartNoAxesCombined, FileChartColumn, Goal, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, WalletCards, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useFinance } from '../contexts/FinanceContext'
import { useAuth } from '../contexts/AuthContext'

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/transacoes', 'Transações', ReceiptText],
  ['/contas', 'Contas', WalletCards],
  ['/planejamento', 'Planejamento', Goal],
  ['/estrategia', 'Estratégia Financeira', ChartNoAxesCombined],
  ['/calendario', 'Calendário', CalendarDays],
  ['/relatorios', 'Relatórios', FileChartColumn],
  ['/configuracoes', 'Configurações', Settings],
] as const

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const { preferences, accounts, loading, error } = useFinance()
  const { signOut, isDemo } = useAuth()
  const overdue = accounts.filter(a => a.kind === 'pagar' && a.status === 'atrasado').length
  const logout = async () => { await signOut(); nav('/login', { replace: true }) }
  return <div className="app-shell">
    {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head"><Brand/><button className="icon-btn mobile-only" onClick={() => setOpen(false)}><X/></button></div>
      <nav>{links.map(([to,label,Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <button className="logout" onClick={logout}><LogOut size={18}/> Sair</button>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-only" onClick={() => setOpen(true)}><Menu/></button>
        <div className="topbar-spacer"/>
        <button className="icon-btn notify" aria-label="Notificações"><Bell size={19}/>{overdue > 0 && <span>{overdue}</span>}</button>
        <div className="user-chip"><div className="avatar">{preferences.displayName.slice(0,1).toUpperCase()}</div><div><strong>{preferences.displayName}</strong><span>{isDemo ? 'Demonstração' : preferences.mode === 'empresa' ? 'Empresa' : 'Pessoal'}</span></div></div>
      </header>
      <div className="content">{error && <div className="sync-error">{error}</div>}{loading && <div className="sync-status">Sincronizando dados...</div>}<Outlet/></div>
    </main>
  </div>
}
