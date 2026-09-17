import { AlertTriangle, Bell, CalendarDays, ChartNoAxesCombined, CheckCircle2, FileChartColumn, Goal, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, WalletCards, WifiOff, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import { brl, dueLabel } from '../utils/format'

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

const daysUntil = (date: string) => {
  const target = new Date(`${date}T12:00:00`)
  const today = new Date()
  today.setHours(12,0,0,0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const notifyRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const { preferences, accounts, loading, error, clearError } = useFinance()
  const { signOut, isDemo } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (notifyRef.current && !notifyRef.current.contains(event.target as Node)) setNotificationsOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const alerts = useMemo(() => accounts
    .filter((account) => {
      if (account.kind === 'pagar' && account.status === 'pago') return false
      if (account.kind === 'receber' && account.status === 'recebido') return false
      return daysUntil(account.dueDate) <= 7
    })
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
    .slice(0,6), [accounts])

  const criticalCount = alerts.filter((account)=>daysUntil(account.dueDate)<=1 || account.status==='atrasado').length

  const logout = async () => {
    try {
      await signOut()
      nav('/login', { replace: true })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível encerrar a sessão.', 'error')
    }
  }

  return <div className="app-shell">
    {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head"><Brand/><button className="icon-btn mobile-only" aria-label="Fechar menu" onClick={() => setOpen(false)}><X/></button></div>
      <nav>{links.map(([to,label,Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <button className="logout" onClick={()=>void logout()}><LogOut size={18}/> Sair</button>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-only" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu/></button>
        <div className="topbar-spacer"/>
        {!online && <div className="connection-chip offline"><WifiOff size={14}/> Sem conexão</div>}
        <div className="notification-wrap" ref={notifyRef}>
          <button className="icon-btn notify" aria-label="Notificações" aria-expanded={notificationsOpen} onClick={(e)=>{e.stopPropagation();setNotificationsOpen(v=>!v)}}><Bell size={19}/>{criticalCount > 0 && <span>{criticalCount}</span>}</button>
          {notificationsOpen && <div className="notification-panel" onClick={e=>e.stopPropagation()}>
            <div className="notification-head"><div><strong>Alertas financeiros</strong><span>{alerts.length ? `${alerts.length} compromisso${alerts.length>1?'s':''} próximo${alerts.length>1?'s':''}` : 'Tudo em ordem'}</span></div></div>
            <div className="notification-list">
              {alerts.length===0 ? <div className="notification-empty"><CheckCircle2 size={20}/><span>Nenhuma conta crítica nos próximos 7 dias.</span></div> : alerts.map(account=>{
                const critical=daysUntil(account.dueDate)<=1 || account.status==='atrasado'
                return <button type="button" key={account.id} className="notification-item" onClick={()=>{setNotificationsOpen(false);nav('/contas')}}>
                  <div className={`notification-icon ${critical?'critical':'warning'}`}><AlertTriangle size={16}/></div>
                  <div><strong>{account.name}</strong><span>{dueLabel(account.dueDate)} · {brl(account.amount)}</span></div>
                </button>
              })}
            </div>
            <button type="button" className="notification-footer" onClick={()=>{setNotificationsOpen(false);nav('/contas')}}>Ver todas as contas</button>
          </div>}
        </div>
        <div className="user-chip"><div className="avatar">{preferences.displayName.slice(0,1).toUpperCase()}</div><div><strong>{preferences.displayName}</strong><span>{isDemo ? 'Demonstração' : preferences.mode === 'empresa' ? 'Empresa' : 'Pessoal'}</span></div></div>
      </header>

      <div className="content">
        {error && <div className="sync-error"><span>{error}</span><button type="button" onClick={clearError} aria-label="Fechar erro"><X size={15}/></button></div>}
        {loading && <div className="sync-status"><span className="mini-spinner"/> Sincronizando dados...</div>}
        <Outlet/>
      </div>
    </main>
  </div>
}
