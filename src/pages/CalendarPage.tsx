import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import FinancialCard from '../components/FinancialCard'
import { useFinance } from '../contexts/FinanceContext'
import type { Account } from '../types'
import { brl, daysUntil, dueLabel, localDateISO, priorityClass, shortDate } from '../utils/format'

const isSettled = (account: Account) => account.status === 'pago' || account.status === 'recebido'

const eventClass = (account: Account) => {
  if (isSettled(account)) return 'settled'
  if (account.status === 'atrasado' || daysUntil(account.dueDate) < 0) return 'danger'
  if (account.kind === 'receber') return 'income'
  return priorityClass(account.dueDate)
}

const accountStatusLabel = (account: Account) => {
  if (account.status === 'pago') return 'Pago'
  if (account.status === 'recebido') return 'Recebido'
  if (account.kind === 'receber') {
    const days = daysUntil(account.dueDate)
    if (days < 0) return `A receber · ${Math.abs(days)}d atrasado`
    if (days === 0) return 'A receber hoje'
    if (days === 1) return 'A receber amanhã'
    return `A receber em ${days} dias`
  }
  return dueLabel(account.dueDate)
}

export default function CalendarPage() {
  const { accounts } = useFinance()
  const today = new Date()
  const todayISO = localDateISO(today)
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayISO)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const start = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: start + days }, (_, index) => index < start ? null : index - start + 1)

  const monthAccounts = useMemo(() => accounts
    .filter((account) => {
      const date = new Date(`${account.dueDate}T12:00:00`)
      return date.getFullYear() === year && date.getMonth() === month
    })
    .sort((a,b) => a.dueDate.localeCompare(b.dueDate)), [accounts, year, month])

  const byDay = useMemo(() => {
    const map = new Map<number, Account[]>()
    monthAccounts.forEach((account) => {
      const day = new Date(`${account.dueDate}T12:00:00`).getDate()
      map.set(day, [...(map.get(day) || []), account])
    })
    return map
  }, [monthAccounts])

  const pendingMonth = monthAccounts.filter((account) => !isSettled(account))
  const monthToPay = pendingMonth.filter((account) => account.kind === 'pagar').reduce((sum, account) => sum + account.amount, 0)
  const monthToReceive = pendingMonth.filter((account) => account.kind === 'receber').reduce((sum, account) => sum + account.amount, 0)
  const overdueToPay = accounts
    .filter((account) => account.kind === 'pagar' && !isSettled(account) && daysUntil(account.dueDate) < 0)
    .reduce((sum, account) => sum + account.amount, 0)
  const monthNet = monthToReceive - monthToPay

  const selectedAccounts = selectedDate
    ? accounts.filter((account) => account.dueDate === selectedDate).sort((a,b) => Number(isSettled(a)) - Number(isSettled(b)))
    : []

  const agendaAccounts = selectedAccounts.length > 0
    ? selectedAccounts
    : monthAccounts.filter((account) => !isSettled(account)).slice(0, 7)

  const selectedLabel = selectedAccounts.length > 0
    ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))
    : 'Próximos compromissos do mês'

  const goToToday = () => {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(localDateISO(now))
  }

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setCursor(next)
    setSelectedDate('')
  }

  return <div className="page-stack calendar-page">
    <div className="page-title">
      <div>
        <span className="eyebrow">Agenda financeira</span>
        <h1>Calendário</h1>
        <p>Acompanhe vencimentos, recebimentos e compromissos sem perder nenhuma data importante.</p>
      </div>
      <div className="actions">
        <button type="button" className="secondary-btn" onClick={goToToday}><CalendarCheck2 size={16}/> Hoje</button>
        <Link className="primary-btn" to="/contas">Gerenciar contas</Link>
      </div>
    </div>

    <section className="metrics-grid calendar-metrics">
      <FinancialCard title="A pagar no mês" value={monthToPay} icon={ArrowDownRight} hint={`${pendingMonth.filter(account => account.kind === 'pagar').length} compromisso(s) pendente(s)`} tone="red"/>
      <FinancialCard title="A receber no mês" value={monthToReceive} icon={ArrowUpRight} hint={`${pendingMonth.filter(account => account.kind === 'receber').length} recebimento(s) previsto(s)`} tone="green"/>
      <FinancialCard title="Pagamentos vencidos" value={overdueToPay} icon={AlertTriangle} hint={`${accounts.filter(account => account.kind === 'pagar' && !isSettled(account) && daysUntil(account.dueDate) < 0).length} conta(s) precisam de atenção`} tone="red"/>
      <FinancialCard title="Balanço previsto do mês" value={monthNet} icon={Landmark} hint="A receber menos compromissos pendentes" tone={monthNet >= 0 ? 'green' : 'purple'}/>
    </section>

    <section className="calendar-workspace">
      <div className="panel calendar-panel">
        <div className="calendar-nav">
          <button className="icon-btn calendar-arrow" type="button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={19}/></button>
          <div>
            <span>Visão mensal</span>
            <h2>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor)}</h2>
          </div>
          <button className="icon-btn calendar-arrow" type="button" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ChevronRight size={19}/></button>
        </div>

        <div className="calendar-legend">
          <span><i className="legend-dot payable"/> A pagar</span>
          <span><i className="legend-dot receivable"/> A receber</span>
          <span><i className="legend-dot overdue"/> Atrasado</span>
          <span><i className="legend-dot settled"/> Concluído</span>
        </div>

        <div className="calendar-scroll">
          <div className="calendar-head">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((day, index) => {
              if (!day) return <div className="calendar-cell muted-cell" key={`empty-${index}`}/>
              const iso = localDateISO(new Date(year, month, day))
              const events = byDay.get(day) || []
              const isToday = iso === todayISO
              const isSelected = iso === selectedDate
              return <button
                type="button"
                className={`calendar-cell calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                key={iso}
                onClick={() => setSelectedDate(iso)}
              >
                <div className="calendar-day-number"><b>{day}</b>{isToday && <span>Hoje</span>}</div>
                <div className="calendar-day-events">
                  {events.slice(0,3).map((account) => <span key={account.id} className={`calendar-event ${eventClass(account)}`} title={`${account.name} · ${brl(account.amount)}`}>
                    <CalendarDays size={11}/><span>{account.name}</span><strong>{brl(account.amount)}</strong>
                  </span>)}
                  {events.length > 3 && <small className="calendar-more">+{events.length - 3} outro{events.length - 3 > 1 ? 's' : ''}</small>}
                </div>
              </button>
            })}
          </div>
        </div>
      </div>

      <aside className="panel calendar-agenda-panel">
        <div className="panel-head">
          <div><h2>Agenda</h2><p className="calendar-selected-label">{selectedLabel}</p></div>
          <CalendarDays size={19}/>
        </div>

        {agendaAccounts.length === 0 ? <EmptyState text="Nenhum compromisso para esta seleção."/> : <div className="calendar-agenda-list">
          {agendaAccounts.map((account) => <Link to="/contas" className="calendar-agenda-item" key={account.id}>
            <div className={`agenda-status-icon ${eventClass(account)}`}>{account.kind === 'receber' ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}</div>
            <div className="grow">
              <strong>{account.name}</strong>
              <span>{shortDate(account.dueDate)} · {accountStatusLabel(account)}</span>
            </div>
            <div className="calendar-agenda-value">
              <strong className={account.kind === 'receber' ? 'positive' : isSettled(account) ? '' : 'negative'}>{account.kind === 'receber' ? '+' : '-'}{brl(account.amount)}</strong>
              <small>{account.category}</small>
            </div>
          </Link>)}
        </div>}

        <div className="calendar-agenda-footer">
          <div><span>Compromissos no mês</span><strong>{monthAccounts.length}</strong></div>
          <div><span>Concluídos</span><strong>{monthAccounts.filter(isSettled).length}</strong></div>
        </div>
      </aside>
    </section>
  </div>
}
