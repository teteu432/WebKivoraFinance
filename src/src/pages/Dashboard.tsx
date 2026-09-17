import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Landmark,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from '../components/EmptyState'
import FinancialCard from '../components/FinancialCard'
import { useFinance } from '../contexts/FinanceContext'
import {
  categoryExpenses,
  currentBalance,
  monthlySeries,
  pendingTransactionBalance,
  projectedBalance,
  totals,
} from '../utils/calculations'
import { brl, dueLabel, priorityClass, shortDate } from '../utils/format'

const chartColors = ['#3182f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b']

export default function Dashboard() {
  const { transactions, accounts, goals, preferences } = useFinance()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now)

  const monthTransactions = transactions.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const monthTotals = totals(monthTransactions)
  const balance = currentBalance(transactions)
  const projected = projectedBalance(transactions, accounts)
  const pendingTransactions = pendingTransactionBalance(transactions)

  const pendingBills = accounts
    .filter((item) => item.kind === 'pagar' && item.status !== 'pago')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const receivables = accounts
    .filter((item) => item.kind === 'receber' && item.status !== 'recebido')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const outgoing = pendingBills.reduce((sum, item) => sum + item.amount, 0)
  const incoming = receivables.reduce((sum, item) => sum + item.amount, 0)

  const upcoming = accounts
    .filter((item) => !(item.kind === 'pagar' && item.status === 'pago') && !(item.kind === 'receber' && item.status === 'recebido'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)

  const expenseData = categoryExpenses(monthTransactions)
  const series = monthlySeries(transactions)

  return (
    <div className="page-stack dashboard-page dashboard-hybrid">
      <div className="page-title dashboard-title-compact">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Olá, {preferences.displayName}</h1>
          <p>Acompanhe o que entrou, o que saiu e o que vem pela frente.</p>
        </div>
        <div className={`health-chip ${projected >= 0 ? 'good' : 'bad'}`}>
          {projected >= 0 ? 'Fluxo saudável' : 'Atenção ao fluxo'}
        </div>
      </div>

      <section className="metrics-grid dashboard-primary-metrics">
        <FinancialCard
          title="Saldo disponível"
          value={balance}
          icon={Wallet}
          hint="Somente movimentações confirmadas"
        />
        <FinancialCard
          title="Receitas do mês"
          value={monthTotals.receitas}
          icon={ArrowUpRight}
          hint={`Confirmadas em ${monthLabel}`}
          tone="green"
        />
        <FinancialCard
          title="Despesas do mês"
          value={monthTotals.despesas}
          icon={ArrowDownRight}
          hint={`Confirmadas em ${monthLabel}`}
          tone="red"
        />
        <FinancialCard
          title="Saldo previsto"
          value={projected}
          icon={Landmark}
          hint={`${brl(incoming)} a receber · ${brl(outgoing)} a pagar`}
          tone="purple"
        />
      </section>

      <section className="dashboard-overview-grid">
        <div className="panel dashboard-chart-panel">
          <div className="panel-head">
            <div>
              <h2>Receitas x despesas</h2>
              <p>Evolução dos últimos 6 meses</p>
            </div>
            <Link className="panel-link" to="/relatorios">
              Ver relatórios <ArrowRight size={14} />
            </Link>
          </div>
          <div className="chart-box dashboard-hybrid-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} barGap={7}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => brl(value)} contentStyle={{ background: '#0f1b2e', border: '1px solid #25324a', borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="receita" name="Receitas" fill="#3182f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" name="Despesas" fill="#64748b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel dashboard-category-panel">
          <div className="panel-head">
            <div>
              <h2>Despesas por categoria</h2>
              <p>{monthLabel} · somente confirmadas</p>
            </div>
          </div>
          {expenseData.length === 0 ? (
            <EmptyState text="Nenhuma despesa confirmada neste mês." />
          ) : (
            <div className="chart-box dashboard-hybrid-pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3}>
                    {expenseData.map((_, index) => (
                      <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => brl(value)} contentStyle={{ background: '#0f1b2e', border: '1px solid #25324a', borderRadius: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="two-columns compact-panels dashboard-bottom-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Próximos compromissos</h2>
              <p>Pagamentos e recebimentos por vencimento</p>
            </div>
            <Link className="panel-link" to="/contas">
              Ver contas <ArrowRight size={14} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState text="Nenhum compromisso pendente." />
          ) : (
            <div className="list">
              {upcoming.map((item) => (
                <div className="list-row" key={item.id}>
                  <div className={`dot ${priorityClass(item.dueDate)}`} />
                  <div className="grow">
                    <strong>{item.name}</strong>
                    <span>{shortDate(item.dueDate)} · {dueLabel(item.dueDate)}</span>
                  </div>
                  <strong className={item.kind === 'receber' ? 'positive' : ''}>
                    {item.kind === 'receber' ? '+' : ''}{brl(item.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel dashboard-goals-simple">
          <div className="panel-head">
            <div>
              <h2>Metas</h2>
              <p>Seu planejamento em andamento</p>
            </div>
            <CircleDollarSign size={20} />
          </div>
          {goals.length === 0 ? (
            <EmptyState text="Nenhuma meta em andamento." />
          ) : (
            <>
              <div className="list">
                {goals.slice(0, 4).map((goal) => {
                  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0
                  return (
                    <div className="goal-mini" key={goal.id}>
                      <div>
                        <strong>{goal.name}</strong>
                        <span>{brl(goal.savedAmount)} de {brl(goal.targetAmount)}</span>
                      </div>
                      <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                      <small>{progress.toFixed(0)}%</small>
                    </div>
                  )
                })}
              </div>
              <Link className="dashboard-goals-link" to="/planejamento">
                Abrir planejamento <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </section>

      {pendingTransactions !== 0 && (
        <div className="dashboard-pending-note">
          <span>Movimentações pendentes</span>
          <strong className={pendingTransactions >= 0 ? 'positive' : 'negative'}>{brl(pendingTransactions)}</strong>
          <small>Já consideradas no saldo previsto.</small>
        </div>
      )}
    </div>
  )
}
